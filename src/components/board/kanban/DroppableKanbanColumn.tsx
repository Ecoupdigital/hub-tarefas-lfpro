import React from 'react';
import type { Item } from '@/types/board';
import { useDroppable } from '@dnd-kit/core';

// ── Droppable Column Wrapper ────────────────────────────────────────────
export const DroppableKanbanColumn: React.FC<{
  columnKey: string;
  children: React.ReactNode;
}> = ({ columnKey, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `kanban-col-${columnKey}` });
  return (
    <div ref={setNodeRef} className={`flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin transition-colors ${isOver ? 'bg-primary/5 ring-1 ring-primary/20 rounded' : ''}`}>
      {children}
    </div>
  );
};

// ── Drag Overlay Card ───────────────────────────────────────────────────
export const KanbanDragOverlay: React.FC<{ item: Item }> = ({ item }) => {
  return (
    <div className="bg-card rounded-md p-3 border border-primary/30 shadow-xl w-[260px] opacity-95 rotate-[2deg]">
      <p className="font-density-item font-medium text-foreground line-clamp-2">{item.name}</p>
    </div>
  );
};
