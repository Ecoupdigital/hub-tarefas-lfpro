import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UndoRedoContext } from '@/context/UndoRedoContext';
import { toast } from 'sonner';

async function logActivity(params: { boardId: string; action: string; entityType: string; entityId: string; details?: any }) {
  const { data } = await supabase.auth.getUser();
  if (!data.user?.id) return;
  await supabase.from('activity_log' as any).insert({
    board_id: params.boardId,
    user_id: data.user.id,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    details: params.details ?? null,
  });
}

export const useCreateWorkspace = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ name, icon, color }: { name: string; icon?: string; color?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.from('workspaces').insert({
        name,
        icon: icon || '📁',
        color: color || '#6161FF',
        created_by: user.user.id,
      }).select().single();
      if (error) throw error;

      // Add creator as workspace member
      const { error: memberError } = await supabase.from('workspace_members').insert({
        workspace_id: data.id,
        user_id: user.user.id,
        role: 'admin',
      });
      if (memberError) throw memberError;

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
};

export const useCreateBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ workspaceId, name, description }: { workspaceId: string; name: string; description?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      // Place new board at the end by using a position larger than the current max
      const { data: lastBoard } = await supabase
        .from('boards')
        .select('position')
        .eq('workspace_id', workspaceId)
        .eq('state', 'active')
        .order('position', { ascending: false })
        .limit(1);
      const maxPosition = lastBoard?.[0]?.position ?? 0;
      const { data, error } = await supabase.from('boards').insert({
        workspace_id: workspaceId,
        name,
        description,
        created_by: user.user.id,
        position: maxPosition + 1000,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};

export const useCreateGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ boardId, title, color }: { boardId: string; title: string; color?: string }) => {
      // Fetch the current minimum position so the new group appears at the top
      const { data: existing } = await supabase
        .from('groups')
        .select('position')
        .eq('board_id', boardId)
        .order('position', { ascending: true })
        .limit(1);
      const minPosition = existing?.[0]?.position ?? 0;
      const position = minPosition - 1000;

      const { data, error } = await supabase.from('groups').insert({
        board_id: boardId,
        title,
        color: color || '#579BFC',
        position,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useCreateColumn = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ boardId, title, columnType, settings }: { boardId: string; title: string; columnType: string; settings?: any }) => {
      const { data, error } = await supabase.from('columns').insert({
        board_id: boardId,
        title,
        column_type: columnType,
        position: Date.now(),
        settings: settings || {},
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['columns'] });
    },
  });
};

export const useDeleteItem = () => {
  const qc = useQueryClient();
  const undoRedo = useContext(UndoRedoContext);
  return useMutation({
    retry: 1,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('items').update({ state: 'deleted' }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      // Capturar snapshot do item antes de deletar para possivel undo
      const queries = qc.getQueriesData({ queryKey: ['items'] });
      let itemSnapshot: unknown = null;
      for (const [, data] of queries) {
        if (Array.isArray(data)) {
          const found = (data as Array<{ id: string }>).find((item) => item.id === id);
          if (found) { itemSnapshot = found; break; }
        }
      }
      return { itemSnapshot };
    },
    onSuccess: (_, id, context) => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['column_values'] });
      qc.invalidateQueries({ queryKey: ['trash-items'] });

      // Registrar delecao no undo stack com snapshot do item
      if (undoRedo && context?.itemSnapshot) {
        undoRedo.pushAction({
          type: 'item_delete',
          entityId: id,
          entityType: 'item',
          oldValue: context.itemSnapshot,
          newValue: null,
        });
      }

      // Fire-and-forget: registro no activity_log nao bloqueia a mutation
      const snapshot = context?.itemSnapshot as { board_id?: string; name?: string } | null;
      if (snapshot?.board_id) {
        logActivity({
          boardId: snapshot.board_id!,
          action: 'item_deleted',
          entityType: 'item',
          entityId: id,
          details: { item_name: snapshot.name },
        }).catch(() => {});
      }
    },
  });
};

export const useDeleteGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async (id: string) => {
      // CASCADE DELETE no banco remove itens e column_values automaticamente (migration 20260217180000)
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir grupo. Tente novamente.');
      console.error('useDeleteGroup', error);
    },
  });
};

export const useDeleteBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('boards').update({ state: 'deleted' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir board. Tente novamente.');
      console.error('useDeleteBoard', error);
    },
  });
};

