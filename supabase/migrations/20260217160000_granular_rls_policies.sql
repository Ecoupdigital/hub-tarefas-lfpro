-- =============================================================================
-- MIGRATION: Granular RLS Policies for 10 New Tables (CRITICAL-04)
-- Date: 2026-02-17
-- Description: Replace overly permissive USING(true) WITH CHECK(true) policies
--              with workspace-scoped policies for all 10 tables created in
--              20260217140000_epics_all_tables.sql
-- =============================================================================

-- ============================================================================
-- DROP existing permissive policies (created via DO block in epics migration)
-- ============================================================================

DROP POLICY IF EXISTS "custom_roles_auth_all" ON custom_roles;
DROP POLICY IF EXISTS "item_files_auth_all" ON item_files;
DROP POLICY IF EXISTS "dashboards_auth_all" ON dashboards;
DROP POLICY IF EXISTS "automation_recipes_auth_all" ON automation_recipes;
DROP POLICY IF EXISTS "update_reactions_auth_all" ON update_reactions;
DROP POLICY IF EXISTS "teams_auth_all" ON teams;
DROP POLICY IF EXISTS "team_members_auth_all" ON team_members;
DROP POLICY IF EXISTS "item_connections_auth_all" ON item_connections;
DROP POLICY IF EXISTS "audit_log_auth_all" ON audit_log;
DROP POLICY IF EXISTS "workspace_folders_auth_all" ON workspace_folders;


-- ============================================================================
-- 1. custom_roles — workspace_id directly available
-- ============================================================================

CREATE POLICY "custom_roles_select"
  ON custom_roles FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "custom_roles_insert"
  ON custom_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "custom_roles_update"
  ON custom_roles FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "custom_roles_delete"
  ON custom_roles FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));


-- ============================================================================
-- 2. item_files — reach workspace via item -> board -> workspace
-- ============================================================================

CREATE POLICY "item_files_select"
  ON item_files FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN boards b ON b.id = i.board_id
      WHERE i.id = item_files.item_id
        AND public.is_workspace_member(auth.uid(), b.workspace_id)
    )
  );

CREATE POLICY "item_files_insert"
  ON item_files FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items i
      JOIN boards b ON b.id = i.board_id
      WHERE i.id = item_files.item_id
        AND public.is_workspace_member(auth.uid(), b.workspace_id)
    )
  );

CREATE POLICY "item_files_update"
  ON item_files FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN boards b ON b.id = i.board_id
      WHERE i.id = item_files.item_id
        AND public.is_workspace_member(auth.uid(), b.workspace_id)
    )
  );

CREATE POLICY "item_files_delete"
  ON item_files FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM items i
      JOIN boards b ON b.id = i.board_id
      WHERE i.id = item_files.item_id
        AND public.is_workspace_member(auth.uid(), b.workspace_id)
    )
  );


-- ============================================================================
-- 3. dashboards — workspace_id directly available
-- ============================================================================

CREATE POLICY "dashboards_select"
  ON dashboards FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "dashboards_insert"
  ON dashboards FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "dashboards_update"
  ON dashboards FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "dashboards_delete"
  ON dashboards FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));


-- ============================================================================
-- 4. automation_recipes — system templates (read-only for non-system)
--    These are global templates, not board-specific. System recipes are
--    readable by all authenticated users. Only admins can manage them.
-- ============================================================================

CREATE POLICY "automation_recipes_select"
  ON automation_recipes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "automation_recipes_insert"
  ON automation_recipes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "automation_recipes_update"
  ON automation_recipes FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "automation_recipes_delete"
  ON automation_recipes FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );


-- ============================================================================
-- 5. update_reactions — reach workspace via update -> item -> board
-- ============================================================================

CREATE POLICY "update_reactions_select"
  ON update_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM updates u
      JOIN items i ON i.id = u.item_id
      JOIN boards b ON b.id = i.board_id
      WHERE u.id = update_reactions.update_id
        AND public.is_workspace_member(auth.uid(), b.workspace_id)
    )
  );

CREATE POLICY "update_reactions_insert"
  ON update_reactions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM updates u
      JOIN items i ON i.id = u.item_id
      JOIN boards b ON b.id = i.board_id
      WHERE u.id = update_reactions.update_id
        AND public.is_workspace_member(auth.uid(), b.workspace_id)
    )
  );

CREATE POLICY "update_reactions_delete"
  ON update_reactions FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
  );


-- ============================================================================
-- 6. teams — workspace_id directly available
-- ============================================================================

CREATE POLICY "teams_select"
  ON teams FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "teams_insert"
  ON teams FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "teams_update"
  ON teams FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "teams_delete"
  ON teams FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));


-- ============================================================================
-- 7. team_members — reach workspace via team -> workspace
-- ============================================================================

CREATE POLICY "team_members_select"
  ON team_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
        AND public.is_workspace_member(auth.uid(), t.workspace_id)
    )
  );

CREATE POLICY "team_members_insert"
  ON team_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
        AND public.is_workspace_member(auth.uid(), t.workspace_id)
    )
  );

CREATE POLICY "team_members_delete"
  ON team_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
        AND public.is_workspace_member(auth.uid(), t.workspace_id)
    )
  );


-- ============================================================================
-- 8. item_connections — reach workspace via item -> board -> workspace
-- ============================================================================

CREATE POLICY "item_connections_select"
  ON item_connections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN boards b ON b.id = i.board_id
      WHERE i.id = item_connections.item_id
        AND public.is_workspace_member(auth.uid(), b.workspace_id)
    )
  );

CREATE POLICY "item_connections_insert"
  ON item_connections FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items i
      JOIN boards b ON b.id = i.board_id
      WHERE i.id = item_connections.item_id
        AND public.is_workspace_member(auth.uid(), b.workspace_id)
    )
  );

CREATE POLICY "item_connections_delete"
  ON item_connections FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN boards b ON b.id = i.board_id
      WHERE i.id = item_connections.item_id
        AND public.is_workspace_member(auth.uid(), b.workspace_id)
    )
  );


-- ============================================================================
-- 9. audit_log — user-scoped (users see own audit entries)
--    Note: audit_log has no workspace_id column; scoped by user_id instead.
--    INSERT is allowed for the system/own user. SELECT is own entries only.
-- ============================================================================

CREATE POLICY "audit_log_select"
  ON audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "audit_log_insert"
  ON audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ============================================================================
-- 10. workspace_folders — workspace_id directly available
-- ============================================================================

CREATE POLICY "workspace_folders_select"
  ON workspace_folders FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace_folders_insert"
  ON workspace_folders FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace_folders_update"
  ON workspace_folders FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace_folders_delete"
  ON workspace_folders FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
