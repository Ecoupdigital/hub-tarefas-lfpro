import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * useRealtimeSync — workspace-level realtime subscription.
 * Subscribes to all board-related tables without board_id filter,
 * so caches stay fresh across ALL boards (not just the active one).
 * When you switch boards, data is already invalidated and React Query refetches.
 */
export const useRealtimeSync = () => {
  const qc = useQueryClient();
  const cvThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('workspace-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload) => {
        const boardId = (payload.new as any)?.board_id || (payload.old as any)?.board_id;
        if (boardId) {
          qc.invalidateQueries({ queryKey: ['items', boardId] });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, (payload) => {
        const boardId = (payload.new as any)?.board_id || (payload.old as any)?.board_id;
        if (boardId) {
          qc.invalidateQueries({ queryKey: ['groups', boardId] });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, (payload) => {
        const boardId = (payload.new as any)?.board_id || (payload.old as any)?.board_id;
        if (boardId) {
          qc.invalidateQueries({ queryKey: ['columns', boardId] });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'column_values' }, () => {
        // Debounce: invalidate column_values at most once per 2 seconds
        if (!cvThrottleRef.current) {
          cvThrottleRef.current = setTimeout(() => {
            qc.invalidateQueries({ queryKey: ['column_values'] });
            qc.invalidateQueries({ queryKey: ['my-work-items'] });
            cvThrottleRef.current = null;
          }, 2_000);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, () => {
        qc.invalidateQueries({ queryKey: ['boards'] });
      })
      .subscribe();

    return () => {
      if (cvThrottleRef.current) {
        clearTimeout(cvThrottleRef.current);
        cvThrottleRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [qc]);
};

/**
 * useRealtimeFavorites — global subscription for favorites table.
 * Ensures cross-tab sync when favorites are added/removed.
 */
export const useRealtimeFavorites = () => {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('favorites-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites' }, () => {
        qc.invalidateQueries({ queryKey: ['favorites'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
};
