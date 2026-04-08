-- =============================================================================
-- MIGRATION: Fix workspace SELECT policy for creators
-- Date: 2026-04-08
-- Description: The SELECT policy only allowed workspace_members to view workspaces.
--              When creating a new workspace, the INSERT succeeds but the
--              .select().single() fails because workspace_members hasn't been
--              inserted yet. Fix: allow created_by to also SELECT their workspaces.
-- =============================================================================

DROP POLICY IF EXISTS "Members can view workspaces" ON public.workspaces;

CREATE POLICY "Members and creators can view workspaces"
ON public.workspaces FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_workspace_member(auth.uid(), id)
);
