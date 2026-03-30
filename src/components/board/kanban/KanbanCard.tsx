import React, { useMemo } from 'react';
import type { Item, StatusLabel, Column } from '@/types/board';
import type { KanbanSettings } from './KanbanTypes';
import { Layers, AlertTriangle, GripVertical } from 'lucide-react';
import SortableItem from '@/components/dnd/SortableItem';

const AVATAR_COLORS = ['#579BFC', '#FF642E', '#00C875', '#A25DDC', '#FDAB3D'];

const SortableKanbanCard: React.FC<{
  item: Item;
  statusLabel: StatusLabel | null;
  onClick: () => void;
  visibleFields: KanbanSettings['visibleFields'];
  peopleCol: Column | null;
  dateCol: Column | null;
  progressCol: Column | null;
  tagsCol: Column | null;
  users: Array<{ id: string; name: string; email: string; avatarUrl?: string }>;
}> = ({ item, statusLabel, onClick, visibleFields, peopleCol, dateCol, progressCol, tagsCol, users }) => {
  const hasSubitems = item.subitems && item.subitems.length > 0;
  const subitemsDone = hasSubitems ? item.subitems!.filter(s => s.status === 'done').length : 0;
  const subitemsTotal = hasSubitems ? item.subitems!.length : 0;
  const subitemsPercent = subitemsTotal > 0 ? Math.round((subitemsDone / subitemsTotal) * 100) : 0;

  // Date analysis
  const rawDate = dateCol ? item.columnValues[dateCol.id]?.value : null;
  const parsedDate = useMemo(() => {
    if (!rawDate) return null;
    const cleaned = typeof rawDate === 'string' ? rawDate.replace(/^"|"$/g, '') : '';
    if (!cleaned) return null;
    try {
      const d = new Date(cleaned);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }, [rawDate]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isOverdue = parsedDate ? parsedDate < today : false;
  const isToday = parsedDate ? parsedDate.toDateString() === new Date().toDateString() : false;

  // People
  const peopleValue = peopleCol ? item.columnValues[peopleCol.id]?.value : null;
  const selectedPeople = useMemo(() => {
    if (!peopleValue || !Array.isArray(peopleValue)) return [];
    return users.filter(u => peopleValue.includes(u.id));
  }, [peopleValue, users]);

  // Tags
  const tagsValue = tagsCol ? item.columnValues[tagsCol.id]?.value : null;
  const tags = useMemo(() => {
    if (!tagsValue) return [];
    if (Array.isArray(tagsValue)) return tagsValue.map(String);
    if (typeof tagsValue === 'string') return tagsValue.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  }, [tagsValue]);

  // Progress
  const progressValue = progressCol ? item.columnValues[progressCol.id]?.value : null;
  const progressNum = typeof progressValue === 'number' ? progressValue : (typeof progressValue === 'string' ? parseFloat(progressValue) : null);

  return (
    <SortableItem id={item.id}>
      {({ attributes, listeners, setNodeRef, isDragging, style }) => (
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          onClick={onClick}
          className={`kanban-card-animate kanban-card-hover relative bg-card rounded-md border shadow-sm cursor-pointer overflow-hidden group/card ${isDragging ? 'opacity-40 scale-95 border-primary shadow-lg' : 'border-border'}`}
        >
          {/* Color strip */}
          {visibleFields.statusIndicator && statusLabel && (
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
              style={{ backgroundColor: statusLabel.color }}
            />
          )}

          <div className={`p-3 ${visibleFields.statusIndicator && statusLabel ? 'pl-4' : ''}`}>
            {/* Drag handle + Item name */}
            <div className="flex items-start gap-1.5">
              <div
                className="mt-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0"
                {...listeners}
              >
                <GripVertical className="w-3 h-3 text-muted-foreground" />
              </div>
              {visibleFields.name && (
                <p className="font-density-item font-medium text-foreground mb-1.5 line-clamp-2 pr-1 flex-1">{item.name}</p>
              )}
            </div>

            {/* Tags */}
            {visibleFields.tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="font-density-badge px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground font-medium">
                    {tag}
                  </span>
                ))}
                {tags.length > 3 && (
                  <span className="font-density-badge px-1 py-0.5 text-muted-foreground">+{tags.length - 3}</span>
                )}
              </div>
            )}

            {/* Progress bar */}
            {visibleFields.progress && progressNum != null && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressNum}%`,
                      backgroundColor: progressNum >= 100 ? '#00C875' : progressNum >= 50 ? '#FDAB3D' : '#579BFC',
                    }}
                  />
                </div>
                <span className="font-density-badge text-muted-foreground font-medium w-7 text-right">{Math.round(progressNum)}%</span>
              </div>
            )}

            {/* Subitems progress */}
            {visibleFields.subitems && hasSubitems && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${subitemsPercent}%` }}
                  />
                </div>
                <span className="font-density-badge text-muted-foreground">{subitemsDone}/{subitemsTotal}</span>
              </div>
            )}

            {/* Bottom row: date + people */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1.5">
                {/* Date chip */}
                {visibleFields.date && parsedDate && (
                  <span className={`font-density-tiny px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-0.5 ${
                    isOverdue ? 'bg-destructive/15 text-destructive' : isToday ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-muted text-muted-foreground'
                  }`}>
                    {isOverdue && <AlertTriangle className="w-2.5 h-2.5" />}
                    {parsedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>

              {/* People avatars (bottom-right) */}
              {visibleFields.person && selectedPeople.length > 0 && (
                <div className="flex -space-x-1.5">
                  {selectedPeople.slice(0, 3).map((u, i) => (
                    <div
                      key={u.id}
                      className="w-6 h-6 rounded-full flex items-center justify-center font-density-badge font-bold ring-2 ring-card"
                      style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length], color: '#fff' }}
                      title={u.name}
                    >
                      {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {selectedPeople.length > 3 && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center font-density-badge font-bold ring-2 ring-card bg-muted text-muted-foreground">
                      +{selectedPeople.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card footer: subitems preview */}
          {hasSubitems && (
            <div className="flex items-center gap-1 px-3 pb-2 pt-1 border-t border-border/50">
              <Layers className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="font-density-tiny text-muted-foreground truncate flex-1">
                {subitemsDone}/{subitemsTotal} subitem{subitemsTotal !== 1 ? 's' : ''}
              </span>
              <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${subitemsPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Hover actions button (top-right) */}
          <button
            className="absolute top-1.5 right-1.5 p-0.5 rounded opacity-0 group-hover/card:opacity-100 transition-opacity bg-muted/80 hover:bg-muted text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); }}
            title="Acoes"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
              <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
            </svg>
          </button>
        </div>
      )}
    </SortableItem>
  );
};

export default SortableKanbanCard;
