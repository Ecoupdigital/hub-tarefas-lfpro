import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ---- Types ----
export type TriggerType = 'status_change' | 'item_created' | 'date_arrived' | 'column_change' | 'person_assigned';
export type ActionType = 'change_status' | 'assign_person' | 'move_to_group' | 'send_notification' | 'create_subitem';

export interface AutomationRow {
  id: string;
  board_id: string;
  name: string;
  trigger_type: string;
  trigger_config: any;
  condition_config: any;
  action_type: string;
  action_config: any;
  conditions: any;
  actions: any;
  recurrence: any;
  is_active: boolean;
  created_by: string;
  created_at: string;
  last_run_at: string | null;
  run_count: number;
}

// ---- Fetch automations for a board ----
export const useAutomations = (boardId: string | null) =>
  useQuery({
    queryKey: ['automations', boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('board_id', boardId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AutomationRow[];
    },
  });

// ---- Create automation ----
export const useCreateAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      boardId: string;
      name: string;
      triggerType: string;
      triggerConfig: any;
      actionType: string;
      actionConfig: any;
      isActive?: boolean;
      conditions?: any;
      actions?: any;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const insertPayload: any = {
        board_id: params.boardId,
        name: params.name,
        trigger_type: params.triggerType,
        trigger_config: params.triggerConfig,
        condition_config: {},
        action_type: params.actionType,
        action_config: params.actionConfig,
        is_active: params.isActive ?? true,
        created_by: user.user.id,
      };
      if (params.conditions !== undefined) insertPayload.conditions = params.conditions;
      if (params.actions !== undefined) insertPayload.actions = params.actions;

      const { data, error } = await supabase
        .from('automations')
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
  });
};

// ---- Update automation ----
export const useUpdateAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      triggerType?: string;
      triggerConfig?: any;
      actionType?: string;
      actionConfig?: any;
      isActive?: boolean;
      conditions?: any;
      actions?: any;
    }) => {
      const update: any = {};
      if (params.name !== undefined) update.name = params.name;
      if (params.triggerType !== undefined) update.trigger_type = params.triggerType;
      if (params.triggerConfig !== undefined) update.trigger_config = params.triggerConfig;
      if (params.actionType !== undefined) update.action_type = params.actionType;
      if (params.actionConfig !== undefined) update.action_config = params.actionConfig;
      if (params.isActive !== undefined) update.is_active = params.isActive;
      if (params.conditions !== undefined) update.conditions = params.conditions;
      if (params.actions !== undefined) update.actions = params.actions;

      const { error } = await supabase
        .from('automations')
        .update(update)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
  });
};

// ---- Delete automation ----
export const useDeleteAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete logs first
      const { error: logsError } = await supabase
        .from('automation_logs')
        .delete()
        .eq('automation_id', id);
      if (logsError) throw logsError;

      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
      qc.invalidateQueries({ queryKey: ['automation_logs'] });
    },
  });
};

// ---- Fetch automation logs ----
export const useAutomationLogs = (automationId: string | null) =>
  useQuery({
    queryKey: ['automation_logs', automationId],
    enabled: !!automationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('automation_id', automationId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
