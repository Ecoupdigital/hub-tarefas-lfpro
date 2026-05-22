import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PagePresenceUser {
  userId: string;
  timestamp: number;
}

/**
 * Hook de presence dedicado a uma pagina.
 *
 * Cria um channel `page-presence-{pageId}` no Supabase Realtime e publica
 * (`channel.track`) o id do usuario corrente. Outros clients conectados ao
 * mesmo channel recebem o presence state e podem renderizar avatars.
 *
 * Diferenca do `usePresence` (sidebar) existente: aquele e um channel global
 * com mapeamento boardId -> userIds. Aqui o channel e por pagina, mais simples,
 * e o consumidor (PagePresenceIndicator) ja recebe a lista filtrada.
 *
 * Cleanup remove o channel e zera a lista, evitando ghosts apos navegacao.
 */
export function usePagePresence(pageId: string | null) {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<PagePresenceUser[]>([]);

  useEffect(() => {
    if (!pageId || !user) {
      setActiveUsers([]);
      return;
    }

    const channel = supabase.channel(`page-presence-${pageId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Dedup por userId: o mesmo usuario com varias abas conta uma so vez.
        const dedup = new Map<string, PagePresenceUser>();
        for (const key of Object.keys(state)) {
          const presences = state[key] as Array<{
            userId?: string;
            timestamp?: number;
          }>;
          for (const p of presences) {
            if (!p.userId) continue;
            const existing = dedup.get(p.userId);
            const ts = p.timestamp ?? Date.now();
            // Mantem o mais recente em caso de duplicata
            if (!existing || ts > existing.timestamp) {
              dedup.set(p.userId, { userId: p.userId, timestamp: ts });
            }
          }
        }
        setActiveUsers(Array.from(dedup.values()));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: user.id,
            timestamp: Date.now(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setActiveUsers([]);
    };
  }, [pageId, user]);

  return activeUsers;
}
