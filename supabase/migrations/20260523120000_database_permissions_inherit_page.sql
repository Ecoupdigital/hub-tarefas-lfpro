-- =============================================================================
-- MIGRATION: Database permissoes herdam page pai (cascading via RPC)
-- Date: 2026-05-23
-- Phase: 02-11 (fechamento)
--
-- Description:
--   Atualiza RPC public.can_access_board para que quando boards.page_id IS NOT NULL
--   (database inline criada dentro de uma page), a checagem delegue para
--   public.can_access_page sobre a page pai. Isso implementa heranca de permissoes
--   de page -> database inline sem mexer em nenhuma policy: todas as RLS de items,
--   columns, groups, board_views e column_values ja chamam can_access_board, entao
--   a heranca propaga automaticamente.
--
-- Compatibilidade:
--   - Boards tradicionais (page_id IS NULL) mantem comportamento original:
--     workspace member OU permissao explicita em board_permissions OU admin global.
--   - Databases inline (page_id IS NOT NULL) passam a respeitar exclusivamente
--     can_access_page (que ja contempla workspace_members + page_permissions +
--     admin global), conforme combinado em 02-CONTEXT.md.
--
-- Dependencias:
--   - 20260216230617_*.sql: definicao original de can_access_board.
--   - 20260522110000_pages_schema.sql: define public.can_access_page.
--   - 20260523100000_phase02_database_hierarchy_synced.sql: adiciona boards.page_id.
--
-- NAO aplicar em remoto via este push (brownfield). Dono aplica via Supabase CLI.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_access_board(_user_id UUID, _board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH target AS (
    SELECT b.page_id, b.workspace_id
    FROM public.boards b
    WHERE b.id = _board_id
  )
  SELECT
    CASE
      -- Branch 1: database inline -> delega heranca pra can_access_page
      WHEN (SELECT page_id FROM target) IS NOT NULL THEN
        public.can_access_page(_user_id, (SELECT page_id FROM target))
      -- Branch 2: board tradicional -> logica original (workspace member, board_permissions, admin global)
      ELSE
        EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = (SELECT workspace_id FROM target)
            AND wm.user_id = _user_id
        )
        OR EXISTS (
          SELECT 1 FROM public.board_permissions bp
          WHERE bp.board_id = _board_id
            AND bp.user_id = _user_id
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role = 'admin'
        )
    END
$$;

COMMENT ON FUNCTION public.can_access_board(UUID, UUID) IS
  'Checa acesso a board. Quando boards.page_id IS NOT NULL (database inline), delega para can_access_page (heranca de permissoes da page pai). Caso contrario, usa logica original: workspace member OU board_permissions OU admin global.';
