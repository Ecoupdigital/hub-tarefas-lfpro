import React, { ReactNode } from 'react';
import { UIProvider, useUI } from '@/context/UIContext';
import { FilterProvider, useFilter } from '@/context/FilterContext';
import { BoardProvider, useBoard } from '@/context/BoardContext';
import { TabProvider, useTab } from '@/context/TabContext';
import type { Board, Column, Group, ColumnValue } from '@/types/board';
import type { FilterGroup, FilterRule, FilterOperator, FilterCombinator } from '@/components/board/FilterBuilder';

export type BoardView = 'table' | 'kanban' | 'timeline' | 'calendar' | 'dashboard' | 'cards' | 'charts' | 'files';

export interface BoardSort {
  columnId: string | 'name';
  direction: 'asc' | 'desc';
}

export type { FilterGroup, FilterRule, FilterOperator, FilterCombinator };

/**
 * useApp — compatibility adapter that aggregates UIContext + FilterContext + BoardContext.
 * Existing consumers continue to work without changes.
 * New code should prefer useUI(), useFilter(), useBoard() for targeted subscriptions.
 */
export const useApp = () => {
  const ui = useUI();
  const filter = useFilter();
  const board = useBoard();

  return {
    // UI state
    activeBoardId: ui.activeBoardId,
    setActiveBoardId: ui.setActiveBoardId,
    activeWorkspaceId: ui.activeWorkspaceId,
    setActiveWorkspaceId: ui.setActiveWorkspaceId,
    sidebarCollapsed: ui.sidebarCollapsed,
    setSidebarCollapsed: ui.setSidebarCollapsed,
    selectedItem: ui.selectedItem,
    setSelectedItem: ui.setSelectedItem,
    updateSelectedItem: ui.updateSelectedItem,
    setSelectedItemWithStack: ui.setSelectedItemWithStack,
    pushNavItem: ui.pushNavItem,
    popNavItem: ui.popNavItem,
    jumpToNavLevel: ui.jumpToNavLevel,
    navStack: ui.navStack,
    activeView: ui.activeView,
    setActiveView: ui.setActiveView,
    zenMode: ui.zenMode,
    setZenMode: ui.setZenMode,

    // Filter state
    searchQuery: filter.searchQuery,
    setSearchQuery: filter.setSearchQuery,
    addFilter: (f: { columnId: string; value: string }) => filter.addQuickFilter(f.columnId, f.value),
    removeFilter: filter.removeQuickFilter,
    clearFilters: filter.clearFilters,
    advancedFilter: filter.advancedFilter,
    setAdvancedFilter: filter.setAdvancedFilter,
    activeFilterCount: filter.activeFilterCount,
    sort: filter.sort,
    setSort: filter.setSort,
    hiddenColumns: filter.hiddenColumns,
    setHiddenColumns: filter.setHiddenColumns,
    toggleHiddenColumn: filter.toggleHiddenColumn,

    // Board data & actions
    workspaces: board.workspaces,
    boards: board.boards,
    activeBoard: board.activeBoard,
    setActiveBoard: board.setActiveBoard,
    activeWorkspace: board.activeWorkspace,
    users: board.users,
    groups: board.groups,
    columns: board.columns,
    items: board.items,
    columnValues: board.columnValues,
    toggleGroupCollapse: board.toggleGroupCollapse,
    collapseAllGroups: board.collapseAllGroups,
    updateItemColumnValue: board.updateItemColumnValue,
    updateItemName: board.updateItemName,
    addItemToGroup: board.addItemToGroup,
    loading: board.loading,
    favorites: board.favorites,
    isFavorite: board.isFavorite,
  };
};

/**
 * AppProvider — wraps UIProvider > FilterProvider > BoardProvider.
 * Provider order matters: UIProvider must be outermost (BoardProvider depends on it).
 */
export const AppProvider = ({ children }: { children: ReactNode }) => {
  return (
    <UIProvider>
      <FilterProvider>
        <TabProvider>
          <BoardProvider>
            {children}
          </BoardProvider>
        </TabProvider>
      </FilterProvider>
    </UIProvider>
  );
};

// Re-export hooks for convenience
export { useUI, useFilter, useBoard, useTab };
