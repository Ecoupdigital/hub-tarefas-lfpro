import { useEffect } from 'react';

type ViewType = 'table' | 'kanban' | 'calendar';

interface KeyboardShortcutsOptions {
  onSearch?: () => void;
  onNewItem?: () => void;
  onEscape?: () => void;
  onViewChange?: (view: ViewType) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

const isInputFocused = (): boolean => {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
};

export const useKeyboardShortcuts = ({
  onSearch,
  onNewItem,
  onEscape,
  onViewChange,
  onUndo,
  onRedo,
}: KeyboardShortcutsOptions) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + K - search / command palette
      if (mod && e.key === 'k') {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Cmd/Ctrl + N - new item
      if (mod && e.key === 'n') {
        e.preventDefault();
        onNewItem?.();
        return;
      }

      // Cmd/Ctrl + Shift + Z - redo
      if (mod && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // Cmd/Ctrl + Z - undo
      if (mod && e.key.toLowerCase() === 'z') {
        if (isInputFocused()) return;
        e.preventDefault();
        onUndo?.();
        return;
      }

      // Escape
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }

      // Number shortcuts only when no input is focused
      if (!isInputFocused() && !mod && !e.altKey && !e.shiftKey) {
        const viewMap: Record<string, ViewType> = {
          '1': 'table',
          '2': 'kanban',
          '3': 'calendar',
        };
        const view = viewMap[e.key];
        if (view) {
          onViewChange?.(view);
          return;
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onSearch, onNewItem, onEscape, onViewChange, onUndo, onRedo]);
};
