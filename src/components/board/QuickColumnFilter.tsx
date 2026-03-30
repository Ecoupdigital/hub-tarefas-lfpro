import React, { useState, useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useApp } from '@/context/AppContext';
import type { Column, ColumnValue } from '@/types/board';

interface QuickColumnFilterProps {
  column: Column;
}

const QuickColumnFilter: React.FC<QuickColumnFilterProps> = ({ column }) => {
  const { activeBoard, addFilter, removeFilter, advancedFilter, users } = useApp();
  const [open, setOpen] = useState(false);

  const activeFilter = advancedFilter.rules.find(r => r.columnId === column.id);

  // Extract unique values from all items for this column
  const uniqueValues = useMemo(() => {
    if (!activeBoard) return [];
    const valMap = new Map<string, { key: string; label: string; color?: string }>();

    for (const group of activeBoard.groups) {
      for (const item of group.items) {
        const cv = item.columnValues[column.id];
        if (!cv?.value) continue;
        const val = cv.value;

        switch (column.type) {
          case 'status': {
            // Formato migrado: {label: "Feito", color: "#00c875"}
            if (val && typeof val === 'object' && 'label' in val) {
              const labelText = String(val.label || '');
              if (labelText && !valMap.has(labelText)) {
                valMap.set(labelText, { key: labelText, label: labelText, color: val.color });
              }
            } else {
              // Formato legado: val é índice para settings.labels
              const label = column.settings.labels?.[val];
              if (label) {
                const labelName = String(label.name || label.label || val);
                valMap.set(String(val), { key: String(val), label: labelName, color: label.color });
              }
            }
            break;
          }
          case 'dropdown': {
            // Formato migrado: {values: ["Opção A", "Opção B"]}
            if (val && typeof val === 'object' && Array.isArray(val.values)) {
              for (const v of val.values) {
                const sv = String(v);
                if (sv && !valMap.has(sv)) valMap.set(sv, { key: sv, label: sv });
              }
            } else if (typeof val === 'string' && val.trim()) {
              valMap.set(val, { key: val, label: val });
            }
            break;
          }
          case 'people': {
            // Formato migrado: {userIds: ["uuid1", "uuid2"]}
            let ids: string[] = [];
            if (val && typeof val === 'object' && Array.isArray(val.userIds)) {
              ids = val.userIds;
            } else if (Array.isArray(val)) {
              ids = val;
            } else if (typeof val === 'string' && val.trim()) {
              ids = [val];
            }
            for (const id of ids) {
              if (id && !valMap.has(id)) {
                const user = users.find(u => u.id === id);
                valMap.set(id, { key: id, label: user?.name || id });
              }
            }
            break;
          }
          case 'tags': {
            const tags = Array.isArray(val) ? val : typeof val === 'string' ? val.split(',').map((t: string) => t.trim()) : [];
            for (const tag of tags) {
              if (tag && !valMap.has(tag)) {
                valMap.set(tag, { key: tag, label: tag });
              }
            }
            break;
          }
          case 'text':
          default: {
            if (val && typeof val === 'object') break; // ignorar objetos não mapeados
            const strVal = String(val);
            if (strVal.trim() && strVal !== '[object Object]' && !valMap.has(strVal)) {
              valMap.set(strVal, { key: strVal, label: strVal });
            }
            break;
          }
        }
      }
    }

    return Array.from(valMap.values())
      .filter(v => v.label != null)
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [activeBoard, column, users]);

  const handleToggleValue = (key: string) => {
    if (activeFilter?.value === key) {
      removeFilter(column.id);
    } else {
      addFilter({ columnId: column.id, value: key });
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFilter(column.id);
  };

  if (uniqueValues.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className={`p-0.5 rounded hover:bg-muted-foreground/10 transition-colors ${
            activeFilter ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'
          }`}
          title={`Filtrar por ${column.title}`}
        >
          <Filter className="w-2.5 h-2.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="start" onClick={e => e.stopPropagation()}>
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-1">
            <p className="font-density-tiny font-medium text-muted-foreground uppercase">{column.title}</p>
            {activeFilter && (
              <button onClick={handleClear} className="font-density-tiny text-destructive hover:underline">
                Limpar
              </button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {uniqueValues.map(v => {
              const isActive = activeFilter?.value === v.key;
              return (
                <button
                  key={v.key}
                  onClick={() => handleToggleValue(v.key)}
                  className={`flex items-center gap-2 w-full px-2 py-1 rounded font-density-cell transition-colors ${
                    isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    readOnly
                    className="w-3.5 h-3.5 rounded-[3px] border-muted-foreground/30 pointer-events-none"
                  />
                  {v.color && (
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: v.color }}
                    />
                  )}
                  <span className="truncate text-left">{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default QuickColumnFilter;
