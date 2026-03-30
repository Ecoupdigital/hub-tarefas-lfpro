import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ExtraColumnValue {
  columnTitle: string;
  columnType: string;
  value: any;
  settings?: any;
}

export interface MyWorkItem {
  id: string;
  name: string;
  boardId: string;
  boardName: string;
  groupId: string | null;
  groupTitle: string;
  groupColor: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  statusValue?: { value: string; color: string; label: string };
  dateValue?: string;
  startTime?: string;
  endTime?: string;
  parentItemId?: string | null;
  parentItemName?: string | null;
  people: { id: string; name: string; avatarUrl?: string }[];
  extraColumns?: ExtraColumnValue[];
}

const STALE_TIME = 5 * 60 * 1000; // 5 minutos — Realtime invalida quando há mudanças reais

async function fetchMyWorkItems(userId: string): Promise<MyWorkItem[]> {
  const { data, error } = await supabase.rpc('get_my_work_items', {
    p_user_id: userId,
  });
  if (error) throw error;
  return (data as MyWorkItem[]) ?? [];
}

/** Inicia o prefetch de "Meu Trabalho" em background (usar no hover da sidebar ou pós-login). */
export function prefetchMyWorkItems(queryClient: QueryClient, userId: string | undefined) {
  if (!userId) return;
  queryClient.prefetchQuery({
    queryKey: ['my-work-items', userId],
    staleTime: STALE_TIME,
    queryFn: () => fetchMyWorkItems(userId),
  });
}

export function useMyWorkItems(targetUserId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const effectiveUserId = targetUserId ?? user?.id;

  // Realtime: invalida o cache quando column_values ou items mudam
  useEffect(() => {
    if (!effectiveUserId) return;

    const channel = supabase
      .channel(`my-work-realtime-${effectiveUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'column_values' }, () => {
        queryClient.invalidateQueries({ queryKey: ['my-work-items', effectiveUserId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        queryClient.invalidateQueries({ queryKey: ['my-work-items', effectiveUserId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveUserId, queryClient]);

  return useQuery({
    queryKey: ['my-work-items', effectiveUserId],
    enabled: !!effectiveUserId,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: true,
    queryFn: () => fetchMyWorkItems(effectiveUserId!),
  });
}
