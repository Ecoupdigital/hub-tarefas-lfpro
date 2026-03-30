-- =============================================================================
-- MIGRATION: All Epics (E01-E10) - Monday.com Parity
-- Date: 2026-02-17
-- Description: New tables, columns, functions, storage for 10 epics
-- =============================================================================

-- ============ E01: PERMISSIONS ============

-- E01-S03: Board owner
ALTER TABLE boards ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- Set owner_id = created_by for existing boards
UPDATE boards SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;

-- E01-S04: Column permissions
ALTER TABLE columns ADD COLUMN IF NOT EXISTS edit_permission text DEFAULT 'everyone';
-- Values: 'everyone', 'owner_only', 'editors'

-- E01-S08: Custom roles
CREATE TABLE IF NOT EXISTS custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- ============ E02: VIEWS ============

-- E02-S03: Private views
ALTER TABLE board_views ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- ============ E03: FILES ============

-- Storage bucket (needs to be created via Supabase Dashboard or API)
-- We handle this via RPC or manual setup

-- File references table for items
CREATE TABLE IF NOT EXISTS item_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  column_id uuid REFERENCES columns(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_size bigint,
  file_type text,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_files_item_id ON item_files(item_id);

-- ============ E04: GLOBAL SEARCH ============

-- search_all function already exists in the DB - will enhance if needed

-- ============ E05: TEMPLATES ============

-- board_templates table already exists
-- Add workspace_id for shared templates
ALTER TABLE board_templates ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;

-- ============ E06: DASHBOARDS ============

-- dashboard_widgets table already exists
-- Add dashboard_id for cross-board dashboards
CREATE TABLE IF NOT EXISTS dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dashboard_widgets ADD COLUMN IF NOT EXISTS dashboard_id uuid REFERENCES dashboards(id) ON DELETE CASCADE;

-- ============ E07: AUTOMATIONS ============

-- automations already has action_config as JSONB - multi-action supported via array in JSONB
-- Add fields for recurring and conditions
ALTER TABLE automations ADD COLUMN IF NOT EXISTS conditions jsonb DEFAULT '[]';
ALTER TABLE automations ADD COLUMN IF NOT EXISTS actions jsonb DEFAULT '[]';
ALTER TABLE automations ADD COLUMN IF NOT EXISTS recurrence jsonb;
-- recurrence: { interval: 'daily'|'weekly'|'monthly', time: '09:00', timezone: 'America/Sao_Paulo' }

-- Automation recipes/templates
CREATE TABLE IF NOT EXISTS automation_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}',
  conditions jsonb DEFAULT '[]',
  actions jsonb NOT NULL DEFAULT '[]',
  icon text,
  is_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============ E08: COLLABORATION ============

-- updates.parent_update_id already exists (reply threads supported)

-- Emoji reactions
CREATE TABLE IF NOT EXISTS update_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(update_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_update_reactions_update_id ON update_reactions(update_id);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#579BFC',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  PRIMARY KEY (team_id, user_id)
);

-- ============ E09: COLUMNS ============

-- Item connections (Connect Boards)
CREATE TABLE IF NOT EXISTS item_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  connected_item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_id, connected_item_id, column_id)
);

CREATE INDEX IF NOT EXISTS idx_item_connections_item_id ON item_connections(item_id);
CREATE INDEX IF NOT EXISTS idx_item_connections_connected ON item_connections(connected_item_id);

-- ============ E10: ADMIN ============

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Workspace folders
CREATE TABLE IF NOT EXISTS workspace_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES workspace_folders(id) ON DELETE CASCADE,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE boards ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES workspace_folders(id) ON DELETE SET NULL;

-- ============ RLS POLICIES ============

