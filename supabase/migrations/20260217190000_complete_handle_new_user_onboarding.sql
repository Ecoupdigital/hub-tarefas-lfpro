-- =============================================================================
-- MIGRATION: Complete handle_new_user onboarding (Story 1.1 - AC4/AC5 fix)
-- Date: 2026-02-17
-- Description: Extend handle_new_user() to also create a default board with
--              the standard columns (Status, Pessoa, Data) and a default group,
--              completing the full onboarding flow at the database level.
--              This is idempotent: it checks for existing workspace before
--              creating new resources.
--
-- Gap identified: Migration 20260217160001 created the workspace but did NOT
-- create the default board and columns. The frontend BoardContext.tsx has a
-- guard (dbWorkspaces.length > 0) that prevents the JS onboarding from running
-- when the DB trigger already created a workspace, leaving new users with a
-- workspace but no board or columns.
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_workspace_id uuid;
  new_board_id     uuid;
  new_group_id     uuid;
BEGIN
  -- Create profile (original behavior)
  INSERT INTO profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Create user role (original behavior)
  INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'member');

  -- Create default workspace for the user (idempotent: only if none exists)
  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE created_by = NEW.id) THEN
    INSERT INTO workspaces (name, icon, color, created_by)
    VALUES ('LFPro Workspace', '📋', '#C4A472', NEW.id)
    RETURNING id INTO new_workspace_id;

    -- Add user as admin member of their default workspace
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'admin');

    -- Create default board in the workspace
    INSERT INTO boards (workspace_id, name, description, created_by)
    VALUES (new_workspace_id, 'Tarefas', 'Seu primeiro board!', NEW.id)
    RETURNING id INTO new_board_id;

    -- Create default group in the board
    INSERT INTO groups (board_id, title, color, position)
    VALUES (new_board_id, 'Tarefas', '#579BFC', 1)
    RETURNING id INTO new_group_id;

    -- Create default columns: Status, Pessoa, Data
    INSERT INTO columns (board_id, title, column_type, position, settings)
    VALUES
      (new_board_id, 'Status', 'status', 1,
        '{"labels": {"1": {"name": "A Fazer", "color": "#579BFC"}, "2": {"name": "Trabalhando", "color": "#FDAB3D"}, "3": {"name": "Concluido", "color": "#00C875", "isDone": true}}}'::jsonb),
      (new_board_id, 'Pessoa', 'people', 2, '{}'::jsonb),
      (new_board_id, 'Data', 'date', 3, '{}'::jsonb);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
