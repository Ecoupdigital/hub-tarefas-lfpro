import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PagePermission, PageRole } from '@/types/page';

// Lista todas as permissoes de uma pagina. Espelha usePermissions de board.
export const usePagePermissions = (pageId: string | null) =>
  useQuery({
    queryKey: ['page_permissions', pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_permissions')
        .select('id, page_id, user_id, role, created_at')
        .eq('page_id', pageId!);
      if (error) throw error;
      return (data ?? []) as PagePermission[];
    },
  });

// Retorna o role do usuario corrente na pagina (ou null se nao houver registro explicito).
export const usePageRole = (pageId: string | null): PageRole | null => {
  const { user } = useAuth();
  const { data: permissions = [] } = usePagePermissions(pageId);
  if (!user || !pageId) return null;
  const my = permissions.find((p) => p.user_id === user.id);
  return (my?.role as PageRole | undefined) ?? null;
};

/**
 * Usuario pode editar se for membro do workspace (acesso default) E nao for viewer explicito.
 * Sem registro em page_permissions => assumir editor (workspace member tem edicao por default).
 * Com registro role 'viewer' => bloqueia.
 */
export const useCanEditPage = (pageId: string | null): boolean => {
  const role = usePageRole(pageId);
  if (role === null) return true; // sem registro explicito = editor default
  return role === 'admin' || role === 'editor' || role === 'member';
};

export const useCanAdminPage = (pageId: string | null): boolean => {
  const role = usePageRole(pageId);
  return role === 'admin';
};

// Upsert do role de um usuario na pagina. Espelha useSetBoardPermission.
export const useSetPagePermission = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({
      pageId,
      userId,
      role,
    }: {
      pageId: string;
      userId: string;
      role: PageRole;
    }) => {
      const { data: existing } = await supabase
        .from('page_permissions')
        .select('id')
        .eq('page_id', pageId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('page_permissions')
          .update({ role })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('page_permissions')
          .insert({ page_id: pageId, user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['page_permissions'] });
    },
  });
};

// Remove o registro de permissao do usuario na pagina.
export const useRemovePagePermission = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({
      pageId,
      userId,
    }: {
      pageId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from('page_permissions')
        .delete()
        .eq('page_id', pageId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['page_permissions'] });
    },
  });
};
