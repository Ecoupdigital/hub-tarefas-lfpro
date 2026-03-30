import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Reaction {
  id: string;
  update_id: string;
  user_id: string;
  emoji: string;
}

export const useReactions = (updateId: string | null | undefined) =>
  useQuery({
    queryKey: ['reactions', updateId],
    enabled: !!updateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('update_reactions')
        .select('*')
        .eq('update_id', updateId!);
      if (error) throw error;
      return (data ?? []) as Reaction[];
    },
  });

export const useReactionsForItem = (updateIds: string[]) =>
  useQuery({
    queryKey: ['reactions_batch', updateIds.sort().join(',')],
    enabled: updateIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('update_reactions')
        .select('*')
        .in('update_id', updateIds);
      if (error) throw error;
      return (data ?? []) as Reaction[];
    },
  });

export const useToggleReaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ updateId, emoji }: { updateId: string; emoji: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Usuario nao autenticado');

      // Check if reaction already exists
      const { data: existing } = await supabase
        .from('update_reactions')
        .select('id')
        .eq('update_id', updateId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        const { error } = await supabase
          .from('update_reactions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' as const };
      } else {
        // Add reaction
        const { error } = await supabase
          .from('update_reactions')
          .insert({
            update_id: updateId,
            user_id: userId,
            emoji,
          } as any);
        if (error) throw error;
        return { action: 'added' as const };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reactions'] });
      qc.invalidateQueries({ queryKey: ['reactions_batch'] });
    },
  });
};
