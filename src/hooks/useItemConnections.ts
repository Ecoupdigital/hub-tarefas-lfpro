import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ItemConnection {
  id: string;
  item_id: string;
  connected_item_id: string;
  column_id: string;
}

export const useItemConnections = (itemId: string | undefined, columnId: string | undefined) =>
  useQuery({
    queryKey: ['item_connections', itemId, columnId],
    enabled: !!itemId && !!columnId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_connections')
        .select('*')
        .eq('item_id', itemId!)
        .eq('column_id', columnId!);
      if (error) throw error;
      return (data ?? []) as unknown as ItemConnection[];
    },
  });

export const useAddConnection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { itemId: string; connectedItemId: string; columnId: string }) => {
      const { data, error } = await supabase
        .from('item_connections')
        .insert({
          item_id: params.itemId,
          connected_item_id: params.connectedItemId,
          column_id: params.columnId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['item_connections', vars.itemId, vars.columnId] });
    },
  });
};

export const useRemoveConnection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; itemId: string; columnId: string }) => {
      const { error } = await supabase
        .from('item_connections')
        .delete()
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['item_connections', vars.itemId, vars.columnId] });
    },
  });
};

export const useConnectedItems = (connectedItemIds: string[]) =>
  useQuery({
    queryKey: ['connected_items', connectedItemIds],
    enabled: connectedItemIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, board_id, group_id')
        .in('id', connectedItemIds);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useTargetBoardItems = (boardId: string | undefined, search?: string) =>
  useQuery({
    queryKey: ['target_board_items', boardId, search],
    enabled: !!boardId,
    queryFn: async () => {
      let query = supabase
        .from('items')
        .select('id, name, board_id, group_id')
        .eq('board_id', boardId!)
        .order('name')
        .limit(50);
      if (search && search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