// ---- Favorites ----
export const useFavorites = () =>
  useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];
      const { data, error } = await supabase.from('favorites').select('*').eq('user_id', user.user.id);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useToggleFavorite = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async (boardId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      const { data: existing } = await supabase
        .from('favorites').select('id').eq('user_id', user.user.id).eq('board_id', boardId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('favorites').delete().eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('favorites').insert({ user_id: user.user.id, board_id: boardId });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['favorites'] }); },
    onError: (error: Error) => {
      toast.error('Erro ao alterar favorito. Tente novamente.');
      console.error('useToggleFavorite', error);
    },
  });
};

// ---- Update Column ----
export const useUpdateColumn = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ id, title, settings }: { id: string; title: string; settings?: any }) => {
      const update: any = { title };
      if (settings !== undefined) update.settings = settings;
      const { error } = await supabase.from('columns').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['columns'] }); },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar coluna. Tente novamente.');
      console.error('useUpdateColumn', error);
    },
  });
};

// ---- Delete Column ----
export const useDeleteColumn = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async (id: string) => {
      // CASCADE DELETE no banco remove column_values automaticamente via FK column_values.column_id
      const { error } = await supabase.from('columns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['columns'] });
      qc.invalidateQueries({ queryKey: ['column_values'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir coluna. Tente novamente.');
      console.error('useDeleteColumn', error);
    },
  });
};

// ---- Rename Workspace ----
export const useRenameWorkspace = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('workspaces').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workspaces'] }); },
    onError: (error: Error) => {
      toast.error('Erro ao renomear workspace. Tente novamente.');
      console.error('useRenameWorkspace', error);
    },
  });
};

// ---- Delete Workspace ----
export const useDeleteWorkspace = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async (id: string) => {
      // Soft-delete boards first (before cascade removes them)
      const { error: boardsErr } = await supabase.from('boards').update({ state: 'deleted' }).eq('workspace_id', id);
      if (boardsErr) throw boardsErr;
      // Delete workspace — CASCADE handles workspace_members, boards, folders, etc.
      const { error } = await supabase.from('workspaces').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir workspace. Tente novamente.');
      console.error('useDeleteWorkspace', error);
    },
  });
};

// ---- Duplicate Item ----
export const useDuplicateItem = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async (itemId: string) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: item } = await supabase.from('items').select('*').eq('id', itemId).single();
      if (!item) throw new Error('Item not found');
      const { data: newItem, error } = await supabase.from('items').insert({
        board_id: item.board_id, group_id: item.group_id,
        name: `${item.name} (cópia)`, position: item.position + 0.5,
        created_by: user.user?.id,
      }).select().single();
      if (error) throw error;
      // Copy column values
      const { data: cvs, error: cvsErr } = await supabase.from('column_values').select('*').eq('item_id', itemId);
      if (cvsErr) throw cvsErr;
      if (cvs?.length) {
        const { error: insertCvsErr } = await supabase.from('column_values').insert(cvs.map(cv => ({
          item_id: newItem.id, column_id: cv.column_id, value: cv.value, text_representation: cv.text_representation,
        })));
        if (insertCvsErr) throw insertCvsErr;
      }
      return newItem;
    },
    onSuccess: (newItem) => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['column_values'] });

      // Fire-and-forget: registro no activity_log nao bloqueia a mutation
      if (newItem?.board_id) {
        logActivity({
          boardId: newItem.board_id,
          action: 'item_duplicated',
          entityType: 'item',
          entityId: newItem.id,
          details: { item_name: newItem.name },
        }).catch(() => {});
      }
    },
  });
};

