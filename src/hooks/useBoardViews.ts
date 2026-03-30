import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch saved views for a board
export const useBoardViews = (boardId: string | null) => useQuery({
  queryKey: ['board_views', boardId],
  enabled: !!boardId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from('board_views')
      .select('*')
      .eq('board_id', boardId!)
      .order('position');
    if (error) throw error;
    return data ?? [];
  },
});

// Create a saved view
export const useCreateBoardView = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, name, viewType, config }: {
      boardId: string; name: string; viewType: string; config: any;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('board_views').insert({
        board_id: boardId,
        name,
        view_type: viewType,
        config,
        created_by: user.user?.id!,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board_views'] });
    },
  });
};

// Delete a saved view
export const useDeleteBoardView = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('board_views').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board_views'] });
    },
  });
};
