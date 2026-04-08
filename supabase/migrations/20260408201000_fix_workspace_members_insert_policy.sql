-- =============================================================================
-- MIGRATION: Fix workspace_members INSERT policy for workspace creators
-- Date: 2026-04-08
-- Description: The INSERT policy required is_workspace_member() which fails
--              when the creator tries to add themselves as the first member.
--              Fix: also allow workspace creators to insert members.
-- =============================================================================

DROP POLICY IF EXISTS "Workspace creators can add members" ON public.workspace_members;

CREATE POLICY "Workspace creators and members can add members"
ON public.workspace_members FOR INSERT TO authenticated
WITH CHECK (
  -- Existing members can add new members
  public.is_workspace_member(auth.uid(), workspace_id)
  -- OR the workspace creator can add members (needed for first member)
  OR EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = workspace_id AND created_by = auth.uid()
  )
);
