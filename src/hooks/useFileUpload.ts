import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ItemFile {
  id: string;
  item_id: string;
  column_id: string | null;
  update_id: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

export const useItemFiles = (itemId: string | null | undefined) =>
  useQuery({
    queryKey: ['item_files', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('item_files')
        .select('*')
        .eq('item_id', itemId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ItemFile[];
    },
  });

// Files attached to a specific update
export const useUpdateFiles = (updateId: string | null | undefined) =>
  useQuery({
    queryKey: ['update_files', updateId],
    enabled: !!updateId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('item_files')
        .select('*')
        .eq('update_id', updateId!)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as ItemFile[];
    },
  });

export const useUploadFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      itemId,
      columnId,
      updateId,
    }: {
      file: File;
      itemId: string;
      columnId?: string;
      updateId?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Usuario nao autenticado');

      const storagePath = `${userId}/${itemId}/${file.name}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Insert reference in item_files table
      // If DB insert fails, clean up the orphaned file from storage
      try {
        const { data, error: insertError } = await (supabase as any)
          .from('item_files')
          .insert({
            item_id: itemId,
            column_id: columnId || null,
            update_id: updateId || null,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: storagePath,
            uploaded_by: userId,
          })
          .select()
          .single();
        if (insertError) throw insertError;

        return data as ItemFile;
      } catch (dbError) {
        // Cleanup: remove orphaned file from storage
        await supabase.storage.from('attachments').remove([storagePath]);
        throw dbError;
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['item_files', variables.itemId] });
      qc.invalidateQueries({ queryKey: ['column_values'] });
      if (variables.updateId) {
        qc.invalidateQueries({ queryKey: ['update_files', variables.updateId] });
      }
    },
  });
};

export const useDeleteFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileId, storagePath, itemId }: { fileId: string; storagePath: string; itemId: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([storagePath]);
      if (storageError) throw storageError;

      // Delete from item_files table
      const { error: dbError } = await (supabase as any)
        .from('item_files')
        .delete()
        .eq('id', fileId);
      if (dbError) throw dbError;

      return { itemId };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['item_files', variables.itemId] });
      qc.invalidateQueries({ queryKey: ['column_values'] });
    },
  });
};

export const getFilePublicUrl = (storagePath: string): string => {
  const { data } = supabase.storage.from('attachments').getPublicUrl(storagePath);
  return data.publicUrl;
};
