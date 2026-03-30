import React, { useState } from 'react';
import { Layers, X, ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useApp } from '@/context/AppContext';
import type { ColumnType } from '@/types/board';

const GROUPABLE_TYPES: ColumnType[] = ['status', 'dropdown', 'people', 'tags', 'date'];

interface GroupBySelectorProps {
  groupByColumnId: string | null;
  onGroupByChange: (columnId: string | null) => void;
}

const GroupBySelector: React.FC<GroupBySelectorProps> = ({ groupByColumnId, onGroupByChange }) => {
  const { activeBoard } = useApp();
  const [open, setOpen] = useState(false);

  if (!activeBoard) return null;

  const groupableColumns = activeBoard.columns.filter(c => GROUPABLE_TYPES.includes(c.type));
  const activeColumn = groupableColumns.find(c => c.id === groupByColumnId);

  const handleSelect = (columnId: string) => {
    if (groupByColumnId === columnId) {
      onGroupByChange(null);
    } else {
      onGroupByChange(columnId);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onGroupByChange(null);
    setOpen(false);
  };

  if (groupableColumns.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-density-cell transition-colors ${
            groupByColumnId
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          {activeColumn ? `Agrupado: ${activeColumn.title}` : 'Agrupar'}
          {groupByColumnId && (
            <button onClick={handleClear} className="ml-0.5 p-0.5 rounded hover:bg-primary/20">
              <X className="w-2.5 h-2.5" />
            </button>
          )}
          {!groupByColumnId && <ChevronDown className="w-3 h-3" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="start">
        <div className="space-y-1">
          <p className="font-density-cell font-medium text-foreground mb-1.5">Agrupar por</p>
          {groupableColumns.map(col => {
            const isActive = groupByColumnId === col.id;
            return (
              <button
                key={col.id}
                onClick={() => handleSelect(col.id)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded font-density-cell transition-colors ${
                  isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                }`}
              >
                <span className="flex-1 text-left truncate">{col.title}</span>
                <span className="font-density-tiny text-muted-foreground capitalize">{col.type}</span>
                {isActive && <Check className="w-3 h-3 text-primary" />}
              </button>
            );
          })}
          {groupByColumnId && (
            <button
              onClick={() => { onGroupByChange(null); setOpen(false); }}
              className="w-full px-2 py-1.5 font-density-tiny text-destructive hover:underline text-left mt-1 border-t border-border pt-2"
            >
              Remover agrupamento
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GroupBySelector;
