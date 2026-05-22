import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import NotionKanbanCard from './NotionKanbanCard';
import type { Column, Item } from '@/types/board';
import type { KanbanColumn } from '@/hooks/useKanbanStatusGroup';

interface Profile {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
}

interface NotionKanbanColumnProps {
  column: KanbanColumn;
  visibleColumns: Column[];
  profiles: Profile[];
  onCardClick: (item: Item) => void;
  onCreate: (statusKey: string, name: string) => void;
}

const NotionKanbanColumn: React.FC<NotionKanbanColumnProps> = ({
  column,
  visibleColumns,
  profiles,
  onCardClick,
  onCreate,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.key}`,
    data: { statusKey: column.key },
  });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (name.trim()) onCreate(column.key, name.trim());
    setName('');
    setCreating(false);
  };

  return (
    <div
      ref={setNodeRef}
      className="w-72 shrink-0 rounded-md p-2 flex flex-col gap-2"
      style={{
        backgroundColor: 'var(--notion-panel)',
        outline: isOver ? '2px solid var(--notion-blue)' : 'none',
      }}
    >
      <div className="flex items-center justify-between px-1 py-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: `var(--notion-status-${column.color}, var(--notion-status-gray))` }}
          />
          <span className="text-xs font-medium" style={{ color: 'var(--notion-text-secondary)' }}>
            {column.label}
          </span>
          <span className="text-[11px] notion-text-tertiary">({column.items.length})</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 min-h-[40px]">
        {column.items.map((item) => (
          <NotionKanbanCard
            key={item.id}
            item={item}
            visibleColumns={visibleColumns}
            profiles={profiles}
            onClick={() => onCardClick(item)}
          />
        ))}
      </div>

      {creating ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') { setName(''); setCreating(false); }
          }}
          placeholder="Nome do item"
          className="w-full bg-transparent border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[var(--notion-blue)]"
          style={{ borderColor: 'var(--notion-border)', color: 'var(--notion-text-primary)' }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-1.5 py-1 text-xs notion-text-secondary notion-hover rounded w-full text-left"
        >
          <Plus className="w-3 h-3" />
          Nova
        </button>
      )}
    </div>
  );
};

export default NotionKanbanColumn;
