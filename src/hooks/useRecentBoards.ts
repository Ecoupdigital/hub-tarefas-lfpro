import { useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'lfpro-recent-boards';
const MAX_RECENT = 5;

interface RecentBoard {
  boardId: string;
  accessedAt: number;
}

function loadRecent(): RecentBoard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useRecentBoards() {
  const [recentBoards, setRecentBoards] = useState<RecentBoard[]>(loadRecent);

  const recentBoardIds = useMemo(() => recentBoards.map(r => r.boardId), [recentBoards]);

  const trackBoardAccess = useCallback((boardId: string) => {
    setRecentBoards(prev => {
      const filtered = prev.filter(r => r.boardId !== boardId);
      const updated: RecentBoard[] = [
        { boardId, accessedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { recentBoardIds, trackBoardAccess };
}
