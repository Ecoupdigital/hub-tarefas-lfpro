import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ---- Board Trash (AC 3, 4: arquivar e lixeira de boards) ----

export const useTrashBoards = () =>
  useQuery({
    queryKey: ['trash-boards'],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('*, workspaces!inner(name)')
        .eq('state', 'deleted')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useArchivedBoards = () =>
  useQuery({
    queryKey: ['archived-boards'],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('*, workspaces!inner(name)')
        .eq('state', 'archived')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useRestoreBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('boards').update({ state: 'active' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
      qc.invalidateQueries({ queryKey: ['trash-boards'] });
      qc.invalidateQueries({ queryKey: ['archived-boards'] });
    },
  });
};

export const usePermanentDeleteBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('boards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash-boards'] });
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};

// ---- Item Trash ----

export const useTrashItems = () =>
  useQuery({
    queryKey: ['trash-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*, boards!inner(name)')
        .eq('state', 'deleted')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSoftDeleteItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('items').update({ state: 'deleted' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['column_values'] });
      qc.invalidateQueries({ queryKey: ['trash-items'] });
    },
  });
};

export const useRestoreItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('items').update({ state: 'active' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['trash-items'] });
    },
  });
};

export const usePermanentDeleteItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete column values first
      const { error: cvErr } = await supabase.from('column_values').delete().eq('item_id', id);
      if (cvErr) throw cvErr;
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash-items'] });
      qc.invalidateQueries({ queryKey: ['column_values'] });
    },
  });
};

export const useEmptyTrash = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Get all deleted items
      const { data: items, error: fetchErr } = await supabase
        .from('items')
        .select('id')
        .eq('state', 'deleted');
      if (fetchErr) throw fetchErr;
      if (!items?.length) return;

      const itemIds = items.map(i => i.id);
      // Delete column values
      const { error: cvErr } = await supabase.from('column_values').delete().in('item_id', itemIds);
      if (cvErr) throw cvErr;
      // Delete items
      const { error } = await supabase.from('items').delete().eq('state', 'deleted');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash-items'] });
      qc.invalidateQueries({ queryKey: ['column_values'] });
    },
  });
};
