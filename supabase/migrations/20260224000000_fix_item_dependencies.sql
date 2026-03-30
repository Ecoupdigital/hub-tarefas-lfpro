-- =============================================================================
-- MIGRATION: Fix item_dependencies schema and RLS
-- Date: 2026-02-24
-- Issues fixed:
--   1. Add 'depends_on' to type CHECK constraint (code uses it but DB didn't allow it)
--   2. Fix SELECT RLS policy to cover target_item_id (was only checking source_item_id)
-- =============================================================================

-- 1. Fix CHECK constraint: add 'depends_on' as valid type
ALTER TABLE public.item_dependencies
  DROP CONSTRAINT IF EXISTS item_dependencies_type_check;

ALTER TABLE public.item_dependencies
  ADD CONSTRAINT item_dependencies_type_check
  CHECK (type IN ('blocks', 'blocked_by', 'related', 'depends_on'));

-- 2. Fix SELECT RLS: allow viewing a dependency if the user can access EITHER item
DROP POLICY IF EXISTS "Board members can view dependencies" ON public.item_dependencies;

CREATE POLICY "Board members can view dependencies"
  ON public.item_dependencies
  FOR SELECT TO authenticated
  USING (
    public.can_access_item(auth.uid(), source_item_id)
    OR public.can_access_item(auth.uid(), target_item_id)
  );
