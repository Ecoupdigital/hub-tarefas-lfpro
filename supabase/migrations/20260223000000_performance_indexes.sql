-- Performance indexes — Fase 1
-- Aplicar índices para reduzir latência nas queries mais frequentes

-- 1. Índice composto para as queries mais frequentes de items
--    Cobre: .eq('board_id').is('parent_item_id', null).neq('state', 'deleted')
CREATE INDEX IF NOT EXISTS idx_items_board_parent_state
  ON items(board_id, parent_item_id, state);

-- 2. Índice UNIQUE nomeado para o upsert de column_values
--    Necessário para: onConflict: 'item_id,column_id'
CREATE UNIQUE INDEX IF NOT EXISTS idx_column_values_item_col
  ON column_values(item_id, column_id);

-- 3. Índice para queries de column_values por coluna
--    Cobre: useMyWorkItems Step 2 — .in('column_id', colIds)
CREATE INDEX IF NOT EXISTS idx_column_values_column_id
  ON column_values(column_id);

-- 4. Índices de FK para joins e filtros frequentes
CREATE INDEX IF NOT EXISTS idx_groups_board_id   ON groups(board_id);
CREATE INDEX IF NOT EXISTS idx_columns_board_id  ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_updates_item_id   ON updates(item_id);