-- Enable RLS on new tables
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_folders ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users (MVP - will tighten later)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'custom_roles', 'item_files', 'dashboards', 'automation_recipes',
    'update_reactions', 'teams', 'team_members', 'item_connections',
    'audit_log', 'workspace_folders'
  ]) LOOP
    EXECUTE format(
      'DO $p$ BEGIN CREATE POLICY "%s_auth_all" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $p$',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============ SEED: AUTOMATION RECIPES ============

INSERT INTO automation_recipes (name, description, category, trigger_type, trigger_config, conditions, actions, icon)
VALUES
  ('Notificar quando status muda', 'Envia notificacao quando o status de um item muda', 'notifications', 'status_change', '{"column_type": "status"}', '[]', '[{"type": "notify_assignee", "config": {"message": "Status alterado"}}]', '🔔'),
  ('Setar status ao criar item', 'Define status padrao quando um novo item e criado', 'status', 'item_created', '{}', '[]', '[{"type": "set_column_value", "config": {"column_type": "status", "value": "1"}}]', '✅'),
  ('Mover para Atrasados', 'Move item para grupo Atrasados quando data passa', 'dates', 'date_arrived', '{"column_type": "date"}', '[]', '[{"type": "move_to_group", "config": {"group_name": "Atrasados"}}]', '📅'),
  ('Notificar pessoa atribuida', 'Envia notificacao quando alguem e atribuido', 'people', 'column_change', '{"column_type": "people"}', '[]', '[{"type": "notify_assignee", "config": {"message": "Voce foi atribuido a um item"}}]', '👤'),
  ('Criar subitem automaticamente', 'Cria subitem padrao quando item e criado', 'subitems', 'item_created', '{}', '[]', '[{"type": "create_subitem", "config": {"name": "Checklist item"}}]', '📝'),
  ('Duplicar item em outro board', 'Cria copia do item em outro board quando status muda', 'cross_board', 'status_change', '{"column_type": "status"}', '[{"field": "status", "operator": "equals", "value": "3"}]', '[{"type": "create_item_in_board", "config": {}}]', '📋'),
  ('Marcar concluido quando subitems prontos', 'Muda status do item pai quando todos subitems estao prontos', 'subitems', 'subitem_status_change', '{}', '[{"field": "all_subitems_done", "operator": "equals", "value": true}]', '[{"type": "set_column_value", "config": {"column_type": "status", "value": "3"}}]', '🎯'),
  ('Notificacao semanal de pendencias', 'Envia resumo semanal de items pendentes', 'recurring', 'recurring', '{"interval": "weekly", "day": "monday", "time": "09:00"}', '[]', '[{"type": "notify_board_members", "config": {"message": "Resumo semanal de pendencias"}}]', '📊'),
  ('Arquivar items antigos', 'Move items concluidos ha mais de 30 dias para arquivo', 'cleanup', 'recurring', '{"interval": "daily", "time": "00:00"}', '[{"field": "days_since_done", "operator": "greater_than", "value": 30}]', '[{"type": "archive_item", "config": {}}]', '🗄️'),
  ('Definir data ao atribuir pessoa', 'Seta data de inicio quando alguem e atribuido', 'people', 'column_change', '{"column_type": "people"}', '[]', '[{"type": "set_column_value", "config": {"column_type": "date", "value": "today"}}]', '📅'),
  ('Notificar no prazo', 'Notifica 1 dia antes do prazo', 'dates', 'date_approaching', '{"column_type": "date", "days_before": 1}', '[]', '[{"type": "notify_assignee", "config": {"message": "Prazo amanha!"}}]', '⏰'),
  ('Enviar webhook quando concluido', 'Dispara webhook quando item e marcado como concluido', 'integrations', 'status_change', '{"column_type": "status"}', '[{"field": "status", "operator": "is_done", "value": true}]', '[{"type": "send_webhook", "config": {"url": ""}}]', '🔗'),
  ('Copiar item para grupo', 'Copia item para outro grupo quando checkbox marcado', 'organization', 'column_change', '{"column_type": "checkbox"}', '[{"field": "checkbox", "operator": "equals", "value": true}]', '[{"type": "duplicate_to_group", "config": {}}]', '📁'),
  ('Incrementar progresso', 'Incrementa progresso em 10% quando subitem concluido', 'progress', 'subitem_status_change', '{}', '[{"field": "subitem_status", "operator": "is_done", "value": true}]', '[{"type": "increment_column", "config": {"column_type": "progress", "amount": 10}}]', '📈'),
  ('Auto-assign criador', 'Atribui automaticamente o criador do item', 'people', 'item_created', '{}', '[]', '[{"type": "set_column_value", "config": {"column_type": "people", "value": "creator"}}]', '🙋')
ON CONFLICT DO NOTHING;

-- ============ STORAGE BUCKET ============
-- Note: Storage bucket needs to be created via Supabase API
-- This will be done via curl after migration
