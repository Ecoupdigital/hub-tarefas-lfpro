import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import type { BoardView, BoardSort } from '@/context/AppContext';
import type { FilterGroup } from '@/components/board/FilterBuilder';

const MAX_TABS = 8;
const STORAGE_KEY = 'lfpro-tabs';

export interface TabState {
  id: string;
  boardId: string;
  searchQuery: string;
  advancedFilter: FilterGroup;
  sort: BoardSort | null;
  hiddenColumns: string[];
  activeView: BoardView;
}

function createTabState(boardId: string): TabState {
  return {
    id: Math.random().toString(36).slice(2, 10),
    boardId,
    searchQuery: '',
    advancedFilter: { combinator: 'and', rules: [] },
    sort: null,
    hiddenColumns: [],
    activeView: 'table',
  };
}

function loadTabs(): { tabs: TabState[]; activeTabId: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tabs: [], activeTabId: null };
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.tabs)) {
      return { tabs: parsed.tabs, activeTabId: parsed.activeTabId || null };
    }
  } catch { /* ignore */ }
  return { tabs: [], activeTabId: null };
}

function saveTabs(tabs: TabState[], activeTabId: string | null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeTabId }));
}

interface TabContextType {
  tabs: TabState[];
  activeTabId: string | null;
  activeTab: TabState | null;
  hasMultipleTabs: boolean;
  openTab: (boardId: string) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  updateActiveTabState: (patch: Partial<TabState>) => void;
  /** Ensures the active board has a tab (for normal navigation without explicit "open in tab") */
  ensureTab: (boardId: string) => void;
}

const TabContext = createContext<TabContextType | null>(null);

export const useTab = () => {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error('useTab must be used inside TabProvider');
  return ctx;
};

export const TabProvider = ({ children }: { children: ReactNode }) => {
  const [tabs, setTabs] = useState<TabState[]>(() => loadTabs().tabs);
  const [activeTabId, setActiveTabId] = useState<string | null>(() => loadTabs().activeTabId);

  const persist = useCallback((newTabs: TabState[], newActiveId: string | null) => {
    saveTabs(newTabs, newActiveId);
  }, []);

  const activeTab = useMemo(
    () => tabs.find(t => t.id === activeTabId) || null,
    [tabs, activeTabId]
  );

  const hasMultipleTabs = tabs.length > 1;

  const openTab = useCallback((boardId: string) => {
    setTabs(prev => {
      // If board already has a tab, switch to it
      const existing = prev.find(t => t.boardId === boardId);
      if (existing) {
        setActiveTabId(existing.id);
        persist(prev, existing.id);
        return prev;
      }
      // Max tabs check
      if (prev.length >= MAX_TABS) return prev;
      const newTab = createTabState(boardId);
      const updated = [...prev, newTab];
      setActiveTabId(newTab.id);
      persist(updated, newTab.id);
      return updated;
    });
  }, [persist]);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId);
      if (idx === -1) return prev;
      const updated = prev.filter(t => t.id !== tabId);
      if (updated.length === 0) {
        setActiveTabId(null);
        persist(updated, null);
        return updated;
      }
      // If closing active tab, switch to adjacent
      setActiveTabId(current => {
        if (current !== tabId) {
          persist(updated, current);
          return current;
        }
        const newActive = updated[Math.min(idx, updated.length - 1)].id;
        persist(updated, newActive);
        return newActive;
      });
      return updated;
    });
  }, [persist]);

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    setTabs(prev => {
      persist(prev, tabId);
      return prev;
    });
  }, [persist]);

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      persist(updated, activeTabId);
      return updated;
    });
  }, [persist, activeTabId]);

  const updateActiveTabState = useCallback((patch: Partial<TabState>) => {
    setTabs(prev => {
      const updated = prev.map(t =>
        t.id === activeTabId ? { ...t, ...patch } : t
      );
      persist(updated, activeTabId);
      return updated;
    });
  }, [activeTabId, persist]);

  const ensureTab = useCallback((boardId: string) => {
    setTabs(prev => {
      // If board already has a tab, switch to it only if not already active
      const existing = prev.find(t => t.boardId === boardId);
      if (existing) {
        setActiveTabId(cur => {
          if (cur === existing.id) return cur; // no-op, prevent re-render
          persist(prev, existing.id);
          return existing.id;
        });
        return prev;
      }
      // Single-tab mode: if only 0-1 tabs, replace the single tab
      if (prev.length <= 1) {
        const newTab = createTabState(boardId);
        const updated = [newTab];
        setActiveTabId(newTab.id);
        persist(updated, newTab.id);
        return updated;
      }
      // Multiple tabs open: add new tab (if under limit)
      if (prev.length >= MAX_TABS) {
        // Replace active tab's board
        const updated = prev.map(t =>
          t.id === activeTabId ? createTabState(boardId) : t
        );
        const newActive = updated.find(t => t.boardId === boardId);
        if (newActive) {
          setActiveTabId(newActive.id);
          persist(updated, newActive.id);
        }
        return updated;
      }
      const newTab = createTabState(boardId);
      const updated = [...prev, newTab];
      setActiveTabId(newTab.id);
      persist(updated, newTab.id);
      return updated;
    });
  }, [activeTabId, persist]);

  return (
    <TabContext.Provider value={{
      tabs, activeTabId, activeTab, hasMultipleTabs,
      openTab, closeTab, switchTab, reorderTabs,
      updateActiveTabState, ensureTab,
    }}>
      {children}
    </TabContext.Provider>
  );
};

export default TabContext;
