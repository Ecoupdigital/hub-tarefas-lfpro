import React, { useMemo } from 'react';
import type { WidgetConfig } from '@/hooks/useDashboardWidgets';
import type { Item, Column } from '@/types/board';
import type { DashboardFilter } from '@/context/DashboardFilterContext';

interface TableWidgetProps {
  items: Item[];
  columns: Column[];
  config: WidgetConfig;
  activeFilter?: DashboardFilter | null;
  onItemClick?: (item: Item) => void;
}

function getCellDisplayValue(item: Item, column: Column): string {
  const cv = item.columnValues[column.id];
  if (!cv) return '';

  // Use text representation if available
  if (cv.text) return cv.text;

  const val = cv.value;
  if (val == null) return '';

  // Status: resolve label name from settings
  if (column.type === 'status' && column.settings?.labels) {
    const label = column.settings.labels[String(val)];
    if (label) return label.name;
  }

  // People: join IDs (short display)
  if (Array.isArray(val)) {
    return val.join(', ');
  }

  // Link: show url or text
  if (typeof val === 'object' && val !== null) {
    if ('url' in val) return (val as any).text || (val as any).url || '';
    if ('totalSeconds' in val) {
      const secs = (val as any).totalSeconds || 0;
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    return JSON.stringify(val);
  }

  if (typeof val === 'boolean') return val ? 'Sim' : 'Nao';

  return String(val);
}

const TableWidget: React.FC<TableWidgetProps> = ({
  items,
  columns,
  config,
  activeFilter,
  onItemClick,
}) => {
  const visibleCols = useMemo(() => {
    if (config.visibleColumns && config.visibleColumns.length > 0) {
      return config.visibleColumns
        .map(id => columns.find(c => c.id === id))
        .filter(Boolean) as Column[];
    }
    return columns.slice(0, 4);
  }, [columns, config.visibleColumns]);

  const processedItems = useMemo(() => {
    let result = [...items];

    // Apply active cross-widget filter
    if (activeFilter) {
      result = result.filter(item => {
        const cv = item.columnValues[activeFilter.columnId];
        if (!cv) return false;
        return String(cv.value) === String(activeFilter.value);
      });
    }

    // Sort
    if (config.sortColumnId) {
      const dir = config.sortDirection === 'desc' ? -1 : 1;
      result.sort((a, b) => {
        if (config.sortColumnId === 'name') {
          return dir * a.name.localeCompare(b.name);
        }
        const va = a.columnValues[config.sortColumnId!]?.value;
        const vb = b.columnValues[config.sortColumnId!]?.value;
        if (va == null && vb == null) return 0;
        if (va == null) return dir;
        if (vb == null) return -dir;
        if (typeof va === 'number' && typeof vb === 'number') return dir * (va - vb);
        return dir * String(va).localeCompare(String(vb));
      });
    }

    // Limit
    const limit = config.rowLimit || 8;
    return result.slice(0, limit);
  }, [items, activeFilter, config.sortColumnId, config.sortDirection, config.rowLimit]);

  if (processedItems.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8 text-sm">
        Sem itens para exibir
      </p>
    );
  }

  return (
    <div className="overflow-auto max-h-[300px]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1.5 px-2 font-medium text-muted-foreground text-xs">
              Nome
            </th>
            {visibleCols.map(col => (
              <th
                key={col.id}
                className="text-left py-1.5 px-2 font-medium text-muted-foreground text-xs"
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processedItems.map(item => (
            <tr
              key={item.id}
              onClick={() => onItemClick?.(item)}
              className="border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <td className="py-1.5 px-2 font-medium truncate max-w-[180px]">
                {item.name}
              </td>
              {visibleCols.map(col => (
                <td
                  key={col.id}
                  className="py-1.5 px-2 text-muted-foreground truncate max-w-[150px]"
                >
                  {getCellDisplayValue(item, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableWidget;
