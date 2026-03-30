import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function usePresence() {
  const [activeMembersByBoard, setActiveMembersByBoard] = useState<Record<string, string[]>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const channel = supabase.channel('sidebar-presence', {
      config: { presence: { key: 'sidebar' } },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const boardMap: Record<string, string[]> = {};
        for (const key of Object.keys(state)) {
          const presences = state[key] as Array<{ boardId?: string; userId?: string }>;
          for (const p of presences) {
            if (p.boardId && p.userId) {
              if (!boardMap[p.boardId]) boardMap[p.boardId] = [];
              if (!boardMap[p.boardId].includes(p.userId)) {
                boardMap[p.boardId].push(p.userId);
              }
            }
          }
        }
        setActiveMembersByBoard(boardMap);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data } = await supabase.auth.getUser();
          userIdRef.current = data.user?.id ?? null;
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  const trackPresence = useCallback(async (boardId: string) => {
    const channel = channelRef.current;
    if (!channel) return;

    let userId = userIdRef.current;
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
      userIdRef.current = userId;
    }
    if (!userId) return;

    // Untrack previous presence before tracking the new board,
    // so the user doesn't appear as a ghost on previously visited boards.
    await channel.untrack();
    await channel.track({
      boardId,
      userId,
      timestamp: Date.now(),
    });
  }, []);

  return { activeMembersByBoard, trackPresence };
}
