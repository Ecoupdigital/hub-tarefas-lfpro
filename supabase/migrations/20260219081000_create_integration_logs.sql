-- =============================================================================
-- MIGRATION: Create integration_logs table
-- Date: 2026-02-19
-- Description: Creates the integration_logs table referenced by useIntegrations
--              hook and send-slack-notification Edge Function. Without this table,
--              webhook/integration logging fails silently.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient queries by integration + time
CREATE INDEX IF NOT EXISTS idx_integration_logs_integration_id
ON public.integration_logs(integration_id, created_at DESC);

-- RLS
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: workspace members can view logs for their integrations
CREATE POLICY "Workspace members can view integration logs"
ON public.integration_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.integrations i
    WHERE i.id = integration_id
    AND public.is_workspace_member(auth.uid(), i.workspace_id)
  )
);

-- INSERT: workspace members can create logs (used by Edge Functions with service role,
-- but also allow authenticated users for client-side logging)
CREATE POLICY "Workspace members can insert integration logs"
ON public.integration_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.integrations i
    WHERE i.id = integration_id
    AND public.is_workspace_member(auth.uid(), i.workspace_id)
  )
);

-- DELETE: workspace members can clean up old logs
CREATE POLICY "Workspace members can delete integration logs"
ON public.integration_logs FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.integrations i
    WHERE i.id = integration_id
    AND public.is_workspace_member(auth.uid(), i.workspace_id)
  )
);
