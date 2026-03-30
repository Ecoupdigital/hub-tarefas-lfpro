import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import type { BoardSort } from '@/context/AppContext';
import type { FilterGroup } from '@/components/board/FilterBuilder';

function generateFilterId(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface FilterContextType {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  addQuickFilter: (columnId: string, value: string) => void;
  removeQuickFilter: (columnId: string) => void;
  clearFilters: () => void;
  advancedFilter: FilterGroup;
  setAdvancedFilter: (fg: FilterGroup) => void;
  activeFilterCount: number;
  sort: BoardSort | null;
  setSort: (s: BoardSort | null) => void;
  hiddenColumns: string[];
  setHiddenColumns: (cols: string[]) => void;
  toggleHiddenColumn: (columnId: string) => void;
  resetAll: () => void;
}

const FilterContext = createContext<FilterContextType | null>(null);

export const useFilter = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilter must be used inside FilterProvider');
  return ctx;
};

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFilter, setAdvancedFilter] = useState<FilterGroup>({ combinator: 'and', rules: [] });
  const [sort, setSort] = useState<BoardSort | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  const addQuickFilter = useCallback((columnId: string, value: string) => {
    setAdvancedFilter(prev => ({
      ...prev,
      rules: [
        ...prev.rules.filter(r => r.columnId !== columnId),
        { id: generateFilterId(), columnId, operator: 'contains' as const, value },
      ],
    }));
  }, []);

  const removeQuickFilter = useCallback((columnId: string) => {
    setAdvancedFilter(prev => ({
      ...prev,
      rules: prev.rules.filter(r => r.columnId !== columnId),
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setAdvancedFilter({ combinator: 'and', rules: [] });
  }, []);

  const toggleHiddenColumn = useCallback((columnId: string) => {
    setHiddenColumns(prev =>
      prev.includes(columnId) ? prev.filter(c => c !== columnId) : [...prev, columnId]
    );
  }, []);

  const resetAll = useCallback(() => {
    setSearchQuery('');
    setAdvancedFilter({ combinator: 'and', rules: [] });
    setSort(null);
  }, []);

  const activeFilterCount = useMemo(
    () => advancedFilter.rules.length,
    [advancedFilter]
  );

  return (
    <FilterContext.Provider value={{
      searchQuery, setSearchQuery,
      addQuickFilter, removeQuickFilter, clearFilters,
      advancedFilter, setAdvancedFilter,
      activeFilterCount,
      sort, setSort,
      hiddenColumns, setHiddenColumns, toggleHiddenColumn,
      resetAll,
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export default FilterContext;
