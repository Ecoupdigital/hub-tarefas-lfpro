import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch all share links for a board
export const useBoardShares = (boardId: string | null) => useQuery({
  queryKey: ['board_shares', boardId],
  enabled: !!boardId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from('board_shares')
      .select('id, board_id, token, permission, expires_at, password_hash, created_by, created_at')
      .eq('board_id', boardId!)
      .order('created_at', { ascending: false });
    if (error) throw error;
    // Strip password_hash, expose only a boolean flag
    return (data ?? []).map(({ password_hash, ...rest }) => ({
      ...rest,
      has_password: !!password_hash,
    }));
  },
});

// Create a share link
export const useCreateBoardShare = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      boardId: string;
      permission: string;
      expiresAt: string | null;
      passwordHash: string | null;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const { data, error } = await supabase.from('board_shares').insert({
        board_id: params.boardId,
        permission: params.permission,
        expires_at: params.expiresAt,
        password_hash: params.passwordHash,
        token,
        created_by: user.user?.id || null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board_shares'] });
    },
  });
};

// Delete/revoke a share link
export const useDeleteBoardShare = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('board_shares').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board_shares'] });
    },
  });
};

// Fetch board data by share token (public, no auth)
export const usePublicBoardByToken = (token: string | undefined) => useQuery({
  queryKey: ['public_board', token],
  enabled: !!token,
  queryFn: async () => {
    // Fetch the share record
    const { data: shareRaw, error: shareError } = await supabase
      .from('board_shares')
      .select('id, board_id, token, permission, expires_at, password_hash, created_by, created_at')
      .eq('token', token!)
      .maybeSingle();
    if (shareError) throw shareError;
    if (!shareRaw) return { status: 'not_found' as const };

    // Strip the raw hash — expose only a boolean flag + keep hash for verification only
    const { password_hash, ...shareFields } = shareRaw;
    const share = { ...shareFields, has_password: !!password_hash, _passwordHash: password_hash };

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return { status: 'expired' as const, share };
    }

    // Fetch board
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('*')
      .eq('id', share.board_id)
      .single();
    if (boardError) throw boardError;

    // Fetch groups
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .eq('board_id', share.board_id)
      .order('position');
    if (groupsError) throw groupsError;

    // Fetch columns
    const { data: columns, error: columnsError } = await supabase
      .from('columns')
      .select('*')
      .eq('board_id', share.board_id)
      .order('position');
    if (columnsError) throw columnsError;

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('board_id', share.board_id)
      .is('parent_item_id', null)
      .neq('state', 'deleted')
      .order('position');
    if (itemsError) throw itemsError;

    // Fetch column values
    const itemIds = (items ?? []).map(i => i.id);
    let columnValues: any[] = [];
    if (itemIds.length > 0) {
      const { data: cv, error: cvError } = await supabase
        .from('column_values')
        .select('*')
        .in('item_id', itemIds);
      if (cvError) throw cvError;
      columnValues = cv ?? [];
    }

    return {
      status: 'ok' as const,
      share,
      board,
      groups: groups ?? [],
      columns: columns ?? [],
      items: items ?? [],
      columnValues,
    };
  },
});
