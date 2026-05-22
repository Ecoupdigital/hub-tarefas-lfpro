import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { StatusPill, PersonAvatar } from './notionInlineCell';
import type { Column, Item, StatusLabel } from '@/types/board';

interface Profile {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
}

interface NotionKanbanCardProps {
  item: Item;
  visibleColumns: Column[];
  profiles: Profile[];
  onClick: () => void;
}

/**
 * Card Notion-style. Linha 1: nome. Linhas seguintes: ate 3 props (status pill,
 * data formatada, avatares people). Outras props (text, number, dropdown) viram
 * texto pequeno. Click abre ItemDetailPanel.
 *
 * Drag via dnd-kit: `useDraggable({ id: item.id, data: { itemId, currentStatus } })`.
 */
const NotionKanbanCard: React.FC<NotionKanbanCardProps> = ({ item, visibleColumns, profiles, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${item.id}`,
    data: { itemId: item.id },
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: 'var(--notion-bg)',
    borderColor: 'var(--notion-border)',
    padding: 'var(--notion-kanban-card-padding)',
  };

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      className="rounded-md border cursor-pointer notion-hover transition-shadow hover:shadow-sm"
      style={style}
    >
      <div className="text-sm font-medium mb-1.5" style={{ color: 'var(--notion-text-primary)' }}>
        {item.name || <span className="notion-text-tertiary">Sem titulo</span>}
      </div>
      <div className="flex flex-col gap-1">
        {visibleColumns.slice(0, 3).map((col) => {
          const raw = item.columnValues?.[col.id]?.value;
          if (raw === null || raw === undefined || raw === '') return null;

          if (col.type === 'status') {
            const label = col.settings?.labels?.[raw as string] as StatusLabel | undefined;
            return label ? <StatusPill key={col.id} label={label} /> : null;
          }

          if (col.type === 'date') {
            const dateStr = typeof raw === 'string' ? raw : '';
            if (!dateStr) return null;
            try {
              const d = parseISO(dateStr);
              return (
                <div key={col.id} className="flex items-center gap-1 text-[11px] notion-text-secondary">
                  <Calendar className="w-3 h-3" />
                  <span>{format(d, "d 'de' MMM", { locale: ptBR })}</span>
                </div>
              );
            } catch {
              return null;
            }
          }

          if (col.type === 'people') {
            const ids = Array.isArray(raw) ? raw : [];
            if (ids.length === 0) return null;
            return (
              <div key={col.id} className="flex items-center gap-0.5">
                {ids.slice(0, 3).map((id) => (
                  <PersonAvatar key={id} profile={profileMap.get(id)} />
                ))}
                {ids.length > 3 && (
                  <span className="text-[10px] notion-text-secondary ml-1">+{ids.length - 3}</span>
                )}
              </div>
            );
          }

          // text/number/dropdown/long_text/checkbox: texto sutil
          const display =
            col.type === 'checkbox' ? (raw ? '✓' : '') :
            col.type === 'long_text' ? String(raw).slice(0, 60) :
            String(raw);
          return (
            <div key={col.id} className="text-[11px] notion-text-secondary truncate">
              <span className="notion-text-tertiary">{col.title}: </span>
              {display}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotionKanbanCard;
