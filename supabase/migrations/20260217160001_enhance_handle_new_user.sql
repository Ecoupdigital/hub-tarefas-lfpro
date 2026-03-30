-- =============================================================================
-- MIGRATION: Enhance handle_new_user trigger (CRITICAL-05)
-- Date: 2026-02-17
-- Description: Extend handle_new_user() to also create a default workspace
--              and add the user as an admin member, ensuring new users have
--              an immediate working environment.
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_workspace_id uuid;
BEGIN
  -- Create profile (existing behavior)
  INSERT INTO profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Create user role (existing behavior)
  INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'member');

  -- NEW: Create default workspace for the user
  INSERT INTO workspaces (name, icon, color, created_by)
  VALUES ('LFPro Workspace', '📋', '#C4A472', NEW.id)
  RETURNING id INTO new_workspace_id;

  -- NEW: Add user as admin member of their default workspace
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
