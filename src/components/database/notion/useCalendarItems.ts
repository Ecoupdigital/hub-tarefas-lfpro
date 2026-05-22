import { useMemo } from 'react';
import { parseISO, isValid } from 'date-fns';
import type { Board, Item, StatusLabel } from '@/types/board';

interface CalendarItem {
  item: Item;
  /** ISO yyyy-mm-dd (sem timezone). */
  dateKey: string;
  /** Cor semantica para a pilula (notion-status-*). 'gray' como fallback. */
  color: string;
  /** Nome do label do status (pra tooltip). */
  statusName?: string;
}

/**
 * Le date-string de um column_value (suporta legacy: string "YYYY-MM-DD" ou objeto { date }).
 */
function parseDateValue(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const d = parseISO(raw);
    return isValid(d) ? raw.slice(0, 10) : null;
  }
  if (typeof raw === 'object' && raw !== null && 'date' in (raw as Record<string, unknown>)) {
    const dateStr = (raw as { date?: string }).date;
    if (typeof dateStr === 'string') {
      const d = parseISO(dateStr);
      return isValid(d) ? dateStr.slice(0, 10) : null;
    }
  }
  return null;
}

/**
 * Agrupa items por dia, usando coluna de data eleita. Resolve cor pelo status.
 */
export function useCalendarItems(
  board: Board | null | undefined,
  dateColumnId: string | null,
  statusColumnId: string | null
) {
  return useMemo(() => {
    if (!board || !dateColumnId) return new Map<string, CalendarItem[]>();

    const statusCol = statusColumnId ? board.columns.find((c) => c.id === statusColumnId) : null;
    const labels = (statusCol?.settings?.labels ?? {}) as Record<string, StatusLabel>;

    const map = new Map<string, CalendarItem[]>();

    board.groups.forEach((g) => {
      g.items.forEach((item) => {
        const raw = item.columnValues?.[dateColumnId]?.value;
        const dateKey = parseDateValue(raw);
        if (!dateKey) return;

        const statusVal = statusCol ? item.columnValues?.[statusCol.id]?.value : null;
        const label = typeof statusVal === 'string' ? labels[statusVal] : undefined;

        const entry: CalendarItem = {
          item,
          dateKey,
          color: label?.color || 'gray',
          statusName: label?.name,
        };

        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(entry);
      });
    });

    return map;
  }, [board, dateColumnId, statusColumnId]);
}

/**
 * Default: 1a coluna de tipo 'date'.
 */
export function getDefaultDateColumnId(board: Board | null | undefined): string | null {
  return board?.columns.find((c) => c.type === 'date')?.id ?? null;
}

/**
 * Default: 1a coluna de tipo 'status'.
 */
export function getDefaultStatusColumnIdForCalendar(board: Board | null | undefined): string | null {
  return board?.columns.find((c) => c.type === 'status')?.id ?? null;
}

export type { CalendarItem };
