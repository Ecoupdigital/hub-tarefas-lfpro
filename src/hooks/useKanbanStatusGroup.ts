import { useMemo } from 'react';
import type { Board, Column, Item, StatusLabel } from '@/types/board';

interface KanbanColumn {
  /** Chave do label (slug) ou '__none__' para items sem status. */
  key: string;
  /** Label visual. Para '__none__' usar 'Sem status'. */
  label: string;
  /** Cor semantica (Notion accent). Para '__none__' usar 'gray'. */
  color: string;
  items: Item[];
}

/**
 * Agrupa items do board por valor de uma coluna status escolhida.
 *
 * @param board    activeBoard do BoardContext
 * @param statusColumnId Id da coluna status. Se null, retorna [] (caller decide UI vazia).
 */
export function useKanbanStatusGroup(board: Board | null | undefined, statusColumnId: string | null) {
  return useMemo<{ columns: KanbanColumn[]; statusCol: Column | null }>(() => {
    if (!board || !statusColumnId) return { columns: [], statusCol: null };

    const statusCol = board.columns.find((c) => c.id === statusColumnId) ?? null;
    if (!statusCol || statusCol.type !== 'status') return { columns: [], statusCol: null };

    const labels = statusCol.settings?.labels ?? {};
    const labelKeys = Object.keys(labels);

    // Inicializa colunas em ordem dos labels
    const map = new Map<string, KanbanColumn>();
    labelKeys.forEach((k) => {
      const l = labels[k] as StatusLabel;
      map.set(k, { key: k, label: l.name, color: l.color || 'gray', items: [] });
    });
    map.set('__none__', { key: '__none__', label: 'Sem status', color: 'gray', items: [] });

    // Distribuir items
    board.groups.forEach((g) => {
      g.items.forEach((item) => {
        const val = item.columnValues?.[statusColumnId]?.value;
        const key = typeof val === 'string' && map.has(val) ? val : '__none__';
        map.get(key)!.items.push(item);
      });
    });

    // Filtrar coluna "Sem status" se vazia (Notion mostra so se ha items)
    const cols = Array.from(map.values()).filter(
      (c) => c.key !== '__none__' || c.items.length > 0
    );

    return { columns: cols, statusCol };
  }, [board, statusColumnId]);
}

/**
 * Resolve o statusColumnId default: primeira coluna de tipo 'status' do board.
 * Usado quando view.config.kanbanStatusColumnId nao esta seteado.
 */
export function getDefaultKanbanStatusColumnId(board: Board | null | undefined): string | null {
  if (!board) return null;
  const col = board.columns.find((c) => c.type === 'status');
  return col?.id ?? null;
}

export type { KanbanColumn };
