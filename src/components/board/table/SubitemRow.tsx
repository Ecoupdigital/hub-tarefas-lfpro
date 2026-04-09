import React, { useState, useRef } from 'react';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { GripVertical } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useSelection } from '@/context/SelectionContext';
import { Column } from '@/types/board';
import { renderCellByType } from './renderCellByType';
import { CellErrorFallback } from './TableItemRow';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SubitemRowProps {
  subitem: any;
  columns: Column[];
  getColumnWidth: (col: Column) => number;
  parentItem?: any;
  allItemIds: string[];
}

export const SubitemRow: React.FC<SubitemRowProps> = ({ subitem, columns, getColumnWidth, parentItem, allItemIds }) => {
  const { updateItemColumnValue, updateItemName, setSelectedItem, setSelectedItemWithStack } = useApp();
  const { isSelected, toggleItem, selectRange, lastSelectedId, setLastSelectedId } = useSelection();
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(subitem.name);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subitem.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const selected = isSelected(subitem.id);

  const handleOpen = () => {
    if (parentItem) {
      setSelectedItemWithStack(subitem, [parentItem]);
    } else {
      setSelectedItem(subitem);
    }
  };

  const handleCheckboxChange = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.shiftKey && lastSelectedId && lastSelectedId !== subitem.id) {
      selectRange(allItemIds, lastSelectedId, subitem.id);
    } else {
      toggleItem(subitem.id);
    }
    setLastSelectedId(subitem.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/subrow flex items-stretch border-b border-cell-border hover:bg-row-hover/40 transition-colors density-row-sub bg-muted/20 ${selected ? 'bg-primary/5' : ''}`}
    >
      <div className="sticky left-0 z-20 bg-card group-hover/subrow:bg-row-hover/40 transition-colors flex items-center min-w-[320px] w-[320px] border-r border-cell-border pl-6 pr-2">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/30 hover:text-muted-foreground transition-colors flex-shrink-0"
        >
          <GripVertical className="w-3 h-3" />
        </span>
        <input
          type="checkbox"
          checked={selected}
          onClick={handleCheckboxChange}
          readOnly
          className="w-4 h-4 rounded-[3px] border-muted-foreground/30 mx-1.5 cursor-pointer flex-shrink-0"
        />
        {editingName ? (
          <input value={tempName} onChange={(e) => setTempName(e.target.value)} autoFocus
            onBlur={() => { updateItemName(subitem.id, tempName); setEditingName(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { updateItemName(subitem.id, tempName); setEditingName(false); } if (e.key === 'Escape') { setTempName(subitem.name); setEditingName(false); } }}
            className="flex-1 bg-transparent font-density-cell text-foreground outline-none border-b border-primary" />
        ) : (
          <button
            onClick={() => {
              if (clickTimerRef.current) return;
              clickTimerRef.current = setTimeout(() => { clickTimerRef.current = null; handleOpen(); }, 250);
            }}
            onDoubleClick={() => {
              if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
              setTempName(subitem.name); setEditingName(true);
            }}
            className="flex-1 text-left font-density-cell text-muted-foreground hover:text-foreground truncate transition-colors">
            &#8627; {subitem.name}
          </button>
        )}
      </div>
      {columns.map(col => {
        const cv = subitem.columnValues?.[col.id];
        const val = cv?.value;
        const w = getColumnWidth(col);
        return (
          <div key={col.id} className="border-r border-cell-border flex items-center justify-center" style={{ minWidth: w, width: w }}>
            <ErrorBoundary fallback={<CellErrorFallback />}>
              {renderCellByType(col, val, (v) => updateItemColumnValue(subitem.id, col.id, { value: v }), { itemId: subitem.id })}
            </ErrorBoundary>
          </div>
        );
      })}
      <div className="min-w-[40px]" />
    </div>
  );
};
