import React, { useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isToday,
} from 'date-fns';
import { cn } from '@/lib/utils';
import NotionCalendarEvent from './NotionCalendarEvent';
import type { Item } from '@/types/board';
import type { CalendarItem } from './useCalendarItems';

interface NotionCalendarGridProps {
  currentMonth: Date;
  itemsByDate: Map<string, CalendarItem[]>;
  onItemClick: (item: Item) => void;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const NotionCalendarGrid: React.FC<NotionCalendarGridProps> = ({ currentMonth, itemsByDate, onItemClick }) => {
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const calStart = startOfWeek(start, { weekStartsOn: 0 });
    const calEnd = endOfWeek(end, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  return (
    <div className="grid grid-cols-7 border-t border-l" style={{ borderColor: 'var(--notion-border)' }}>
      {WEEKDAY_LABELS.map((wd) => (
        <div
          key={wd}
          className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide border-r border-b notion-header-bg"
          style={{ borderColor: 'var(--notion-border)', color: 'var(--notion-text-secondary)' }}
        >
          {wd}
        </div>
      ))}
      {days.map((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const events = itemsByDate.get(key) ?? [];
        const inMonth = isSameMonth(day, currentMonth);
        const today = isToday(day);
        return (
          <div
            key={key}
            className={cn('min-h-[90px] p-1.5 border-r border-b flex flex-col gap-1')}
            style={{
              borderColor: 'var(--notion-border)',
              backgroundColor: inMonth ? 'var(--notion-bg)' : 'var(--notion-panel)',
            }}
          >
            <div
              className={cn(
                'text-[11px] font-medium self-end px-1.5 py-0.5 rounded',
                today && 'text-white'
              )}
              style={{
                color: today ? 'white' : inMonth ? 'var(--notion-text-primary)' : 'var(--notion-text-tertiary)',
                backgroundColor: today ? 'var(--notion-blue)' : 'transparent',
                minWidth: '22px',
                textAlign: 'center',
              }}
            >
              {format(day, 'd')}
            </div>
            <div className="flex flex-col gap-0.5 overflow-hidden">
              {events.slice(0, 3).map((evt) => (
                <NotionCalendarEvent
                  key={evt.item.id}
                  item={evt.item}
                  color={evt.color}
                  statusName={evt.statusName}
                  onClick={() => onItemClick(evt.item)}
                />
              ))}
              {events.length > 3 && (
                <span className="text-[10px] notion-text-secondary px-1">+{events.length - 3} mais</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotionCalendarGrid;
