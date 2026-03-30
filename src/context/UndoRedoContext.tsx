import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type UndoRedoActionType = 'value_change' | 'item_rename' | 'item_move' | 'item_delete' | 'item_create' | 'batch_value_change';

export interface BatchValueChange {
  itemId: string;
  columnId: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface UndoRedoAction {
  type: UndoRedoActionType;
  entityId: string;
  entityType: 'item' | 'column_value';
  oldValue: unknown;
  newValue: unknown;
  timestamp: number;
  metadata?: Record<string, unknown>;
  batchChanges?: BatchValueChange[];
}

interface UndoRedoContextType {
  undoStack: UndoRedoAction[];
  redoStack: UndoRedoAction[];
  pushAction: (action: Omit<UndoRedoAction, 'timestamp'>) => void;
  undo: () => UndoRedoAction | null;
  redo: () => UndoRedoAction | null;
  clearHistory: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_STACK_SIZE = 50;

export const UndoRedoContext = createContext<UndoRedoContextType | undefined>(undefined);

export const UndoRedoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [undoStack, setUndoStack] = useState<UndoRedoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRedoAction[]>([]);

  const pushAction = useCallback((action: Omit<UndoRedoAction, 'timestamp'>) => {
    const fullAction: UndoRedoAction = { ...action, timestamp: Date.now() };
    setUndoStack(prev => {
      const next = [...prev, fullAction];
      if (next.length > MAX_STACK_SIZE) {
        return next.slice(next.length - MAX_STACK_SIZE);
      }
      return next;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback((): UndoRedoAction | null => {
    let action: UndoRedoAction | null = null;
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      action = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    if (action) {
      const captured = action;
      setRedoStack(prev => [...prev, captured]);
    }
    return action;
  }, []);

  const redo = useCallback((): UndoRedoAction | null => {
    let action: UndoRedoAction | null = null;
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      action = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    if (action) {
      const captured = action;
      setUndoStack(prev => [...prev, captured]);
    }
    return action;
  }, []);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return (
    <UndoRedoContext.Provider value={{
      undoStack,
      redoStack,
      pushAction,
      undo,
      redo,
      clearHistory,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
    }}>
      {children}
    </UndoRedoContext.Provider>
  );
};

export const useUndoRedoContext = () => {
  const ctx = useContext(UndoRedoContext);
  if (!ctx) throw new Error('useUndoRedoContext must be used within UndoRedoProvider');
  return ctx;
};
