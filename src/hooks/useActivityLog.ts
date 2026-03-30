import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ActivityAction =
  | 'item_created'
  | 'item_updated'
  | 'status_changed'
  | 'item_deleted'
  | 'item_moved'
  | 'column_value_changed'
  | 'comment_added';

/**
 * Representa uma entrada no activity_log.
 *
 * Schema da tabela (Supabase):
 *   id, board_id, user_id, action, entity_type, entity_id (nullable),
 *   item_id (nullable), old_value (jsonb, nullable), new_value (jsonb, nullable),
 *   metadata (jsonb, nullable), created_at
 *
 * O campo `metadata` pode conter:
 *   - triggered_by: 'user' | 'automation'
 *   - column_name: nome da coluna alterada
 *   - from_group / to_group: grupos ao mover item
 *   - item_name: nome do item
 */
export interface ActivityLogEntry {
  id: string;
  board_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  item_id: string | null;
  old_value: any;
  new_value: any;
  metadata: any;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Busca atividades recentes de um board (para painel de auditoria) */
export const useActivityLog = (boardId: string | null, limit: number = 50) =>
  useQuery({
    queryKey: ['activity_log', boardId, limit],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('board_id', boardId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ActivityLogEntry[];
    },
  });

/** Busca atividades de um item específico (para o ActivityFeed no ItemDetailPanel) */
export const useItemActivityLog = (itemId: string | null) =>
  useQuery({
    queryKey: ['activity_log_item', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('item_id', itemId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ActivityLogEntry[];
    },
  });

// ---------------------------------------------------------------------------
// Realtime subscription para o feed de atividades de um item
// ---------------------------------------------------------------------------

/**
 * Assina mudanças em tempo real na tabela activity_log para um item específico.
 * Quando um novo registro é inserido, invalida a query do React Query para o item.
 *
 * NOTA: Como a tabela activity_log não tem um filtro por item_id disponível
 * via Supabase Realtime (requer configuração de replica identity), escutamos
 * todas as inserções no board e invalidamos a query do item quando o board_id
 * coincidir. Isso é aceitável dado o volume baixo de atividades.
 */
export const useItemActivityRealtime = (itemId: string | null, boardId: string | null) => {
  const qc = useQueryClient();

  useEffect(() => {
    if (!itemId || !boardId) return;

    const channel = supabase
      .channel(`activity-item-${itemId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `item_id=eq.${itemId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['activity_log_item', itemId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, boardId, qc]);
};

// ---------------------------------------------------------------------------
// Mutation para criar uma entrada no activity_log (usada nos hooks de CRUD)
// ---------------------------------------------------------------------------

export const useLogActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      boardId: string;
      action: ActivityAction;
      entityType: string;
      entityId?: string;
      itemId?: string;
      oldValue?: any;
      newValue?: any;
      metadata?: any;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Usuario nao autenticado');

      const { error } = await supabase.from('activity_log').insert({
        board_id: entry.boardId,
        user_id: userId,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId ?? null,
        item_id: entry.itemId ?? null,
        old_value: entry.oldValue ?? null,
        new_value: entry.newValue ?? null,
        metadata: entry.metadata ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity_log'] });
      qc.invalidateQueries({ queryKey: ['activity_log_item'] });
    },
  });
};
