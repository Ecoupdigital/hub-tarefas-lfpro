import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBoardItemCounts(boardIds: string[]) {
  return useQuery({
    queryKey: ['board-item-counts', [...boardIds].sort().join(',')],
    enabled: boardIds.length > 0,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<Record<string, number>> => {
      // Fetch counts per board using individual count queries instead of
      // downloading all item rows. This scales O(N boards) instead of O(N items).
      const counts: Record<string, number> = {};

      // Process in batches to avoid too many parallel requests
      const BATCH_SIZE = 10;
      for (let i = 0; i < boardIds.length; i += BATCH_SIZE) {
        const batch = boardIds.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (boardId) => {
            const { count, error } = await supabase
              .from('items')
              .select('*', { count: 'exact', head: true })
              .eq('board_id', boardId)
              .is('parent_item_id', null)
              .neq('state', 'deleted');
            if (error) throw error;
            return { boardId, count: count ?? 0 };
          })
        );
        for (const { boardId, count } of results) {
          counts[boardId] = count;
        }
      }

      return counts;
    },
  });
}
