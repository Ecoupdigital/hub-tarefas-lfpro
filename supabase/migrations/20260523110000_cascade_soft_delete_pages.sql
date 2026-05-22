-- =============================================================================
-- MIGRATION: RPC soft_delete_page_cascade
-- Date: 2026-05-23
-- Description:
--   Marca uma page + todos os descendentes (subpages recursivamente) + databases
--   ancorados (boards.page_id IN descendants) como state='deleted'.
--   Defesa em profundidade: caller precisa ser is_page_admin da page raiz.
--   Retorna a quantidade de pages afetadas (inclui a raiz).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_page_cascade(_page_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  affected_count INTEGER := 0;
  caller_id UUID := auth.uid();
BEGIN
  -- Checagem de permissao na page raiz (espelha policy DELETE de pages)
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_page_admin(caller_id, _page_id) THEN
    RAISE EXCEPTION 'Permission denied: requires page admin';
  END IF;

  -- 1. Soft delete em pages (raiz + descendentes ativos)
  WITH RECURSIVE page_tree AS (
    SELECT id FROM public.pages WHERE id = _page_id
    UNION ALL
    SELECT p.id FROM public.pages p
    INNER JOIN page_tree pt ON p.parent_id = pt.id
    WHERE p.state = 'active'
  )
  UPDATE public.pages
  SET state = 'deleted'
  WHERE id IN (SELECT id FROM page_tree);
  GET DIAGNOSTICS affected_count = ROW_COUNT;

  -- 2. Soft delete em boards (databases inline) ancorados em qualquer page do tree
  WITH RECURSIVE page_tree AS (
    SELECT id FROM public.pages WHERE id = _page_id
    UNION ALL
    SELECT p.id FROM public.pages p
    INNER JOIN page_tree pt ON p.parent_id = pt.id
  )
  UPDATE public.boards
  SET state = 'deleted'
  WHERE page_id IN (SELECT id FROM page_tree)
    AND state = 'active';

  RETURN affected_count;
END;
$$;

COMMENT ON FUNCTION public.soft_delete_page_cascade(UUID) IS
  'Cascade soft delete: marca page + descendentes + databases ancorados como state=deleted. Retorna count de pages afetadas. Requer is_page_admin na page raiz.';
