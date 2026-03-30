import { describe, it, expect, beforeEach, vi } from 'vitest';

// We test the pure logic functions from TabContext by importing them indirectly.
// Since TabContext uses React hooks internally, we test the underlying storage
// and state management logic by exercising the functions through the provider.

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { TabProvider, useTab } from '@/context/TabContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(TabProvider, null, children);
}

describe('TabContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no tabs and no active tab', () => {
    const { result } = renderHook(() => useTab(), { wrapper });
    expect(result.current.tabs).toEqual([]);
    expect(result.current.activeTabId).toBeNull();
    expect(result.current.activeTab).toBeNull();
    expect(result.current.hasMultipleTabs).toBe(false);
  });

  describe('openTab', () => {
    it('opens a new tab and makes it active', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].boardId).toBe('board-1');
      expect(result.current.activeTabId).toBe(result.current.tabs[0].id);
      expect(result.current.activeTab).not.toBeNull();
    });

    it('switches to existing tab if board already open', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      const firstTabId = result.current.tabs[0].id;
      act(() => result.current.openTab('board-2'));
      act(() => result.current.openTab('board-1'));
      expect(result.current.tabs).toHaveLength(2);
      expect(result.current.activeTabId).toBe(firstTabId);
    });

    it('respects MAX_TABS limit of 8', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      for (let i = 0; i < 10; i++) {
        act(() => result.current.openTab(`board-${i}`));
      }
      expect(result.current.tabs).toHaveLength(8);
    });

    it('creates tab with default state', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      const tab = result.current.tabs[0];
      expect(tab.boardId).toBe('board-1');
      expect(tab.searchQuery).toBe('');
      expect(tab.advancedFilter).toEqual({ combinator: 'and', rules: [] });
      expect(tab.sort).toBeNull();
      expect(tab.hiddenColumns).toEqual([]);
      expect(tab.activeView).toBe('table');
    });
  });

  describe('closeTab', () => {
    it('removes the tab', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      act(() => result.current.openTab('board-2'));
      const tabToClose = result.current.tabs[0].id;
      act(() => result.current.closeTab(tabToClose));
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].boardId).toBe('board-2');
    });

    it('switches to adjacent tab when closing active tab', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      act(() => result.current.openTab('board-2'));
      act(() => result.current.openTab('board-3'));
      // Active is board-3 (last opened)
      const activeId = result.current.activeTabId!;
      act(() => result.current.closeTab(activeId));
      expect(result.current.tabs).toHaveLength(2);
      expect(result.current.activeTabId).not.toBeNull();
    });

    it('sets activeTabId to null when closing last tab', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      const tabId = result.current.tabs[0].id;
      act(() => result.current.closeTab(tabId));
      expect(result.current.tabs).toHaveLength(0);
      expect(result.current.activeTabId).toBeNull();
    });

    it('does nothing for non-existent tab id', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      act(() => result.current.closeTab('nonexistent'));
      expect(result.current.tabs).toHaveLength(1);
    });

    it('keeps non-active tab active when closing different tab', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      act(() => result.current.openTab('board-2'));
      const tab1Id = result.current.tabs.find(t => t.boardId === 'board-1')!.id;
      const tab2Id = result.current.tabs.find(t => t.boardId === 'board-2')!.id;
      // Active is board-2
      act(() => result.current.closeTab(tab1Id));
      expect(result.current.activeTabId).toBe(tab2Id);
    });
  });

  describe('switchTab', () => {
    it('changes active tab', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      act(() => result.current.openTab('board-2'));
      const tab1Id = result.current.tabs.find(t => t.boardId === 'board-1')!.id;
      act(() => result.current.switchTab(tab1Id));
      expect(result.current.activeTabId).toBe(tab1Id);
    });
  });

  describe('ensureTab', () => {
    it('creates tab when no tabs exist', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.ensureTab('board-1'));
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].boardId).toBe('board-1');
    });

    it('replaces single tab in single-tab mode', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.ensureTab('board-1'));
      act(() => result.current.ensureTab('board-2'));
      // With only 1 tab, ensureTab replaces it
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].boardId).toBe('board-2');
    });

    it('switches to existing tab if board already open', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      act(() => result.current.openTab('board-2'));
      const tab1Id = result.current.tabs.find(t => t.boardId === 'board-1')!.id;
      act(() => result.current.ensureTab('board-1'));
      expect(result.current.activeTabId).toBe(tab1Id);
      expect(result.current.tabs).toHaveLength(2);
    });

    it('adds new tab when multiple tabs are open and under limit', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      act(() => result.current.openTab('board-2'));
      act(() => result.current.ensureTab('board-3'));
      expect(result.current.tabs).toHaveLength(3);
      expect(result.current.activeTab!.boardId).toBe('board-3');
    });
  });

  describe('updateActiveTabState', () => {
    it('patches the active tab state', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      act(() => result.current.updateActiveTabState({ searchQuery: 'test' }));
      expect(result.current.activeTab!.searchQuery).toBe('test');
    });

    it('does not affect other tabs', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      act(() => result.current.openTab('board-2'));
      act(() => result.current.updateActiveTabState({ searchQuery: 'only-board-2' }));
      const tab1 = result.current.tabs.find(t => t.boardId === 'board-1')!;
      expect(tab1.searchQuery).toBe('');
    });
  });

  describe('reorderTabs', () => {
    it('moves tab from one position to another', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      act(() => result.current.openTab('board-2'));
      act(() => result.current.openTab('board-3'));
      act(() => result.current.reorderTabs(0, 2));
      expect(result.current.tabs[0].boardId).toBe('board-2');
      expect(result.current.tabs[2].boardId).toBe('board-1');
    });
  });

  describe('hasMultipleTabs', () => {
    it('is false with 0 or 1 tabs', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      expect(result.current.hasMultipleTabs).toBe(false);
      act(() => result.current.openTab('board-1'));
      expect(result.current.hasMultipleTabs).toBe(false);
    });

    it('is true with 2+ tabs', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      act(() => result.current.openTab('board-2'));
      expect(result.current.hasMultipleTabs).toBe(true);
    });
  });

  describe('localStorage persistence', () => {
    it('persists tabs to localStorage on open', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      const stored = JSON.parse(localStorage.getItem('lfpro-tabs')!);
      expect(stored.tabs).toHaveLength(1);
      expect(stored.tabs[0].boardId).toBe('board-1');
      expect(stored.activeTabId).toBeTruthy();
    });

    it('persists on close', () => {
      const { result } = renderHook(() => useTab(), { wrapper });
      act(() => result.current.openTab('board-1'));
      act(() => result.current.openTab('board-2'));
      const tab1Id = result.current.tabs[0].id;
      act(() => result.current.closeTab(tab1Id));
      const stored = JSON.parse(localStorage.getItem('lfpro-tabs')!);
      expect(stored.tabs).toHaveLength(1);
    });

    it('loads persisted tabs on init', () => {
      const tabState = {
        tabs: [{
          id: 'saved-tab',
          boardId: 'saved-board',
          searchQuery: '',
          advancedFilter: { combinator: 'and', rules: [] },
          sort: null,
          hiddenColumns: [],
          activeView: 'table',
        }],
        activeTabId: 'saved-tab',
      };
      localStorage.setItem('lfpro-tabs', JSON.stringify(tabState));
      const { result } = renderHook(() => useTab(), { wrapper });
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].boardId).toBe('saved-board');
      expect(result.current.activeTabId).toBe('saved-tab');
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('lfpro-tabs', 'not-json-{{{');
      const { result } = renderHook(() => useTab(), { wrapper });
      expect(result.current.tabs).toEqual([]);
      expect(result.current.activeTabId).toBeNull();
    });
  });

  describe('useTab outside provider', () => {
    it('throws error', () => {
      expect(() => {
        renderHook(() => useTab());
      }).toThrow('useTab must be used inside TabProvider');
    });
  });
});
