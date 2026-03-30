-- =============================================================================
-- MIGRATION: Fix Security RLS Policy Vulnerabilities
-- Date: 2026-02-19
-- Description: Fixes privilege escalation, overly permissive policies, and
--              information disclosure vulnerabilities found in security audit.
-- Issues: board_permissions, workspace_members, automation_logs, board_shares
-- =============================================================================

-- ============================================================================
-- HELPER FUNCTION: Check if user is board admin via board_permissions table
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_board_admin(_user_id UUID, _board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
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
$$;

-- ============================================================================
-- FIX 1: board_permissions — prevent non-admins from modifying permissions
-- The old policy used can_access_board which only checks workspace membership,
-- allowing any member to grant themselves admin access.
-- ============================================================================
DROP POLICY IF EXISTS "Board admins can manage permissions" ON public.board_permissions;

-- SELECT: any workspace member can view permissions
-- (keep existing policy, it's fine for read)

-- INSERT: only board admins or workspace creators can add permissions
CREATE POLICY "Board admins can insert permissions"
ON public.board_permissions FOR INSERT TO authenticated
WITH CHECK (
  public.is_board_admin(auth.uid(), board_id)
);

-- UPDATE: only board admins can modify roles
CREATE POLICY "Board admins can update permissions"
ON public.board_permissions FOR UPDATE TO authenticated
USING (
  public.is_board_admin(auth.uid(), board_id)
);

-- DELETE: only board admins can remove permissions
CREATE POLICY "Board admins can delete permissions"
ON public.board_permissions FOR DELETE TO authenticated
USING (
  public.is_board_admin(auth.uid(), board_id)
);

-- ============================================================================
-- FIX 2: workspace_members — remove self-update vulnerability
-- The old policy had `OR user_id = auth.uid()` which allowed members to
-- change their own role to 'admin'.
-- ============================================================================
DROP POLICY IF EXISTS "Workspace creators can update members" ON public.workspace_members;

-- Only workspace creators can update member records (role changes, etc.)
CREATE POLICY "Workspace creators can update members"
ON public.workspace_members FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = workspace_id AND created_by = auth.uid()
  )
);

-- ============================================================================
-- FIX 3: automation_logs — restrict from USING(true) to workspace-scoped
-- The old policies allowed any authenticated user to INSERT/UPDATE/DELETE
-- automation logs from any workspace.
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can insert automation_logs" ON public.automation_logs;
DROP POLICY IF EXISTS "Authenticated users can update automation_logs" ON public.automation_logs;
DROP POLICY IF EXISTS "Authenticated users can delete automation_logs" ON public.automation_logs;

-- INSERT: only members of the board's workspace can insert logs
CREATE POLICY "Board members can insert automation_logs"
ON public.automation_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.automations a
    JOIN public.boards b ON b.id = a.board_id
    WHERE a.id = automation_id
    AND public.is_workspace_member(auth.uid(), b.workspace_id)
  )
);

-- UPDATE: restrict to workspace members (rare, mostly for status corrections)
CREATE POLICY "Board members can update automation_logs"
ON public.automation_logs FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.automations a
    JOIN public.boards b ON b.id = a.board_id
    WHERE a.id = automation_id
    AND public.is_workspace_member(auth.uid(), b.workspace_id)
  )
);

-- DELETE: restrict to workspace members
CREATE POLICY "Board members can delete automation_logs"
ON public.automation_logs FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.automations a
    JOIN public.boards b ON b.id = a.board_id
    WHERE a.id = automation_id
    AND public.is_workspace_member(auth.uid(), b.workspace_id)
  )
);

-- ============================================================================
-- FIX 4: board_shares — restrict anon SELECT from USING(true)
-- The old policy allowed anonymous users to enumerate all share records.
-- New policy: anon can only SELECT non-expired shares (still needs token filter
-- at application level, but reduces surface area).
-- Also excludes password_hash from being queryable (can't enforce column-level
-- via RLS, but the application layer now strips it).
-- ============================================================================
DROP POLICY IF EXISTS "Public can view shares by token" ON public.board_shares;

-- Anon can view shares, but only active (non-expired) ones
-- Note: token filtering must still be enforced at application level
CREATE POLICY "Public can view active shares by token"
ON public.board_shares FOR SELECT TO anon
USING (
  expires_at IS NULL OR expires_at > now()
);