// ---- Move Item ----
export const useMoveItem = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 0,
    mutationFn: async ({ itemId, groupId }: { itemId: string; groupId: string }) => {
      // Usar .select('id') (array) em vez de .single() para evitar comportamento
      // inesperado do PGRST116 quando 0 linhas são afetadas
      const { data, error } = await supabase
        .from('items')
        .update({ group_id: groupId })
        .eq('id', itemId)
        .select('id');
      if (import.meta.env.DEV) console.log('[useMoveItem] Supabase response:', { itemId, groupId, data, error });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Falha ao mover item: sem permissão ou item não encontrado');
    },
    onMutate: async ({ itemId, groupId }) => {
      // Optimistic update: mover o item no cache imediatamente
      await qc.cancelQueries({ queryKey: ['items'] });
      const queries = qc.getQueriesData({ queryKey: ['items'] });
      let boardId: string | null = null;
      let fromGroupId: string | null = null;
      let itemName: string | null = null;
      const previousData: Array<{ queryKey: unknown[]; data: unknown }> = [];

      for (const [queryKey, data] of queries) {
        if (Array.isArray(data)) {
          const found = (data as Array<{ id: string; board_id: string; group_id: string; name: string }>).find((item) => item.id === itemId);
          if (found) { boardId = found.board_id; fromGroupId = found.group_id; itemName = found.name; }
          previousData.push({ queryKey: queryKey as unknown[], data });
          const updated = data.map((item: any) =>
            item.id === itemId ? { ...item, group_id: groupId } : item
          );
          qc.setQueryData(queryKey, updated);
        }
      }
      return { boardId, fromGroupId, itemName, previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback do optimistic update em caso de erro
      context?.previousData?.forEach(({ queryKey, data }) => {
        qc.setQueryData(queryKey, data);
      });
    },
    onSuccess: (_, { itemId, groupId }, context) => {
      // Fire-and-forget: registro no activity_log nao bloqueia a mutation
      if (context?.boardId && context.fromGroupId && context.fromGroupId !== groupId) {
        logActivity({
          boardId: context.boardId!,
          action: 'item_moved',
          entityType: 'item',
          entityId: itemId,
          details: {
            from_group: context.fromGroupId,
            to_group: groupId,
            item_name: context.itemName,
          },
        }).catch(() => {});
      }
    },
    // onSettled: invalida cache independente de sucesso ou erro
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

// ---- Create Subitem ----
export const useCreateSubitem = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ boardId, groupId, parentItemId, name }: { boardId: string; groupId: string; parentItemId: string; name: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('items').insert({
        board_id: boardId, group_id: groupId, parent_item_id: parentItemId,
        name, position: Date.now(), created_by: user.user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['all-subitems'] });
    },
  });
};

// ---- Reorder Item (update position) ----
export const useReorderItem = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ itemId, position }: { itemId: string; position: number }) => {
      const { error } = await supabase.from('items').update({ position }).eq('id', itemId);
      if (error) throw error;
    },
    onMutate: async ({ itemId, position }) => {
      await qc.cancelQueries({ queryKey: ['items'] });
      await qc.cancelQueries({ queryKey: ['all-subitems'] });
      const queries = qc.getQueriesData({ queryKey: ['items'] });
      // Also get subitem queries for optimistic update
      const subQueries = qc.getQueriesData({ queryKey: ['all-subitems'] });
      // Find the board_id of the item being reordered
      let targetBoardId: string | null = null;
      for (const [, data] of [...queries, ...subQueries]) {
        if (Array.isArray(data)) {
          const found = data.find((item: any) => item.id === itemId);
          if (found) { targetBoardId = found.board_id; break; }
        }
      }
      const previousData: any[] = [];
      // Optimistic update for items
      queries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          const belongsToSameBoard = !targetBoardId || data.some((item: any) => item.board_id === targetBoardId);
          if (!belongsToSameBoard) return;
          previousData.push({ queryKey, data });
          const updated = data.map((item: any) =>
            item.id === itemId ? { ...item, position } : item
          );
          qc.setQueryData(queryKey, updated);
        }
      });
      // Optimistic update for subitems
      subQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          const hasItem = data.some((item: any) => item.id === itemId);
          if (!hasItem) return;
          previousData.push({ queryKey, data });
          const updated = data
            .map((item: any) => item.id === itemId ? { ...item, position } : item)
            .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
          qc.setQueryData(queryKey, updated);
        }
      });
      return { previousData };
    },
    onError: (_err, _vars, context: any) => {
      context?.previousData?.forEach(({ queryKey, data }: any) => {
        qc.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['all-subitems'] });
    },
  });
};

