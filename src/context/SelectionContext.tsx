import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

interface SelectionContextType {
  selectedItems: Set<string>;
  toggleItem: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectRange: (ids: string[], fromId: string, toId: string) => void;
  lastSelectedId: string | null;
  setLastSelectedId: (id: string | null) => void;
  selectedCount: number;
  hasMultiSelection: boolean;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeBoardId } = useApp();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Clear selection when active board changes
  useEffect(() => {
    setSelectedItems(new Set());
    setLastSelectedId(null);
  }, [activeBoardId]);

  const toggleItem = useCallback((id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastSelectedId(id);
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedItems(prev => {
      const allSelected = ids.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      } else {
        const next = new Set(prev);
        ids.forEach(id => next.add(id));
        return next;
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setLastSelectedId(null);
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedItems.has(id);
  }, [selectedItems]);

  const selectRange = useCallback((ids: string[], fromId: string, toId: string) => {
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    setSelectedItems(prev => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        next.add(ids[i]);
      }
      return next;
    });
  }, []);

  return (
    <SelectionContext.Provider value={{
      selectedItems,
      toggleItem,
      selectAll,
      clearSelection,
      isSelected,
      selectRange,
      lastSelectedId,
      setLastSelectedId,
      selectedCount: selectedItems.size,
      hasMultiSelection: selectedItems.size > 1,
    }}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider');
  return ctx;
};
