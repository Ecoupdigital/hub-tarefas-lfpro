-- =============================================================================
-- MIGRATION: Phase 02 - Database inline + Hierarchy + Synced blocks + list_detailed
-- Date: 2026-05-23
-- Description:
--   1. boards.page_id (FK pages, nullable) - boards com page_id sao databases inline
--   2. pages.parent_id (FK pages, nullable) - subpaginas
--   3. pages.sort_order TEXT (lexorank, base-62 chars) - ordenacao manual em arvore
--   4. synced_blocks table (workspace-scoped) + RLS + RPC + realtime
--   5. board_views.view_type aceita 'list_detailed'
-- Retrocompat:
--   - Boards existentes: page_id permanece NULL, queries atuais nao mudam
--   - Pages existentes: parent_id NULL = root no workspace (comportamento atual)
--   - Pages existentes: sort_order default 'a0' pra todas as linhas; campo position
--     continua existindo (nao removido) ate Plano 02-03 migrar UI pra usar sort_order
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. boards.page_id (database inline)
-- ----------------------------------------------------------------------------
ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE;

-- Index parcial: queries normais de board listam page_id IS NULL
CREATE INDEX IF NOT EXISTS idx_boards_page_id
  ON public.boards(page_id)
  WHERE page_id IS NOT NULL;

COMMENT ON COLUMN public.boards.page_id IS
  'Quando NOT NULL, este board e uma database inline ancorada na page. Quando NULL, e board tradicional.';

-- ----------------------------------------------------------------------------
-- 2. pages.parent_id (subpaginas)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.pages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pages_parent_id
  ON public.pages(parent_id);

COMMENT ON COLUMN public.pages.parent_id IS
  'NULL = page root no workspace. NOT NULL = subpagina.';

-- ----------------------------------------------------------------------------
-- 3. pages.sort_order (lexorank base-62, comparavel via string)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS sort_order TEXT NOT NULL DEFAULT 'a0';

CREATE INDEX IF NOT EXISTS idx_pages_sort_order
  ON public.pages(workspace_id, parent_id, sort_order);

COMMENT ON COLUMN public.pages.sort_order IS
  'Lexorank base-62 (fractional-indexing). Usado pra ordenacao manual via drag/drop. Campo position permanece pra retrocompat ate migracao completa em 02-03.';

-- Backfill: gerar sort_order distintos pra pages existentes baseado em position+created_at
-- Estrategia: ordenar por (workspace_id, parent_id, position, created_at) e atribuir
-- chaves crescentes 'a000000','a000001','a000002'... (suficiente pra backfill; novos
-- inserts usam lexorank real via fractional-indexing no client). Evita NULLs e mantem
-- ordem visual.
WITH ordered AS (
  SELECT
    id,
    'a' || lpad(
      (row_number() OVER (PARTITION BY workspace_id, parent_id ORDER BY position, created_at) - 1)::text,
      6, '0'
    ) AS new_sort_order
  FROM public.pages
)
UPDATE public.pages p
SET sort_order = o.new_sort_order
FROM ordered o
WHERE p.id = o.id;

-- ----------------------------------------------------------------------------
-- 4. board_views.view_type aceita 'list_detailed'
-- ----------------------------------------------------------------------------
ALTER TABLE public.board_views DROP CONSTRAINT IF EXISTS board_views_view_type_check;
ALTER TABLE public.board_views
  ADD CONSTRAINT board_views_view_type_check
  CHECK (view_type IN ('table', 'kanban', 'calendar', 'timeline', 'dashboard', 'list_detailed'));

COMMENT ON CONSTRAINT board_views_view_type_check ON public.board_views IS
  'list_detailed = view exclusiva de database inline (Notion list view com props empilhadas).';

-- ----------------------------------------------------------------------------
-- 5. synced_blocks (workspace-scoped, content compartilhado entre pages)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.synced_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_synced_blocks_workspace_id
  ON public.synced_blocks(workspace_id);

CREATE TRIGGER synced_blocks_set_updated_at
  BEFORE UPDATE ON public.synced_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.synced_blocks ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RPC can_access_synced_block (espelha can_access_board)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_synced_block(_user_id UUID, _synced_block_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.synced_blocks sb
    JOIN public.workspace_members wm ON wm.workspace_id = sb.workspace_id
    WHERE sb.id = _synced_block_id AND wm.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'admin'
  )
$$;

-- ----------------------------------------------------------------------------
-- RLS synced_blocks
-- ----------------------------------------------------------------------------
CREATE POLICY "Workspace members can view synced_blocks" ON public.synced_blocks
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can create synced_blocks" ON public.synced_blocks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can update synced_blocks" ON public.synced_blocks
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete synced_blocks" ON public.synced_blocks
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ----------------------------------------------------------------------------
-- Realtime publication: synced_blocks (pages/page_versions/page_permissions ja em Fase 01)
-- ----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.synced_blocks;
