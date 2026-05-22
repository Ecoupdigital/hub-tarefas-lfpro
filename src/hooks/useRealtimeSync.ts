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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, (payload) => {
        qc.invalidateQueries({ queryKey: ['boards'] });
        // Database inline (boards.page_id NOT NULL) afeta arvore do sidebar:
        // muda count de filhos da page parente + lista de databases ancoradas.
        const pageId = (payload.new as any)?.page_id ?? (payload.old as any)?.page_id;
        if (pageId) {
          qc.invalidateQueries({ queryKey: ['databases-for-page', pageId] });
          // child_count da page pode ter mudado em qualquer nivel da arvore
          qc.invalidateQueries({ queryKey: ['pages-tree'] });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, (payload) => {
        const pageId = (payload.new as any)?.id || (payload.old as any)?.id;
        const parentId = (payload.new as any)?.parent_id ?? (payload.old as any)?.parent_id ?? null;
        const workspaceId =
          (payload.new as any)?.workspace_id || (payload.old as any)?.workspace_id;
        qc.invalidateQueries({ queryKey: ['pages'] });
        qc.invalidateQueries({ queryKey: ['all-pages'] });
        if (pageId) {
          qc.invalidateQueries({ queryKey: ['page', pageId] });
        }
        // Invalida arvore no nivel afetado + root (child_count do pai muda)
        if (workspaceId) {
          qc.invalidateQueries({ queryKey: ['pages-tree', workspaceId, parentId] });
          qc.invalidateQueries({ queryKey: ['pages-tree', workspaceId, null] });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'page_versions' }, (payload) => {
        const pageId = (payload.new as any)?.page_id || (payload.old as any)?.page_id;
        if (pageId) {
          qc.invalidateQueries({ queryKey: ['page_versions', pageId] });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'synced_blocks' }, (payload) => {
        // Synced block (Fase 02): conteudo compartilhado entre pages do mesmo workspace.
        // Invalida cache individual (todos os blocos `synced` que referenciam este id
        // refetcham via useSyncedBlock) + cache da lista por workspace (picker dialog).
        const id = (payload.new as any)?.id || (payload.old as any)?.id;
        const workspaceId =
          (payload.new as any)?.workspace_id || (payload.old as any)?.workspace_id;
        if (id) {
          qc.invalidateQueries({ queryKey: ['synced-block', id] });
        }
        if (workspaceId) {
          qc.invalidateQueries({ queryKey: ['synced-blocks-workspace', workspaceId] });
        }
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
