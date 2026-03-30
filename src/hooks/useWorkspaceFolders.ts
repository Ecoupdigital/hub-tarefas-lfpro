import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useWorkspaceFolders = (workspaceId?: string) =>
  useQuery({
    queryKey: ['workspace_folders', workspaceId],
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_folders')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('position');
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        workspace_id: string;
        name: string;
        parent_id: string | null;
        position: number;
      }>;
    },
  });

export const useCreateFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workspaceId,
      name,
      parentId,
    }: {
      workspaceId: string;
      name: string;
      parentId?: string;
    }) => {
      const { data, error } = await supabase
        .from('workspace_folders')
        .insert({
          workspace_id: workspaceId,
          name,
          parent_id: parentId ?? null,
          position: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace_folders'] });
    },
  });
};

export const useUpdateFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      parentId,
      position,
    }: {
      id: string;
      name?: string;
      parentId?: string | null;
      position?: number;
    }) => {
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (parentId !== undefined) updates.parent_id = parentId;
      if (position !== undefined) updates.position = position;

      const { error } = await supabase
        .from('workspace_folders')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace_folders'] });
    },
  });
};

export const useDeleteFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: string) => {
      // Move boards to root (folder_id = null) before deleting folder
      await supabase
        .from('boards')
        .update({ folder_id: null })
        .eq('folder_id', folderId);

      const { error } = await supabase
        .from('workspace_folders')
        .delete()
        .eq('id', folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace_folders'] });
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};

export const useMoveBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      boardId,
      folderId,
    }: {
      boardId: string;
      folderId: string | null;
    }) => {
      const { error } = await supabase
        .from('boards')
        .update({ folder_id: folderId })
        .eq('id', boardId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};
