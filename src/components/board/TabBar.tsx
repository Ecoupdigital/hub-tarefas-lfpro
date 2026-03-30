import React, { useCallback } from 'react';
import { X } from 'lucide-react';
import { useTab } from '@/context/TabContext';
import { useBoard } from '@/context/BoardContext';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, horizontalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableTab: React.FC<{
  tab: { id: string; boardId: string };
  isActive: boolean;
  boardName: string;
  boardColor: string;
  onSwitch: () => void;
  onClose: (e: React.MouseEvent) => void;
}> = ({ tab, isActive, boardName, boardColor, onSwitch, onClose }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSwitch}
      className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t cursor-pointer select-none transition-colors max-w-[180px] ${
        isActive
          ? 'bg-card border border-b-0 border-border text-foreground font-medium -mb-px z-10'
          : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
      }`}
      title={boardName}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: boardColor }}
      />
      <span className="text-xs truncate">{boardName}</span>
      <button
        onClick={onClose}
        className="ml-auto p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity flex-shrink-0"
        title="Fechar aba"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

const TabBar: React.FC = () => {
  const { tabs, activeTabId, hasMultipleTabs, switchTab, closeTab, reorderTabs } = useTab();
  const { boards } = useBoard();
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tabs.findIndex(t => t.id === active.id);
    const newIndex = tabs.findIndex(t => t.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderTabs(oldIndex, newIndex);
    }
  }, [tabs, reorderTabs]);

  const handleSwitch = useCallback((tabId: string, boardId: string) => {
    switchTab(tabId);
    navigate(`/board/${boardId}`, { replace: true });
  }, [switchTab, navigate]);

  const handleClose = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs.find(t => t.id === tabId);
    closeTab(tabId);
    // If we closed the last tab, navigate to home
    if (tabs.length <= 1) {
      navigate('/');
    }
  }, [closeTab, tabs, navigate]);

  if (!hasMultipleTabs) return null;

  return (
    <div className="flex items-end gap-0.5 px-4 pt-1 border-b border-border bg-muted/20 overflow-x-auto scrollbar-none">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tabs.map(t => t.id)} strategy={horizontalListSortingStrategy}>
          {tabs.map(tab => {
            const board = boards.find(b => b.id === tab.boardId);
            return (
              <SortableTab
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                boardName={board?.name || 'Board'}
                boardColor={board?.color || '#579BFC'}
                onSwitch={() => handleSwitch(tab.id, tab.boardId)}
                onClose={(e) => handleClose(e, tab.id)}
              />
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default TabBar;
