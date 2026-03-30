-- Fase 1: Otimização de performance — Meu Trabalho
-- Substitui 7-8 round-trips HTTP por 1 única chamada RPC

-- 1. Índice GIN em column_values.value para busca JSONB eficiente
--    Permite: value @> '["uuid"]' sem full table scan
CREATE INDEX IF NOT EXISTS idx_column_values_value_gin
  ON column_values USING gin(value jsonb_path_ops);

-- 2. Índice em columns(column_type) para filtrar people/status/date rapidamente
CREATE INDEX IF NOT EXISTS idx_columns_column_type
  ON columns(column_type);

-- 3. RPC: get_my_work_items
--    Retorna todos os itens onde o usuário está atribuído, já enriquecidos
--    com board, grupo, status, data e pessoas — em uma única query SQL.
CREATE OR REPLACE FUNCTION public.get_my_work_items(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_result jsonb;
BEGIN
  -- Segurança: apenas o próprio usuário ou admin pode consultar
  IF v_caller IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  IF v_caller != p_user_id THEN
    PERFORM 1 FROM user_roles WHERE user_id = v_caller AND role = 'admin';
    IF NOT FOUND THEN
      RETURN '[]'::jsonb;
    END IF;
  END IF;

  WITH people_cols AS (
    -- Colunas do tipo "people"
    SELECT id FROM columns WHERE column_type = 'people'
  ),
  assigned_item_ids AS (
    -- Itens onde o usuário aparece (trata ambos os formatos JSONB)
    --   Formato 1 (UI nativa):  ["uuid1", "uuid2"]
    --   Formato 2 (Monday.com): {"userIds": ["uuid1", "uuid2"]}
    SELECT DISTINCT cv.item_id
    FROM column_values cv
    JOIN people_cols pc ON pc.id = cv.column_id
    WHERE cv.value @> to_jsonb(ARRAY[p_user_id::text])
       OR cv.value @> jsonb_build_object('userIds', jsonb_build_array(p_user_id::text))
  ),
  active_items AS (
    -- Itens ativos (não deletados, não subitens) de boards ativos
    SELECT i.id, i.name, i.board_id, i.group_id, i.position,
           i.created_at, i.updated_at
    FROM items i
    JOIN assigned_item_ids ai ON ai.item_id = i.id
    JOIN boards b ON b.id = i.board_id AND b.state = 'active'
    WHERE i.parent_item_id IS NULL
      AND (i.state IS NULL OR i.state = 'active')
  ),
  item_status AS (
    -- Status de cada item (prefere coluna chamada exatamente "Status")
    SELECT DISTINCT ON (cv.item_id)
      cv.item_id,
      cv.value #>> '{}' AS status_key,
      (c.settings->'labels'->(cv.value #>> '{}'))->>'color' AS status_color,
      (c.settings->'labels'->(cv.value #>> '{}'))->>'name'  AS status_name
    FROM column_values cv
    JOIN columns c ON c.id = cv.column_id AND c.column_type = 'status'
    WHERE cv.item_id IN (SELECT id FROM active_items)
      AND cv.value IS NOT NULL
      AND cv.value::text <> 'null'
    ORDER BY cv.item_id,
             (LOWER(c.title) = 'status') DESC
  ),
  item_date AS (
    -- Primeira data de cada item (extrai YYYY-MM-DD de vários formatos)
    SELECT DISTINCT ON (cv.item_id)
      cv.item_id,
      CASE
        WHEN jsonb_typeof(cv.value) = 'string'
          THEN substring(cv.value #>> '{}' FROM '\d{4}-\d{2}-\d{2}')
        WHEN jsonb_typeof(cv.value) = 'object'
          THEN substring(cv.value->>'date'  FROM '\d{4}-\d{2}-\d{2}')
        ELSE
          substring(cv.text_representation   FROM '\d{4}-\d{2}-\d{2}')
      END AS date_str
    FROM column_values cv
    JOIN columns c ON c.id = cv.column_id AND c.column_type = 'date'
    WHERE cv.item_id IN (SELECT id FROM active_items)
      AND cv.value IS NOT NULL
      AND cv.value::text <> 'null'
    ORDER BY cv.item_id
  ),
  item_people AS (
    -- Todos os IDs de pessoas de cada item (agrupados)
    SELECT cv.item_id,
           array_agg(DISTINCT pid.person_id) AS person_ids
    FROM column_values cv
    JOIN columns c ON c.id = cv.column_id AND c.column_type = 'people'
    JOIN LATERAL (
      SELECT jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(cv.value) = 'array' THEN cv.value
          WHEN cv.value ? 'userIds'              THEN cv.value->'userIds'
          ELSE '[]'::jsonb
        END
      ) AS person_id
    ) pid ON true
    WHERE cv.item_id IN (SELECT id FROM active_items)
    GROUP BY cv.item_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',          ai.id,
        'name',        ai.name,
        'boardId',     ai.board_id,
        'boardName',   b.name,
        'groupId',     ai.group_id,
        'groupTitle',  COALESCE(g.title, ''),
        'groupColor',  COALESCE(g.color, '#C4C4C4'),
        'position',    ai.position,
        'createdAt',   ai.created_at,
        'updatedAt',   ai.updated_at,
        'statusValue', CASE
          WHEN ist.status_key IS NOT NULL THEN jsonb_build_object(
            'value', ist.status_key,
            'color', COALESCE(ist.status_color, '#C4C4C4'),
            'label', COALESCE(ist.status_name, ist.status_key)
          )
          ELSE NULL
        END,
        'dateValue',   id2.date_str,
        'people', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id',        p.id,
                'name',      COALESCE(p.name, 'Usuário'),
                'avatarUrl', p.avatar_url
              )
            )
            FROM profiles p
            WHERE ip.person_ids IS NOT NULL
              AND p.id::text = ANY(ip.person_ids)
          ),
          '[]'::jsonb
        )
      )
      ORDER BY ai.updated_at DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM active_items ai
  JOIN boards b ON b.id = ai.board_id
  LEFT JOIN groups g   ON g.id   = ai.group_id
  LEFT JOIN item_status ist ON ist.item_id = ai.id
  LEFT JOIN item_date   id2 ON id2.item_id = ai.id
  LEFT JOIN item_people ip  ON ip.item_id  = ai.id;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION public.get_my_work_items(uuid) TO authenticated;
