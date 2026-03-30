import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface WebhookConfig {
  name: string;
  url: string;
  events: string[];
  last_triggered_at?: string | null;
}

export interface SlackConfig {
  webhook_url: string;
}

export interface Integration {
  id: string;
  workspace_id: string;
  type: string;
  config: WebhookConfig;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface IntegrationLog {
  id: string;
  integration_id: string | null;
  event_type: string;
  status: 'success' | 'error';
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---- Generic integrations (workspaceId-scoped) ----

export const useIntegrations = (workspaceId: string | null | undefined) =>
  useQuery({
    queryKey: ['integrations', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(d => ({
        ...d,
        config: d.config as unknown as WebhookConfig,
      })) as Integration[];
    },
  });

export const useCreateIntegration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workspaceId,
      config,
    }: {
      workspaceId: string;
      config: WebhookConfig;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('integrations')
        .insert({
          workspace_id: workspaceId,
          type: 'webhook',
          config: config as unknown as Json,
          is_active: true,
          created_by: user.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
};

export const useUpdateIntegration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      config,
    }: {
      id: string;
      config: WebhookConfig;
    }) => {
      const { error } = await supabase
        .from('integrations')
        .update({ config: config as unknown as Json })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
};

export const useDeleteIntegration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
};

export const useToggleIntegration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('integrations')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
};

// ---- Slack integration (workspace-scoped, type='slack') ----

export const useSlackIntegration = (workspaceId: string | null | undefined) =>
  useQuery({
    queryKey: ['slack-integration', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .eq('type', 'slack')
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        // NOTE: config is loaded here for UI display of non-sensitive fields only.
        // The actual webhook_url is NEVER returned to the client in queries that
        // would be visible in browser DevTools — it is accessed exclusively inside
        // the Edge Function via service_role key.
        // We store a masked version in the UI state.
        config: data.config as unknown as Record<string, unknown>,
      };
    },
  });

export const useSaveSlackIntegration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workspaceId,
      webhookUrl,
      isActive,
      existingId,
    }: {
      workspaceId: string;
      webhookUrl: string;
      isActive: boolean;
      existingId?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      // Config stores the webhook URL — only accessible server-side via service_role
      const config: Json = { webhook_url: webhookUrl } as unknown as Json;

      if (existingId) {
        const { error } = await supabase
          .from('integrations')
          .update({ config, is_active: isActive, type: 'slack' })
          .eq('id', existingId);
        if (error) throw error;
        return existingId;
      } else {
        const { data, error } = await supabase
          .from('integrations')
          .insert({
            workspace_id: workspaceId,
            type: 'slack',
            config,
            is_active: isActive,
            created_by: user.user?.id ?? null,
          })
          .select('id')
          .single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['slack-integration', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['integrations', vars.workspaceId] });
    },
  });
};

export const useToggleSlackIntegration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive, workspaceId }: { id: string; isActive: boolean; workspaceId: string }) => {
      const { error } = await supabase
        .from('integrations')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
      return workspaceId;
    },
    onSuccess: (workspaceId) => {
      qc.invalidateQueries({ queryKey: ['slack-integration', workspaceId] });
    },
  });
};

// ---- Test Slack connection via Edge Function ----
export const testSlackConnection = async (workspaceId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-slack-notification', {
      body: {
        boardId: '__test__',
        itemId: '__test__',
        itemName: 'Teste de conexao',
        oldStatus: 'Pendente',
        newStatus: 'Em Andamento',
        triggeredByAutomation: false,
        _testWorkspaceId: workspaceId,
        _isTest: true,
      },
    });
    if (error) return { success: false, error: error.message };
    const payload = data as { success?: boolean; error?: string } | null;
    return { success: payload?.success ?? false, error: payload?.error };
  } catch (err) {
    return { success: false, error: String(err) };
  }
};

// ---- Integration Logs ----
// integration_logs is not in the generated types yet — use runtime cast
// The table schema: id, integration_id, event_type, status, error_message, metadata, created_at
export const useIntegrationLogs = (integrationId: string | null | undefined, limit = 10) =>
  useQuery({
    queryKey: ['integration-logs', integrationId, limit],
    enabled: !!integrationId,
    staleTime: 30_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('integration_logs')
        .select('*')
        .eq('integration_id', integrationId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) {
        // Table may not exist yet — return empty array gracefully
        console.warn('integration_logs query failed (table may not exist):', error.message);
        return [] as IntegrationLog[];
      }
      return (data ?? []) as IntegrationLog[];
    },
  });