// ---- Batch Reorder Items (normalize positions for a group) ----
export const useBatchReorderItems = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ updates }: { updates: Array<{ itemId: string; position: number }> }) => {
      // Run all position updates in parallel
      const results = await Promise.all(
        updates.map(({ itemId, position }) =>
          supabase.from('items').update({ position }).eq('id', itemId)
        )
      );
      const firstError = results.find(r => r.error);
      if (firstError?.error) throw firstError.error;
    },
    onMutate: async ({ updates }) => {
      await qc.cancelQueries({ queryKey: ['items'] });
      const queries = qc.getQueriesData({ queryKey: ['items'] });
      // Build a map for fast lookup
      const posMap = new Map(updates.map(u => [u.itemId, u.position]));
      // Find the board_id from the first item
      let targetBoardId: string | null = null;
      for (const [, data] of queries) {
        if (Array.isArray(data)) {
          const found = data.find((item: any) => posMap.has(item.id));
          if (found) { targetBoardId = found.board_id; break; }
        }
      }
      const previousData: any[] = [];
      queries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          const belongsToSameBoard = !targetBoardId || data.some((item: any) => item.board_id === targetBoardId);
          if (!belongsToSameBoard) return;
          previousData.push({ queryKey, data });
          const updated = data.map((item: any) =>
            posMap.has(item.id) ? { ...item, position: posMap.get(item.id) } : item
          );
          qc.setQueryData(queryKey, updated);
        }
      });
      return { previousData };
    },
    onError: (_err, _vars, context: any) => {
      context?.previousData?.forEach(({ queryKey, data }: any) => {
        qc.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

// ---- Move Item to Group with position ----
export const useMoveItemToGroup = () => {
  const qc = useQueryClient();
  const undoRedo = useContext(UndoRedoContext);
  return useMutation({
    retry: 1,
    mutationFn: async ({ itemId, groupId, position }: { itemId: string; groupId: string; position: number }) => {
      const { error } = await supabase.from('items').update({ group_id: groupId, position }).eq('id', itemId);
      if (error) throw error;
    },
    onMutate: async ({ itemId, groupId, position }) => {
      await qc.cancelQueries({ queryKey: ['items'] });
      const queries = qc.getQueriesData({ queryKey: ['items'] });
      // Find the board_id, old group_id and name of the item being moved
      let targetBoardId: string | null = null;
      let fromGroupId: string | null = null;
      let itemName: string | null = null;
      for (const [, data] of queries) {
        if (Array.isArray(data)) {
          const found = (data as Array<{ id: string; board_id: string; group_id: string; name?: string }>).find((item) => item.id === itemId);
          if (found) { targetBoardId = found.board_id; fromGroupId = found.group_id; itemName = found.name ?? null; break; }
        }
      }
      const previousData: Array<{ queryKey: unknown; data: unknown }> = [];
      queries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          // Only update cache entries that contain items from the same board
          const belongsToSameBoard = !targetBoardId || (data as Array<{ board_id: string }>).some((item) => item.board_id === targetBoardId);
          if (!belongsToSameBoard) return;
          previousData.push({ queryKey, data });
          const updated = (data as Array<{ id: string }>).map((item) =>
            item.id === itemId ? { ...item, group_id: groupId, position } : item
          );
          qc.setQueryData(queryKey, updated);
        }
      });
      return { previousData, fromGroupId, boardId: targetBoardId, itemName };
    },
    onError: (_err, _vars, context: { previousData?: Array<{ queryKey: unknown; data: unknown }>; fromGroupId?: string | null; boardId?: string | null; itemName?: string | null } | undefined) => {
      context?.previousData?.forEach(({ queryKey, data }) => {
        qc.setQueryData(queryKey as Parameters<typeof qc.setQueryData>[0], data);
      });
    },
    onSuccess: (_, { itemId, groupId }, context) => {
      // Registrar movimentacao no undo stack
      if (undoRedo && context?.fromGroupId && context.fromGroupId !== groupId) {
        undoRedo.pushAction({
          type: 'item_move',
          entityId: itemId,
          entityType: 'item',
          oldValue: context.fromGroupId,
          newValue: groupId,
        });
      }

      // Fire-and-forget: registro no activity_log nao bloqueia a mutation
      if (context?.boardId && context.fromGroupId && context.fromGroupId !== groupId) {
        logActivity({
          boardId: context.boardId!,
          action: 'item_moved',
          entityType: 'item',
          entityId: itemId,
          details: {
            from_group: context.fromGroupId,
            to_group: groupId,
            item_name: context.itemName,
          },
        }).catch(() => {});
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

// ---- Update Group (rename + color) ----
export const useUpdateGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ id, title, color }: { id: string; title?: string; color?: string }) => {
      const update: any = {};
      if (title !== undefined) update.title = title;
      if (color !== undefined) update.color = color;
      const { error } = await supabase.from('groups').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); },
  });
};

