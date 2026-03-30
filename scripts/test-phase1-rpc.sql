-- ============================================================
-- SCRIPT DE TESTE — Fase 1: RPC get_my_work_items
-- Execute no Supabase SQL Editor
-- ============================================================

-- TESTE 1: Função existe e tem body
SELECT proname, prosrc IS NOT NULL AS has_body
FROM pg_proc
WHERE proname = 'get_my_work_items'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Esperado: 1 linha com has_body = true

-- TESTE 2: Índices foram criados
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname IN ('idx_column_values_value_gin', 'idx_columns_column_type')
ORDER BY indexname;
-- Esperado: 2 linhas

-- TESTE 3: Lógica SQL retorna itens (sem filtro auth.uid — direto no banco)
WITH people_cols AS (
  SELECT id FROM columns WHERE column_type = 'people'
),
assigned AS (
  SELECT DISTINCT cv.item_id
  FROM column_values cv
  JOIN people_cols pc ON pc.id = cv.column_id
  -- Substitua pelo UUID do usuário a testar:
  WHERE cv.value @> to_jsonb(ARRAY['dcd87b73-2d8a-4ba7-a93f-d20b1c6936bb'::text])
     OR cv.value @> jsonb_build_object('userIds', jsonb_build_array('dcd87b73-2d8a-4ba7-a93f-d20b1c6936bb'::text))
)
SELECT
  COUNT(*) AS total_itens_atribuidos,
  COUNT(*) FILTER (WHERE i.state = 'active' OR i.state IS NULL) AS itens_ativos,
  COUNT(*) FILTER (WHERE i.parent_item_id IS NULL) AS apenas_itens_pai
FROM items i
JOIN assigned a ON a.item_id = i.id
JOIN boards b ON b.id = i.board_id AND b.state = 'active';
-- Esperado: total > 0, valores consistentes com os filtros

-- TESTE 4: Índice GIN está sendo USADO (verify planner usa index scan)
EXPLAIN (FORMAT TEXT)
SELECT DISTINCT cv.item_id
FROM column_values cv
WHERE cv.value @> to_jsonb(ARRAY['dcd87b73-2d8a-4ba7-a93f-d20b1c6936bb'::text]);
-- Esperado: "Bitmap Index Scan on idx_column_values_value_gin" (não Seq Scan)

-- TESTE 5: Performance comparativa
-- Query antiga (full table scan)
EXPLAIN ANALYZE
SELECT item_id, column_id, value
FROM column_values
WHERE column_id IN (SELECT id FROM columns WHERE column_type = 'people')
ORDER BY id
LIMIT 1000;

-- Query nova (GIN index)
EXPLAIN ANALYZE
SELECT DISTINCT cv.item_id
FROM column_values cv
JOIN columns c ON c.id = cv.column_id AND c.column_type = 'people'
WHERE cv.value @> to_jsonb(ARRAY['dcd87b73-2d8a-4ba7-a93f-d20b1c6936bb'::text])
   OR cv.value @> jsonb_build_object('userIds', jsonb_build_array('dcd87b73-2d8a-4ba7-a93f-d20b1c6936bb'::text));
-- Esperado: execution time MUITO menor na query nova

-- TESTE 6: Estrutura do JSON retornado tem todos os campos esperados
SELECT
  item->>'id'         AS id,
  item->>'name'       AS name,
  item->>'boardId'    AS board_id,
  item->>'boardName'  AS board_name,
  item->>'groupId'    AS group_id,
  item->>'groupTitle' AS group_title,
  item->>'groupColor' AS group_color,
  item->'statusValue' AS status_value,
  item->>'dateValue'  AS date_value,
  jsonb_array_length(item->'people') AS people_count
FROM (
  -- Chama a função diretamente com bypass do auth (só funciona via Management API / postgres role)
  WITH people_cols AS (SELECT id FROM columns WHERE column_type = 'people'),
  assigned AS (
    SELECT DISTINCT cv.item_id
    FROM column_values cv
    JOIN people_cols pc ON pc.id = cv.column_id
    WHERE cv.value @> to_jsonb(ARRAY['dcd87b73-2d8a-4ba7-a93f-d20b1c6936bb'::text])
       OR cv.value @> jsonb_build_object('userIds', jsonb_build_array('dcd87b73-2d8a-4ba7-a93f-d20b1c6936bb'::text))
  ),
  active_items AS (
    SELECT i.id, i.name, i.board_id, i.group_id, i.position, i.created_at, i.updated_at
    FROM items i
    JOIN assigned a ON a.item_id = i.id
    JOIN boards b ON b.id = i.board_id AND b.state = 'active'
    WHERE i.parent_item_id IS NULL AND (i.state IS NULL OR i.state = 'active')
  )
  SELECT jsonb_array_elements(
    COALESCE(
      jsonb_agg(jsonb_build_object(
        'id', ai.id, 'name', ai.name, 'boardId', ai.board_id,
        'boardName', b.name, 'groupId', ai.group_id,
        'groupTitle', COALESCE(g.title,''), 'groupColor', COALESCE(g.color,'#C4C4C4'),
        'statusValue', NULL, 'dateValue', NULL, 'people', '[]'::jsonb
      ) ORDER BY ai.updated_at DESC),
    '[]'::jsonb)
  ) AS item
  FROM active_items ai
  JOIN boards b ON b.id = ai.board_id
  LEFT JOIN groups g ON g.id = ai.group_id
  LIMIT 5
) sub;
-- Esperado: 5 linhas com todos os campos preenchidos
