import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AutomationRecipe {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger_type: string;
  trigger_config: any;
  conditions: any;
  actions: any;
  icon: string | null;
  is_system: boolean;
}

export interface AutomationLogEntry {
  id: string;
  automation_id: string;
  status: string;
  details: any;
  item_id: string | null;
  created_at: string;
}

export const useAutomationRecipes = () =>
  useQuery({
    queryKey: ['automation_recipes'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_recipes')
        .select('*')
        .order('category')
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as AutomationRecipe[];
    },
  });

export const useAllAutomationLogs = (boardId: string | null) =>
  useQuery({
    queryKey: ['automation_logs_all', boardId],
    enabled: !!boardId,
    queryFn: async () => {
      // First get automation IDs for this board
      const { data: automations, error: autoError } = await supabase
        .from('automations')
        .select('id, name')
        .eq('board_id', boardId!);
      if (autoError) throw autoError;
      if (!automations || automations.length === 0) return [];

      const automationIds = automations.map((a) => a.id);
      const automationMap = new Map(automations.map((a) => [a.id, a.name]));

      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .in('automation_id', automationIds)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      return (data ?? []).map((log: any) => ({
        ...log,
        automation_name: automationMap.get(log.automation_id) || 'Desconhecida',
      })) as (AutomationLogEntry & { automation_name: string })[];
    },
  });

export const useAutomationLogsForAutomation = (automationId: string | null) =>
  useQuery({
    queryKey: ['automation_logs', automationId],
    enabled: !!automationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('automation_id', automationId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AutomationLogEntry[];
    },
  });
