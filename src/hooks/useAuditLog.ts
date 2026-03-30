import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ActivityLogEntry } from '@/hooks/useActivityLog';

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  dateStart?: string;
  dateEnd?: string;
}

const PAGE_SIZE = 20;

/**
 * Hook para o log de auditoria global (tabela `audit_log`).
 * Usado por admins para visualizar todas as ações do sistema.
 * Falha silenciosamente para não-admins (retorna dados vazios via RLS).
 */
export const useAuditLog = (filters?: AuditLogFilters) =>
  useInfiniteQuery({
    queryKey: ['audit_log', filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.dateStart) {
        query = query.gte('created_at', filters.dateStart);
      }
      if (filters?.dateEnd) {
        query = query.lte('created_at', filters.dateEnd);
      }

      const { data, error } = await query;
      if (error) throw error;
      return {
        items: data ?? [],
        nextPage: (data?.length ?? 0) === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

/**
 * Hook para o log de auditoria de um board específico (tabela `activity_log`).
 * Carrega TODOS os logs do board — apenas admins devem ter acesso.
 *
 * Verificação de permissão: o hook checa o campo `workspace_members.role`
 * para o usuário autenticado. Se não for admin, retorna array vazio sem
 * disparar erro (fail silently, conforme Dev Notes da Story 5.3).
 *
 * RLS no banco também deve limitar a query — verificar policy.
 */
export interface BoardAuditLogFilters {
  userId?: string;
  action?: string;
  dateStart?: string;
  dateEnd?: string;
}

export const useBoardAuditLog = (boardId: string | null, filters?: BoardAuditLogFilters) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['board_audit_log', boardId, filters],
    initialPageParam: 0,
    enabled: !!boardId && !!user?.id,
    queryFn: async ({ pageParam = 0 }) => {
      if (!boardId || !user?.id) return { items: [] as ActivityLogEntry[], nextPage: undefined };

      // Verificar se o usuário é admin via workspace_members
      // A query abaixo falha silenciosamente se o user não tem permissão via RLS
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('role, workspace_id')
        .eq('user_id', user.id)
        .in('role', ['admin'])
        .limit(1)
        .maybeSingle();

      // Se não é admin de nenhum workspace, retornar vazio (sem erro)
      if (!memberData) {
        return { items: [] as ActivityLogEntry[], nextPage: undefined };
      }

      let query = supabase
        .from('activity_log')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.dateStart) {
        query = query.gte('created_at', filters.dateStart);
      }
      if (filters?.dateEnd) {
        query = query.lte('created_at', filters.dateEnd);
      }

      const { data, error } = await query;
      // Falha silenciosa: se erro (ex: RLS bloqueia), retornar vazio
      if (error) {
        console.warn('useBoardAuditLog: acesso negado ou erro ao buscar log', error.message);
        return { items: [] as ActivityLogEntry[], nextPage: undefined };
      }

      return {
        items: (data ?? []) as ActivityLogEntry[],
        nextPage: (data?.length ?? 0) === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
};

export const useLogAction = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      action,
      entityType,
      entityId,
      metadata,
    }: {
      action: string;
      entityType: string;
      entityId?: string;
      metadata?: Record<string, any>;
    }) => {
      if (!user?.id) return;
      const { error } = await supabase.from('audit_log' as any).insert({
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        metadata: metadata ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit_log'] });
    },
  });
};
