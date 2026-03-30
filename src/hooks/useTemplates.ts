import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTemplates = () =>
  useQuery({
    queryKey: ['board-templates'],
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('board_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/**
 * Retorna templates do sistema (is_system=true) + templates do workspace especificado.
 * Templates de outros workspaces não são retornados (AC 5 da Story 3.4).
 */
export const useWorkspaceTemplates = (workspaceId: string | null) =>
  useQuery({
    queryKey: ['board-templates', 'workspace', workspaceId],
    staleTime: 5 * 60 * 1000,
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('board_templates')
        .select('*')
        .or(`is_system.eq.true,workspace_id.eq.${workspaceId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      category,
      icon,
      config,
      workspaceId,
    }: {
      name: string;
      description?: string;
      category?: string;
      icon?: string;
      config: Record<string, unknown>;
      workspaceId?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('board_templates')
        .insert({
          name,
          description: description || null,
          category: category || 'Customizado',
          icon: icon || '📋',
          config,
          is_system: false,
          workspace_id: workspaceId || null,
          created_by: user.user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-templates'] });
    },
  });
};

export const useDeleteTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('board_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-templates'] });
    },
  });
};
