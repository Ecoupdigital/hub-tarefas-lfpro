-- =============================================================================
-- MIGRATION: Add pages (Docs Mode) + page_versions + page_permissions
-- Date: 2026-05-22
-- Description: Notion-like pages alongside boards. Mirrors boards architecture
--              for permissions (workspace member SELECT, page admin manage).
--              Storage: BlockNote JSON in content jsonb.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Table: pages
-- ----------------------------------------------------------------------------
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.workspace_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Pagina sem titulo',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active','archived','deleted')),
  icon TEXT,
  cover_url TEXT,
  position FLOAT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pages_workspace_id ON public.pages(workspace_id);
CREATE INDEX idx_pages_folder_id ON public.pages(folder_id);
CREATE INDEX idx_pages_state ON public.pages(state);
CREATE INDEX idx_pages_position ON public.pages(workspace_id, position);

-- updated_at trigger reusing existing helper (public.update_updated_at)
CREATE TRIGGER pages_set_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Table: page_versions (snapshots para historico / restore)
-- ----------------------------------------------------------------------------
CREATE TABLE public.page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  title TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_versions_page_id ON public.page_versions(page_id, created_at DESC);

ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Table: page_permissions (espelha board_permissions)
-- ----------------------------------------------------------------------------
CREATE TABLE public.page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin','editor','member','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page_id, user_id)
);

CREATE INDEX idx_page_permissions_page_id ON public.page_permissions(page_id);
CREATE INDEX idx_page_permissions_user_id ON public.page_permissions(user_id);

ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RPC: can_access_page (espelha can_access_board)
-- Acesso = membro do workspace OU permissao explicita na page OU global admin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_page(_user_id UUID, _page_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pages p
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = _page_id AND wm.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.page_permissions pp
    WHERE pp.page_id = _page_id AND pp.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'admin'
  )
$$;

-- ----------------------------------------------------------------------------
-- RPC: is_page_admin (espelha is_board_admin v2)
-- Admin = role 'admin' na page OU workspace creator OU workspace admin OU global admin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_page_admin(_user_id UUID, _page_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.page_permissions pp
    WHERE pp.page_id = _page_id
      AND pp.user_id = _user_id
      AND pp.role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.pages p
    JOIN public.workspaces w ON w.id = p.workspace_id
    WHERE p.id = _page_id AND w.created_by = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.pages p
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = _page_id AND wm.user_id = _user_id AND wm.role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'admin'
  )
$$;

-- ----------------------------------------------------------------------------
-- RLS: pages (espelha boards)
-- ----------------------------------------------------------------------------
CREATE POLICY "Members can view pages" ON public.pages
  FOR SELECT TO authenticated
  USING (public.can_access_page(auth.uid(), id));

CREATE POLICY "Members can create pages" ON public.pages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update pages" ON public.pages
  FOR UPDATE TO authenticated
  USING (public.can_access_page(auth.uid(), id));

CREATE POLICY "Members can delete pages" ON public.pages
  FOR DELETE TO authenticated
  USING (public.is_page_admin(auth.uid(), id));

-- ----------------------------------------------------------------------------
-- RLS: page_versions
-- SELECT/INSERT permitido para quem pode acessar a page; sem UPDATE/DELETE (imutavel)
-- ----------------------------------------------------------------------------
CREATE POLICY "Members can view page_versions" ON public.page_versions
  FOR SELECT TO authenticated
  USING (public.can_access_page(auth.uid(), page_id));

CREATE POLICY "Members can insert page_versions" ON public.page_versions
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_page(auth.uid(), page_id));

-- ----------------------------------------------------------------------------
-- RLS: page_permissions (espelha board_permissions com is_page_admin)
-- ----------------------------------------------------------------------------
CREATE POLICY "Members can view page_permissions" ON public.page_permissions
  FOR SELECT TO authenticated
  USING (public.can_access_page(auth.uid(), page_id));

CREATE POLICY "Page admins can insert page_permissions" ON public.page_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_page_admin(auth.uid(), page_id));

CREATE POLICY "Page admins can update page_permissions" ON public.page_permissions
  FOR UPDATE TO authenticated
  USING (public.is_page_admin(auth.uid(), page_id));

CREATE POLICY "Page admins can delete page_permissions" ON public.page_permissions
  FOR DELETE TO authenticated
  USING (public.is_page_admin(auth.uid(), page_id));

-- ----------------------------------------------------------------------------
-- Realtime publication
-- ----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_versions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_permissions;
