import { useEffect, useRef } from 'react';
import { useUI } from '@/context/UIContext';
import { useFilter } from '@/context/FilterContext';
import { useTab } from '@/context/TabContext';

/**
 * TabBridge — syncs TabContext state ↔ FilterContext/UIContext.
 *
 * On tab switch: restores filter/view state from the tab.
 * On filter/view changes: saves to the active tab.
 * Must be rendered inside all three providers.
 */
const TabBridge: React.FC = () => {
  const { activeTabId, activeTab, updateActiveTabState } = useTab();
  const { setActiveView, activeView, activeBoardId, setActiveBoardId } = useUI();
  const {
    searchQuery, setSearchQuery,
    advancedFilter, setAdvancedFilter,
    sort, setSort,
    hiddenColumns, setHiddenColumns,
  } = useFilter();

  const lastTabIdRef = useRef<string | null>(null);
  const isRestoringRef = useRef(false);

  // When tab changes: restore state from the new tab
  useEffect(() => {
    if (!activeTab || activeTabId === lastTabIdRef.current) return;
    lastTabIdRef.current = activeTabId;

    isRestoringRef.current = true;

    // Sync board
    if (activeTab.boardId !== activeBoardId) {
      setActiveBoardId(activeTab.boardId);
    }

    // Restore filter/view state
    setSearchQuery(activeTab.searchQuery);
    setAdvancedFilter(activeTab.advancedFilter);
    setSort(activeTab.sort);
    setHiddenColumns(activeTab.hiddenColumns);
    setActiveView(activeTab.activeView);

    // Allow saving again after React settles (rAF + microtask)
    requestAnimationFrame(() => {
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 0);
    });
  }, [activeTabId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When filter/view state changes: save to active tab (debounced to avoid loops)
  useEffect(() => {
    if (isRestoringRef.current || !activeTabId) return;
    updateActiveTabState({
      searchQuery,
      advancedFilter,
      sort,
      hiddenColumns,
      activeView,
    });
  }, [searchQuery, advancedFilter, sort, hiddenColumns, activeView]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

export default TabBridge;
