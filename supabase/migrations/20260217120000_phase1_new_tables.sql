-- ============================================
-- LFPro Tasks - Phase 1-5 New Tables
-- ============================================

-- Board Views (saved views per board)
CREATE TABLE IF NOT EXISTS public.board_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  view_type TEXT NOT NULL CHECK (view_type IN ('table', 'kanban', 'calendar', 'timeline', 'dashboard')),
  config JSONB DEFAULT '{}',
  position INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.board_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can view board_views" ON public.board_views FOR SELECT TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can create board_views" ON public.board_views FOR INSERT TO authenticated WITH CHECK (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can update board_views" ON public.board_views FOR UPDATE TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can delete board_views" ON public.board_views FOR DELETE TO authenticated USING (public.can_access_board(auth.uid(), board_id));

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mention', 'assignment', 'status_change', 'comment', 'due_date', 'automation')),
  title TEXT NOT NULL,
  body TEXT,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authenticated can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Automations
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  condition_config JSONB DEFAULT '{}',
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0
);
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can view automations" ON public.automations FOR SELECT TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can create automations" ON public.automations FOR INSERT TO authenticated WITH CHECK (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can update automations" ON public.automations FOR UPDATE TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can delete automations" ON public.automations FOR DELETE TO authenticated USING (public.can_access_board(auth.uid(), board_id));

-- Automation Logs
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can view automation_logs" ON public.automation_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.automations a WHERE a.id = automation_id AND public.can_access_board(auth.uid(), a.board_id))
);

-- Board Templates
CREATE TABLE IF NOT EXISTS public.board_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.board_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view system templates" ON public.board_templates FOR SELECT TO authenticated USING (is_system = true OR created_by = auth.uid());
CREATE POLICY "Authenticated can create templates" ON public.board_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners can update templates" ON public.board_templates FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Owners can delete templates" ON public.board_templates FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Board Permissions (granular)
CREATE TABLE IF NOT EXISTS public.board_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'member', 'viewer')),
  UNIQUE(board_id, user_id)
);
ALTER TABLE public.board_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can view permissions" ON public.board_permissions FOR SELECT TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board admins can manage permissions" ON public.board_permissions FOR ALL TO authenticated USING (public.can_access_board(auth.uid(), board_id));

-- Activity Log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can view activity_log" ON public.activity_log FOR SELECT TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Authenticated can create activity_log" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (public.can_access_board(auth.uid(), board_id));

-- Item Dependencies
CREATE TABLE IF NOT EXISTS public.item_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  target_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('blocks', 'blocked_by', 'related')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_item_id, target_item_id)
);
ALTER TABLE public.item_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can view dependencies" ON public.item_dependencies FOR SELECT TO authenticated USING (public.can_access_item(auth.uid(), source_item_id));
CREATE POLICY "Board members can create dependencies" ON public.item_dependencies FOR INSERT TO authenticated WITH CHECK (public.can_access_item(auth.uid(), source_item_id));
CREATE POLICY "Board members can delete dependencies" ON public.item_dependencies FOR DELETE TO authenticated USING (public.can_access_item(auth.uid(), source_item_id));

-- Integrations
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view integrations" ON public.integrations FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can manage integrations" ON public.integrations FOR ALL TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Board Forms (public forms)
CREATE TABLE IF NOT EXISTS public.board_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  column_ids UUID[] NOT NULL DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  slug TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.board_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can manage forms" ON public.board_forms FOR ALL TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Public can view active forms" ON public.board_forms FOR SELECT TO anon USING (is_active = true);

-- Board Shares (public sharing links)
CREATE TABLE IF NOT EXISTS public.board_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'comment', 'edit')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.board_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can manage shares" ON public.board_shares FOR ALL TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Public can view shares by token" ON public.board_shares FOR SELECT TO anon USING (true);

-- Dashboard Widgets
CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "w": 4, "h": 3}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own widgets" ON public.dashboard_widgets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own widgets" ON public.dashboard_widgets FOR ALL TO authenticated USING (user_id = auth.uid());

-- Search function for global search (Command Palette)
CREATE OR REPLACE FUNCTION public.search_all(_query TEXT)
RETURNS TABLE (
  result_type TEXT,
  result_id UUID,
  result_name TEXT,
  result_board_id UUID,
  result_board_name TEXT,
  result_workspace_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  -- Search boards
  SELECT 'board'::TEXT, b.id, b.name, b.id, b.name, b.workspace_id
  FROM boards b
  JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = auth.uid()
  WHERE b.state = 'active' AND b.name ILIKE '%' || _query || '%'

  UNION ALL

  -- Search items
  SELECT 'item'::TEXT, i.id, i.name, i.board_id, b.name, b.workspace_id
  FROM items i
  JOIN boards b ON b.id = i.board_id
  JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = auth.uid()
  WHERE i.parent_item_id IS NULL AND i.name ILIKE '%' || _query || '%'

  UNION ALL

  -- Search workspaces
  SELECT 'workspace'::TEXT, w.id, w.name, NULL::UUID, NULL::TEXT, w.id
  FROM workspaces w
  JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = auth.uid()
  WHERE w.name ILIKE '%' || _query || '%'

  LIMIT 50;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_board_id ON public.activity_log(board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_item_id ON public.activity_log(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automations_board_id ON public.automations(board_id, is_active);
CREATE INDEX IF NOT EXISTS idx_item_dependencies_source ON public.item_dependencies(source_item_id);
CREATE INDEX IF NOT EXISTS idx_item_dependencies_target ON public.item_dependencies(target_item_id);
CREATE INDEX IF NOT EXISTS idx_board_views_board_id ON public.board_views(board_id, position);
CREATE INDEX IF NOT EXISTS idx_items_name_search ON public.items USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_boards_name_search ON public.boards USING gin(name gin_trgm_ops);

-- Add state column to items for soft delete (trash)
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'active' CHECK (state IN ('active', 'archived', 'deleted'));

-- Add onboarding_completed to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
