-- =============================================================================
-- MIGRATION: Fix Missing RLS Policies
-- Date: 2026-02-17
-- Description: Add missing INSERT/UPDATE policies identified in error analysis
-- Issues: CRITICAL-01, CRITICAL-02, CRITICAL-03
-- =============================================================================

-- CRITICAL-01: automation_logs missing INSERT policy
CREATE POLICY "Authenticated users can insert automation_logs"
ON automation_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- CRITICAL-01: automation_logs missing UPDATE/DELETE policies
CREATE POLICY "Authenticated users can update automation_logs"
ON automation_logs FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete automation_logs"
ON automation_logs FOR DELETE TO authenticated
USING (true);

-- CRITICAL-02: workspace_members missing UPDATE policy
CREATE POLICY "Workspace creators can update members"
ON workspace_members FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND created_by = auth.uid())
  OR user_id = auth.uid()
);

-- CRITICAL-03: item_dependencies missing UPDATE policy
CREATE POLICY "Board members can update dependencies"
ON item_dependencies FOR UPDATE TO authenticated
USING (
  can_access_item(auth.uid(), source_item_id)
);
