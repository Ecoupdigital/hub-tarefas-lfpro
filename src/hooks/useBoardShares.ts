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

// Create a share link (RPC: token seguro server-side + senha bcrypt no banco)
export const useCreateBoardShare = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      boardId: string;
      permission: string;
      expiresAt: string | null;
      password: string | null;
    }) => {
      const { data, error } = await (supabase as any).rpc('create_board_share', {
        p_board_id: params.boardId,
        p_permission: params.permission,
        p_expires_at: params.expiresAt,
        p_password: params.password || null,
      });
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

// Fetch board data by share token (public, no auth) via RPC SECURITY DEFINER.
// A RPC valida token + expiração + senha (bcrypt) no servidor e retorna o board.
// `password` so e enviado quando o board e protegido (re-fetch ao digitar).
export const usePublicBoardByToken = (token: string | undefined, password?: string) => useQuery({
  queryKey: ['public_board', token, password ?? null],
  enabled: !!token,
  retry: false,
  queryFn: async () => {
    const { data, error } = await (supabase as any).rpc('get_shared_board', {
      p_token: token!,
      p_password: password ?? null,
    });
    if (error) throw error;
    // { status: 'ok'|'not_found'|'expired'|'password_required'|'wrong_password', ... }
    return data as {
      status: 'ok' | 'not_found' | 'expired' | 'password_required' | 'wrong_password';
      share?: { permission: string; expires_at: string | null; has_password: boolean };
      board?: any;
      groups?: any[];
      columns?: any[];
      items?: any[];
      columnValues?: any[];
    };
  },
});
