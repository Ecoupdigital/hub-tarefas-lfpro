import { useCallback } from 'react';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const UndoRedoKeyboardHandler = () => {
  const { undo, redo } = useUndoRedo();

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  return null;
};

export default UndoRedoKeyboardHandler;
