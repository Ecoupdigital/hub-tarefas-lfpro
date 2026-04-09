import React from 'react';
import { GripVertical } from 'lucide-react';
import { Column, Item } from '@/types/board';
import { DEFAULT_NAME_COL_WIDTH } from './useColumnResize';

const NAME_COL_WIDTH_KEY = 'lfpro-name-col-width';

/** Drag overlay row shown while dragging an item */
export const DragOverlayRow: React.FC<{ item: Item; columns: Column[] }> = ({ item, columns }) => {
  const nameWidth = (() => { const s = localStorage.getItem(NAME_COL_WIDTH_KEY); return s ? parseInt(s, 10) : DEFAULT_NAME_COL_WIDTH; })();
  return (
    <div className="flex items-stretch border border-primary/30 bg-card shadow-lg rounded density-row opacity-90 w-max">
      <div className="flex items-center border-r border-cell-border px-2" style={{ minWidth: nameWidth, width: nameWidth }}>
        <GripVertical className="w-3 h-3 text-primary mr-2" />
        <span className="font-density-item text-foreground truncate">{item.name}</span>
      </div>
      {columns.map(col => (
        <div key={col.id} className="border-r border-cell-border flex items-center justify-center" style={{ minWidth: col.width, width: col.width }}>
          <span className="font-density-cell text-muted-foreground">&mdash;</span>
        </div>
      ))}
    </div>
  );
};
