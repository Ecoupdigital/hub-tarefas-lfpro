import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type BoardRole = 'admin' | 'editor' | 'member' | 'viewer';

interface BoardPermission {
  id: string;
  board_id: string;
  user_id: string;
  role: string;
}

// Fetch all permissions for a board
export const usePermissions = (boardId: string | null) =>
  useQuery({
    queryKey: ['board_permissions', boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('board_permissions')
        .select('*')
        .eq('board_id', boardId!);
      if (error) throw error;
      return (data ?? []) as BoardPermission[];
    },
  });

// Get the current user's role for a board
export const useBoardRole = (boardId: string | null): BoardRole | null => {
  const { user } = useAuth();
  const { data: permissions = [] } = usePermissions(boardId);

  if (!user || !boardId) return null;

  const myPermission = permissions.find((p) => p.user_id === user.id);
  if (!myPermission) return null;

  return myPermission.role as BoardRole;
};

// Check if the current user can edit (admin or editor)
export const useCanEdit = (boardId: string | null): boolean => {
  const role = useBoardRole(boardId);
  return role === 'admin' || role === 'editor';
};

// Check if the current user is admin
export const useCanAdmin = (boardId: string | null): boolean => {
  const role = useBoardRole(boardId);
  return role === 'admin';
};

// Mutation to set or update a user's role on a board
export const useSetBoardPermission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      boardId,
      userId,
      role,
    }: {
      boardId: string;
      userId: string;
      role: BoardRole;
    }) => {
      // Upsert: if the user already has a permission for the board, update it
      const { data: existing } = await supabase
        .from('board_permissions')
        .select('id')
        .eq('board_id', boardId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('board_permissions')
          .update({ role })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('board_permissions')
          .insert({ board_id: boardId, user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board_permissions'] });
    },
  });
};

// Mutation to remove a user's permission from a board
export const useRemoveBoardPermission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      boardId,
      userId,
    }: {
      boardId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from('board_permissions')
        .delete()
        .eq('board_id', boardId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board_permissions'] });
    },
  });
};