// ---- Reorder Group (update position) ----
export const useReorderGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ groupId, position }: { groupId: string; position: number }) => {
      const { error } = await supabase.from('groups').update({ position }).eq('id', groupId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); },
  });
};

// ---- Reorder Column (update position) ----
export const useReorderColumn = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ columnId, position }: { columnId: string; position: number }) => {
      const { error } = await supabase.from('columns').update({ position }).eq('id', columnId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['columns'] }); },
  });
};

// ---- Reorder Board (update position) ----
export const useReorderBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ boardId, position }: { boardId: string; position: number }) => {
      const { error } = await supabase.from('boards').update({ position }).eq('id', boardId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};

// ---- Move Board to Another Workspace ----
export const useMoveBoardToWorkspace = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ boardId, workspaceId }: { boardId: string; workspaceId: string }) => {
      const { error } = await supabase
        .from('boards')
        .update({ workspace_id: workspaceId, folder_id: null } as any)
        .eq('id', boardId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
      qc.invalidateQueries({ queryKey: ['workspace-folders'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao mover board. Tente novamente.');
      console.error('useMoveBoardToWorkspace', error);
    },
  });
};

// ---- Update Board Appearance ----
export const useUpdateBoardAppearance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, icon, color }: { id: string; icon?: string | null; color?: string | null }) => {
      const { error } = await supabase
        .from('boards')
        .update({ icon, color })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar aparencia do board. Tente novamente.');
      console.error('useUpdateBoardAppearance', error);
    },
  });
};

// ---- Update Workspace Appearance ----
export const useUpdateWorkspaceAppearance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, icon, color }: { id: string; icon?: string | null; color?: string | null }) => {
      const { error } = await supabase
        .from('workspaces')
        .update({ icon, color })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar aparencia do workspace. Tente novamente.');
      console.error('useUpdateWorkspaceAppearance', error);
    },
  });
};

// ---- Rename Board ----
export const useRenameBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('boards').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao renomear board. Tente novamente.');
      console.error('useRenameBoard', error);
    },
  });
};

// ---- Duplicate Board ----
export const useDuplicateBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async (boardId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      // Get original board
      const { data: board } = await supabase.from('boards').select('*').eq('id', boardId).single();
      if (!board) throw new Error('Board not found');
      // Create copy (place right after original)
      const { data: newBoard, error } = await supabase.from('boards').insert({
        workspace_id: board.workspace_id,
        name: `${board.name} (cópia)`,
        description: board.description,
        created_by: user.user.id,
        position: (board.position ?? 0) + 0.5,
      }).select().single();
      if (error) throw error;
      // Copy columns
      const { data: cols, error: colsErr } = await supabase.from('columns').select('*').eq('board_id', boardId);
      if (colsErr) throw colsErr;
      if (cols?.length) {
        const { error: insertColsErr } = await supabase.from('columns').insert(cols.map(c => ({
          board_id: newBoard.id, title: c.title, column_type: c.column_type,
          position: c.position, width: c.width, settings: c.settings,
        })));
        if (insertColsErr) throw insertColsErr;
      }
      // Copy groups
      const { data: groups, error: groupsErr } = await supabase.from('groups').select('*').eq('board_id', boardId);
      if (groupsErr) throw groupsErr;
      if (groups?.length) {
        const { error: insertGroupsErr } = await supabase.from('groups').insert(groups.map(g => ({
          board_id: newBoard.id, title: g.title, color: g.color, position: g.position,
        })));
        if (insertGroupsErr) throw insertGroupsErr;
      }
      return newBoard;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
      qc.invalidateQueries({ queryKey: ['columns'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

// ---- Duplicate Board with Options (RPC) ----
export const useDuplicateBoardWithOptions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, mode, name }: { boardId: string; mode: string; name?: string }) => {
      const { data, error } = await supabase.rpc('duplicate_board_with_options', {
        p_board_id: boardId,
        p_mode: mode,
        p_name: name || null,
      });
      if (error) throw error;
      return data as string; // new board UUID
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boards'] });
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['columns'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: Error) => {
      console.error('useDuplicateBoardWithOptions', error);
    },
  });
};
