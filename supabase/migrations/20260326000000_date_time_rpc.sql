-- Fase 1 Plano 1: Atualizar RPC para suportar datetime completo e ordenacao por data
-- Idempotente: CREATE OR REPLACE

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
  -- Seguranca: apenas o proprio usuario ou admin pode consultar
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
    SELECT id FROM columns WHERE column_type = 'people'
  ),
  assigned_item_ids AS (
    SELECT DISTINCT cv.item_id
    FROM column_values cv
    JOIN people_cols pc ON pc.id = cv.column_id
    WHERE cv.value @> to_jsonb(ARRAY[p_user_id::text])
       OR cv.value @> jsonb_build_object('userIds', jsonb_build_array(p_user_id::text))
  ),
  active_items AS (
    SELECT i.id, i.name, i.board_id, i.group_id, i.position,
           i.created_at, i.updated_at
    FROM items i
    JOIN assigned_item_ids ai ON ai.item_id = i.id
    JOIN boards b ON b.id = i.board_id AND b.state = 'active'
    WHERE i.parent_item_id IS NULL
      AND (i.state IS NULL OR i.state = 'active')
  ),
  item_status AS (
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
    -- Extrai data, startTime, endTime e gera chave de ordenacao (date + time)
    -- Handles 3 formats:
    --   1. JSONB object: {"date":"2026-03-29","startTime":"14:00","endTime":"15:00"}
    --   2. JSONB string containing JSON: "{\"date\":\"2026-03-29\",\"startTime\":\"14:00\"}"
    --   3. Simple JSONB string: "2026-03-29" or "2026-03-29T14:00"
    SELECT DISTINCT ON (cv.item_id)
      cv.item_id,
      CASE
        WHEN jsonb_typeof(cv.value) = 'object' AND cv.value ? 'date'
          THEN substring(cv.value->>'date' FROM '\d{4}-\d{2}-\d{2}')
        WHEN jsonb_typeof(cv.value) = 'string' AND (cv.value #>> '{}') LIKE '{%'
          THEN substring((cv.value #>> '{}')::jsonb->>'date' FROM '\d{4}-\d{2}-\d{2}')
        WHEN jsonb_typeof(cv.value) = 'string'
          THEN substring(cv.value #>> '{}' FROM '\d{4}-\d{2}-\d{2}')
        ELSE
          substring(cv.text_representation FROM '\d{4}-\d{2}-\d{2}')
      END AS date_str,
      CASE
        WHEN jsonb_typeof(cv.value) = 'object' AND cv.value ? 'startTime'
          THEN cv.value->>'startTime'
        WHEN jsonb_typeof(cv.value) = 'string' AND (cv.value #>> '{}') LIKE '{%'
          THEN (cv.value #>> '{}')::jsonb->>'startTime'
        ELSE NULL
      END AS start_time,
      CASE
        WHEN jsonb_typeof(cv.value) = 'object' AND cv.value ? 'endTime'
          THEN cv.value->>'endTime'
        WHEN jsonb_typeof(cv.value) = 'string' AND (cv.value #>> '{}') LIKE '{%'
          THEN (cv.value #>> '{}')::jsonb->>'endTime'
        ELSE NULL
      END AS end_time,
      CASE
        WHEN jsonb_typeof(cv.value) = 'object' AND cv.value ? 'date' AND cv.value ? 'startTime'
          THEN (cv.value->>'date') || 'T' || (cv.value->>'startTime')
        WHEN jsonb_typeof(cv.value) = 'object' AND cv.value ? 'date'
          THEN cv.value->>'date'
        WHEN jsonb_typeof(cv.value) = 'string' AND (cv.value #>> '{}') LIKE '{%'
          THEN COALESCE(
            (cv.value #>> '{}')::jsonb->>'date' || COALESCE('T' || ((cv.value #>> '{}')::jsonb->>'startTime'), ''),
            (cv.value #>> '{}')::jsonb->>'date'
          )
        WHEN jsonb_typeof(cv.value) = 'string'
          THEN substring(cv.value #>> '{}' FROM '\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?')
        ELSE
          substring(cv.text_representation FROM '\d{4}-\d{2}-\d{2}')
      END AS date_sort_key
    FROM column_values cv
    JOIN columns c ON c.id = cv.column_id AND c.column_type = 'date'
    WHERE cv.item_id IN (SELECT id FROM active_items)
      AND cv.value IS NOT NULL
      AND cv.value::text <> 'null'
    ORDER BY cv.item_id
  ),
  item_people AS (
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
        'startTime',   id2.start_time,
        'endTime',     id2.end_time,
        'people', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id',        p.id,
                'name',      COALESCE(p.name, 'Usuario'),
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
      ORDER BY id2.date_sort_key ASC NULLS LAST, ai.updated_at DESC
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

GRANT EXECUTE ON FUNCTION public.get_my_work_items(uuid) TO authenticated;
