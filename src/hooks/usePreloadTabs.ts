import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTab } from '@/context/TabContext';

/**
 * usePreloadTabs — prefetches data for ALL open tabs so switching is instant.
 * Uses the exact same queries/fields as the main hooks to ensure cache hits.
 */
export const usePreloadTabs = () => {
  const { tabs } = useTab();
  const queryClient = useQueryClient();
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const tab of tabs) {
      const boardId = tab.boardId;

      // Skip if already prefetched this board
      if (prefetchedRef.current.has(boardId)) continue;
      prefetchedRef.current.add(boardId);

      // Prefetch groups (same fields as useGroups)
      queryClient.prefetchQuery({
        queryKey: ['groups', boardId],
        staleTime: 2 * 60 * 1000,
        queryFn: async () => {
          const { data } = await supabase
            .from('groups')
            .select('id, board_id, title, color, position, is_collapsed')
            .eq('board_id', boardId)
            .order('position');
          return data || [];
        },
      });

      // Prefetch columns (same fields as useColumns)
      queryClient.prefetchQuery({
        queryKey: ['columns', boardId],
        staleTime: 2 * 60 * 1000,
        queryFn: async () => {
          const { data } = await supabase
            .from('columns')
            .select('id, board_id, column_type, title, settings, position, width, edit_permission')
            .eq('board_id', boardId)
            .order('position');
          return data || [];
        },
      });

      // Prefetch items (same fields as useItems)
      queryClient.prefetchQuery({
        queryKey: ['items', boardId],
        staleTime: 30_000,
        queryFn: async () => {
          const { data } = await supabase
            .from('items')
            .select('id, name, board_id, group_id, position, state, parent_item_id, created_at, updated_at')
            .eq('board_id', boardId)
            .is('parent_item_id', null)
            .neq('state', 'deleted')
            .order('position');
          return data || [];
        },
      });

      // Prefetch column_values (same logic as useColumnValues)
      queryClient.prefetchQuery({
        queryKey: ['column_values', boardId],
        staleTime: 30_000,
        queryFn: async () => {
          const { data: items } = await supabase
            .from('items')
            .select('id')
            .eq('board_id', boardId)
            .neq('state', 'deleted');
          if (!items?.length) return [];
          const CHUNK_SIZE = 100;
          const itemIds = items.map(i => i.id);
          const chunks: string[][] = [];
          for (let i = 0; i < itemIds.length; i += CHUNK_SIZE) {
            chunks.push(itemIds.slice(i, i + CHUNK_SIZE));
          }
          const results = await Promise.all(
            chunks.map(chunk =>
              supabase.from('column_values').select('id, item_id, column_id, value, text_representation').in('item_id', chunk)
            )
          );
          return results.flatMap(r => r.data ?? []);
        },
      });
    }
  }, [tabs, queryClient]);

  // Clean up prefetched set when tabs are removed
  useEffect(() => {
    const currentBoardIds = new Set(tabs.map(t => t.boardId));
    for (const id of prefetchedRef.current) {
      if (!currentBoardIds.has(id)) {
        prefetchedRef.current.delete(id);
      }
    }
  }, [tabs]);
};
