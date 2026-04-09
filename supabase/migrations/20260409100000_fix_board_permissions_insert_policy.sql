-- =============================================================================
-- MIGRATION: Fix board_permissions INSERT policy
-- Date: 2026-04-09
-- Description: The INSERT policy only allowed board_admins (via board_permissions
--              table) or workspace creators. But board_permissions was empty and
--              workspace MARKETING has no creator. Fix: also allow workspace admins
--              (workspace_members with role='admin') and global admins (user_roles).
-- =============================================================================

-- Update is_board_admin to also check workspace_members admin role and global admin
CREATE OR REPLACE FUNCTION public.is_board_admin(_user_id UUID, _board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    -- Board-level admin permission
    SELECT 1 FROM public.board_permissions bp
    WHERE bp.board_id = _board_id
      AND bp.user_id = _user_id
      AND bp.role = 'admin'
  )
  OR EXISTS (
    -- Workspace creator is always implicitly a board admin
    SELECT 1 FROM public.boards b
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE b.id = _board_id AND w.created_by = _user_id
  )
  OR EXISTS (
    -- Workspace admin (member with admin role) can manage boards
    SELECT 1 FROM public.boards b
    JOIN public.workspace_members wm ON wm.workspace_id = b.workspace_id
    WHERE b.id = _board_id AND wm.user_id = _user_id AND wm.role = 'admin'
  )
  OR EXISTS (
    -- Global admin (user_roles) can manage any board
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'admin'
  )
$$;

-- Also fix workspace MARKETING to have a creator
-- Temporarily disable rate limit trigger to avoid auth.uid() = NULL error
ALTER TABLE workspaces DISABLE TRIGGER rate_limit_workspaces_update;
UPDATE workspaces SET created_by = 'f38412d6-b9c0-4921-a1f1-4c764f7c6ef5'
WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001' AND created_by IS NULL;
ALTER TABLE workspaces ENABLE TRIGGER rate_limit_workspaces_update;
