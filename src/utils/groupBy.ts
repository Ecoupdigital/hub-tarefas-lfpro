import type { Column, Item, ColumnValue } from '@/types/board';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface DynamicGroup {
  key: string;
  label: string;
  color?: string;
  items: Item[];
}

/**
 * Groups items by a column's values, producing dynamic groups.
 * Supports: status, dropdown, people, tags, date (by month).
 */
export function groupItemsByColumn(
  items: Item[],
  columnId: string,
  columnValues: Record<string, Record<string, ColumnValue>>,
  columns: Column[],
  users?: { id: string; name: string }[],
): DynamicGroup[] {
  const column = columns.find(c => c.id === columnId);
  if (!column) return [{ key: '__all', label: 'Todos', items }];

  const groupMap = new Map<string, { label: string; color?: string; items: Item[] }>();
  const ungrouped: Item[] = [];

  for (const item of items) {
    const cv = item.columnValues[columnId];
    const val = cv?.value;

    if (val == null || val === '') {
      ungrouped.push(item);
      continue;
    }

    switch (column.type) {
      case 'status': {
        const label = column.settings.labels?.[val];
        const key = String(val);
        if (label) {
          if (!groupMap.has(key)) {
            groupMap.set(key, { label: label.name, color: label.color, items: [] });
          }
          groupMap.get(key)!.items.push(item);
        } else {
          ungrouped.push(item);
        }
        break;
      }

      case 'dropdown': {
        const key = String(val);
        if (!groupMap.has(key)) {
          groupMap.set(key, { label: key, items: [] });
        }
        groupMap.get(key)!.items.push(item);
        break;
      }

      case 'people': {
        const ids = Array.isArray(val) ? val : [val];
        if (ids.length === 0) {
          ungrouped.push(item);
        } else {
          for (const id of ids) {
            const user = users?.find(u => u.id === id);
            const key = String(id);
            if (!groupMap.has(key)) {
              groupMap.set(key, { label: user?.name || key, items: [] });
            }
            groupMap.get(key)!.items.push(item);
          }
        }
        break;
      }

      case 'tags': {
        const tags = Array.isArray(val) ? val : typeof val === 'string' ? val.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
        if (tags.length === 0) {
          ungrouped.push(item);
        } else {
          for (const tag of tags) {
            if (!groupMap.has(tag)) {
              groupMap.set(tag, { label: tag, items: [] });
            }
            groupMap.get(tag)!.items.push(item);
          }
        }
        break;
      }

      case 'date': {
        try {
          const date = new Date(val);
          if (isNaN(date.getTime())) {
            ungrouped.push(item);
          } else {
            const monthKey = format(date, 'yyyy-MM');
            const monthLabel = format(date, "MMMM 'de' yyyy", { locale: ptBR });
            if (!groupMap.has(monthKey)) {
              groupMap.set(monthKey, { label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), items: [] });
            }
            groupMap.get(monthKey)!.items.push(item);
          }
        } catch {
          ungrouped.push(item);
        }
        break;
      }

      default: {
        const key = String(val);
        if (!groupMap.has(key)) {
          groupMap.set(key, { label: key, items: [] });
        }
        groupMap.get(key)!.items.push(item);
        break;
      }
    }
  }

  const groups: DynamicGroup[] = Array.from(groupMap.entries()).map(([key, g]) => ({
    key,
    label: g.label,
    color: g.color,
    items: g.items,
  }));

  // Sort groups alphabetically, with date groups sorted chronologically
  if (column.type === 'date') {
    groups.sort((a, b) => a.key.localeCompare(b.key));
  } else {
    groups.sort((a, b) => a.label.localeCompare(b.label));
  }

  // Add ungrouped at the end
  if (ungrouped.length > 0) {
    groups.push({ key: '__ungrouped', label: 'Sem valor', items: ungrouped });
  }

  return groups;
}
