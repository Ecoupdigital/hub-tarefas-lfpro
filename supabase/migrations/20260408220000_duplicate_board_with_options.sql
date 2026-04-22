-- Migration: duplicate_board_with_options RPC
-- Duplica um board com opções: structure, with_data, with_updates

CREATE OR REPLACE FUNCTION public.duplicate_board_with_options(
  p_board_id UUID,
  p_mode TEXT DEFAULT 'structure',
  p_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source RECORD;
  v_new_board_id UUID;
  v_max_position FLOAT;
  v_user_id UUID := auth.uid();
BEGIN
  -- Validar modo
  IF p_mode NOT IN ('structure', 'with_data', 'with_updates') THEN
    RAISE EXCEPTION 'Invalid mode: %. Use structure, with_data, or with_updates', p_mode;
  END IF;

  -- Verificar permissão
  IF NOT can_access_board(v_user_id, p_board_id) THEN
    RAISE EXCEPTION 'Access denied: user does not have access to this board';
  END IF;

  -- Buscar board original
  SELECT * INTO v_source FROM boards WHERE id = p_board_id AND state = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Board not found or not active';
  END IF;

  -- Calcular próxima posição
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_max_position
  FROM boards
  WHERE workspace_id = v_source.workspace_id;

  -- ============================================================
  -- FASE 1: Estrutura (sempre)
  -- ============================================================

  -- Copiar board
  INSERT INTO boards (workspace_id, name, description, state, position, icon, color, folder_id, created_by, owner_id, settings)
  VALUES (
    v_source.workspace_id,
    COALESCE(p_name, v_source.name || ' (cópia)'),
    v_source.description,
    'active',
    v_max_position,
    v_source.icon,
    v_source.color,
    v_source.folder_id,
    v_user_id,
    v_user_id,
    v_source.settings
  )
  RETURNING id INTO v_new_board_id;

  -- Temp table: mapeamento de columns
  CREATE TEMP TABLE _col_map (old_id UUID, new_id UUID) ON COMMIT DROP;

  INSERT INTO _col_map (old_id, new_id)
  SELECT c.id, gen_random_uuid()
  FROM columns c
  WHERE c.board_id = p_board_id;

  INSERT INTO columns (id, board_id, title, column_type, position, settings, width, edit_permission)
  SELECT
    cm.new_id,
    v_new_board_id,
    c.title,
    c.column_type,
    c.position,
    c.settings,
    c.width,
    c.edit_permission
  FROM columns c
  JOIN _col_map cm ON cm.old_id = c.id
  WHERE c.board_id = p_board_id;

  -- Temp table: mapeamento de groups
  CREATE TEMP TABLE _grp_map (old_id UUID, new_id UUID) ON COMMIT DROP;

  INSERT INTO _grp_map (old_id, new_id)
  SELECT g.id, gen_random_uuid()
  FROM groups g
  WHERE g.board_id = p_board_id;

  INSERT INTO groups (id, board_id, title, color, position, is_collapsed)
  SELECT
    gm.new_id,
    v_new_board_id,
    g.title,
    g.color,
    g.position,
    g.is_collapsed
  FROM groups g
  JOIN _grp_map gm ON gm.old_id = g.id
  WHERE g.board_id = p_board_id;

  -- ============================================================
  -- FASE 2: Dados (with_data, with_updates)
  -- ============================================================
  IF p_mode IN ('with_data', 'with_updates') THEN

    -- Temp table: mapeamento de items
    CREATE TEMP TABLE _item_map (old_id UUID, new_id UUID) ON COMMIT DROP;

    -- Primeiro: items raiz (sem parent_item_id)
    INSERT INTO _item_map (old_id, new_id)
    SELECT i.id, gen_random_uuid()
    FROM items i
    WHERE i.board_id = p_board_id AND i.parent_item_id IS NULL;

    INSERT INTO items (id, board_id, group_id, parent_item_id, name, position, created_by, state)
    SELECT
      im.new_id,
      v_new_board_id,
      gm.new_id,
      NULL,
      i.name,
      i.position,
      v_user_id,
      i.state
    FROM items i
    JOIN _item_map im ON im.old_id = i.id
    LEFT JOIN _grp_map gm ON gm.old_id = i.group_id
    WHERE i.board_id = p_board_id AND i.parent_item_id IS NULL;

    -- Segundo: subitems (parent_item_id IS NOT NULL)
    INSERT INTO _item_map (old_id, new_id)
    SELECT i.id, gen_random_uuid()
    FROM items i
    WHERE i.board_id = p_board_id AND i.parent_item_id IS NOT NULL;

    INSERT INTO items (id, board_id, group_id, parent_item_id, name, position, created_by, state)
    SELECT
      im.new_id,
      v_new_board_id,
      gm.new_id,
      parent_im.new_id,
      i.name,
      i.position,
      v_user_id,
      i.state
    FROM items i
    JOIN _item_map im ON im.old_id = i.id
    LEFT JOIN _grp_map gm ON gm.old_id = i.group_id
    LEFT JOIN _item_map parent_im ON parent_im.old_id = i.parent_item_id
    WHERE i.board_id = p_board_id AND i.parent_item_id IS NOT NULL;

    -- Copiar column_values
    INSERT INTO column_values (item_id, column_id, value, text_representation)
    SELECT
      im.new_id,
      cm.new_id,
      cv.value,
      cv.text_representation
    FROM column_values cv
    JOIN _item_map im ON im.old_id = cv.item_id
    JOIN _col_map cm ON cm.old_id = cv.column_id;

  END IF;

  -- ============================================================
  -- FASE 3: Updates (with_updates)
  -- ============================================================
  IF p_mode = 'with_updates' THEN

    -- Temp table: mapeamento de updates
    CREATE TEMP TABLE _update_map (old_id UUID, new_id UUID) ON COMMIT DROP;

    -- Updates raiz (sem parent_update_id)
    INSERT INTO _update_map (old_id, new_id)
    SELECT u.id, gen_random_uuid()
    FROM updates u
    JOIN _item_map im ON im.old_id = u.item_id
    WHERE u.parent_update_id IS NULL;

    INSERT INTO updates (id, item_id, author_id, body, parent_update_id, is_pinned)
    SELECT
      um.new_id,
      im.new_id,
      u.author_id,
      u.body,
      NULL,
      u.is_pinned
    FROM updates u
    JOIN _update_map um ON um.old_id = u.id
    JOIN _item_map im ON im.old_id = u.item_id
    WHERE u.parent_update_id IS NULL;

    -- Replies (com parent_update_id)
    INSERT INTO _update_map (old_id, new_id)
    SELECT u.id, gen_random_uuid()
    FROM updates u
    JOIN _item_map im ON im.old_id = u.item_id
    WHERE u.parent_update_id IS NOT NULL;

    INSERT INTO updates (id, item_id, author_id, body, parent_update_id, is_pinned)
    SELECT
      um.new_id,
      im.new_id,
      u.author_id,
      u.body,
      parent_um.new_id,
      u.is_pinned
    FROM updates u
    JOIN _update_map um ON um.old_id = u.id
    JOIN _item_map im ON im.old_id = u.item_id
    LEFT JOIN _update_map parent_um ON parent_um.old_id = u.parent_update_id
    WHERE u.parent_update_id IS NOT NULL;

    -- Copiar item_files
    INSERT INTO item_files (item_id, column_id, update_id, file_name, file_size, file_type, storage_path, uploaded_by)
    SELECT
      im.new_id,
      cm.new_id,
      um.new_id,
      f.file_name,
      f.file_size,
      f.file_type,
      f.storage_path,
      f.uploaded_by
    FROM item_files f
    JOIN _item_map im ON im.old_id = f.item_id
    LEFT JOIN _col_map cm ON cm.old_id = f.column_id
    LEFT JOIN _update_map um ON um.old_id = f.update_id;

  END IF;

  RETURN v_new_board_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.duplicate_board_with_options(UUID, TEXT, TEXT) TO authenticated;
