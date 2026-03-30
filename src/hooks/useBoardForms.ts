import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch all forms for a board
export const useBoardForms = (boardId: string | null) => useQuery({
  queryKey: ['board_forms', boardId],
  enabled: !!boardId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from('board_forms')
      .select('*')
      .eq('board_id', boardId!)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

// Create a new form
export const useCreateBoardForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      boardId: string;
      title: string;
      description?: string;
      slug: string;
      targetGroupId: string;
      columnIds: string[];
      settings?: any;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('board_forms').insert({
        board_id: params.boardId,
        title: params.title,
        description: params.description || null,
        slug: params.slug,
        target_group_id: params.targetGroupId,
        column_ids: params.columnIds,
        settings: params.settings || {},
        created_by: user.user?.id || null,
        is_active: true,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board_forms'] });
    },
  });
};

// Update a form
export const useUpdateBoardForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      title?: string;
      description?: string;
      slug?: string;
      targetGroupId?: string;
      columnIds?: string[];
      settings?: any;
      isActive?: boolean;
    }) => {
      const updates: any = {};
      if (params.title !== undefined) updates.title = params.title;
      if (params.description !== undefined) updates.description = params.description;
      if (params.slug !== undefined) updates.slug = params.slug;
      if (params.targetGroupId !== undefined) updates.target_group_id = params.targetGroupId;
      if (params.columnIds !== undefined) updates.column_ids = params.columnIds;
      if (params.settings !== undefined) updates.settings = params.settings;
      if (params.isActive !== undefined) updates.is_active = params.isActive;

      const { data, error } = await supabase
        .from('board_forms')
        .update(updates)
        .eq('id', params.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board_forms'] });
    },
  });
};

// Delete a form
export const useDeleteBoardForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('board_forms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board_forms'] });
    },
  });
};

// Fetch public form by slug (no auth required)
export const usePublicForm = (slug: string | undefined) => useQuery({
  queryKey: ['public_form', slug],
  enabled: !!slug,
  queryFn: async () => {
    const { data: form, error: formError } = await supabase
      .from('board_forms')
      .select('*')
      .eq('slug', slug!)
      .maybeSingle();
    if (formError) throw formError;
    if (!form) return null;

    // Fetch board name
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id, name')
      .eq('id', form.board_id)
      .single();
    if (boardError) throw boardError;

    // Fetch columns for the form
    const { data: columns, error: columnsError } = await supabase
      .from('columns')
      .select('*')
      .in('id', form.column_ids)
      .order('position');
    if (columnsError) throw columnsError;

    // Fetch target group name
    const groupResult = form.target_group_id
      ? await supabase.from('groups').select('id, title').eq('id', form.target_group_id).single()
      : { data: null, error: null };
    if (groupResult.error) throw groupResult.error;
    const group = groupResult.data;

    return {
      ...form,
      board_name: board?.name || '',
      board_id_resolved: board?.id || form.board_id,
      columns: columns ?? [],
      group_title: group?.title || '',
    };
  },
});
