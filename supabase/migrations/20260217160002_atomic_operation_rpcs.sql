-- =============================================================================
-- MIGRATION: Atomic Operation RPCs (MEDIUM-04)
-- Date: 2026-02-17
-- Description: Server-side functions for multi-step operations that need
--              atomicity: cascade delete, full board duplication, full item
--              duplication. All run as SECURITY DEFINER within implicit
--              PL/pgSQL transactions.
-- =============================================================================


-- ============================================================================
-- 1. delete_workspace_cascade
--    Soft-deletes all boards (state='deleted') then deletes the workspace.
--    Returns true on success.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_workspace_cascade(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a member of the workspace
  IF NOT public.is_workspace_member(auth.uid(), p_workspace_id) THEN
    RAISE EXCEPTION 'Access denied: not a workspace member';
  END IF;

  -- Soft-delete all active boards in the workspace
  UPDATE boards
  SET state = 'deleted', updated_at = now()
  WHERE workspace_id = p_workspace_id
    AND state <> 'deleted';

  -- Delete the workspace (cascades to workspace_members, workspace_folders, etc.)
  DELETE FROM workspaces WHERE id = p_workspace_id;

  RETURN true;
END;
$$;


-- ============================================================================
-- 2. duplicate_board_full
--    Copies a board with all its columns and groups atomically.
--    Column values and items are NOT copied (groups are empty).
--    Returns the new board's UUID.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.duplicate_board_full(p_board_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_board boards%ROWTYPE;
  v_new_board_id uuid;
  v_col RECORD;
  v_grp RECORD;
BEGIN
  -- Fetch source board
  SELECT * INTO v_source_board FROM boards WHERE id = p_board_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Board not found: %', p_board_id;
  END IF;

  -- Verify caller can access the source board
  IF NOT public.can_access_board(auth.uid(), p_board_id) THEN
    RAISE EXCEPTION 'Access denied: cannot access board';
  END IF;

  -- Create new board (copy of source)
  INSERT INTO boards (name, description, workspace_id, created_by, owner_id, folder_id, state)
  VALUES (
    v_source_board.name || ' (copia)',
    v_source_board.description,
    v_source_board.workspace_id,
    auth.uid(),
    auth.uid(),
    v_source_board.folder_id,
    'active'
  )
  RETURNING id INTO v_new_board_id;

  -- Copy all columns
  FOR v_col IN
    SELECT * FROM columns WHERE board_id = p_board_id ORDER BY position
  LOOP
    INSERT INTO columns (board_id, title, column_type, position, settings, width, edit_permission)
    VALUES (
      v_new_board_id,
      v_col.title,
      v_col.column_type,
      v_col.position,
      v_col.settings,
      v_col.width,
      v_col.edit_permission
    );
  END LOOP;

  -- Copy all groups
  FOR v_grp IN
    SELECT * FROM groups WHERE board_id = p_board_id ORDER BY position
  LOOP
    INSERT INTO groups (board_id, title, color, position, is_collapsed)
    VALUES (
      v_new_board_id,
      v_grp.title,
      v_grp.color,
      v_grp.position,
      v_grp.is_collapsed
    );
  END LOOP;

  RETURN v_new_board_id;
END;
$$;


-- ============================================================================
-- 3. duplicate_item_full
--    Copies an item with all its column values atomically.
--    The new item is placed in the same group, at position + 1.
--    Returns the new item's UUID.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.duplicate_item_full(p_item_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_item items%ROWTYPE;
  v_new_item_id uuid;
  v_cv RECORD;
  v_max_position integer;
BEGIN
  -- Fetch source item
  SELECT * INTO v_source_item FROM items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found: %', p_item_id;
  END IF;

  -- Verify caller can access the source item
  IF NOT public.can_access_item(auth.uid(), p_item_id) THEN
    RAISE EXCEPTION 'Access denied: cannot access item';
  END IF;

  -- Find max position in the same group
  SELECT COALESCE(MAX(position), 0) INTO v_max_position
  FROM items
  WHERE group_id = v_source_item.group_id
    AND board_id = v_source_item.board_id
    AND parent_item_id IS NOT DISTINCT FROM v_source_item.parent_item_id;

  -- Create new item (copy of source)
  INSERT INTO items (name, board_id, group_id, parent_item_id, position, created_by, state)
  VALUES (
    v_source_item.name || ' (copia)',
    v_source_item.board_id,
    v_source_item.group_id,
    v_source_item.parent_item_id,
    v_max_position + 1,
    auth.uid(),
    'active'
  )
  RETURNING id INTO v_new_item_id;

  -- Copy all column values
  FOR v_cv IN
    SELECT * FROM column_values WHERE item_id = p_item_id
  LOOP
    INSERT INTO column_values (item_id, column_id, value, text_representation)
    VALUES (
      v_new_item_id,
      v_cv.column_id,
      v_cv.value,
      v_cv.text_representation
    );
  END LOOP;

  RETURN v_new_item_id;
END;
$$;
