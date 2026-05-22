import React, { useMemo } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import NotionCalendarEvent from './NotionCalendarEvent';
import type { Item } from '@/types/board';
import type { CalendarItem } from './useCalendarItems';

interface Props {
  currentDate: Date;
  itemsByDate: Map<string, CalendarItem[]>;
  onItemClick: (item: Item) => void;
}

const NotionCalendarWeek: React.FC<Props> = ({ currentDate, itemsByDate, onItemClick }) => {
  const days = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  return (
    <div className="grid grid-cols-7 border-t border-l" style={{ borderColor: 'var(--notion-border)' }}>
      {days.map((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const events = itemsByDate.get(key) ?? [];
        const today = isToday(day);
        return (
          <div
            key={key}
            className="min-h-[300px] p-2 border-r border-b flex flex-col gap-1"
            style={{ borderColor: 'var(--notion-border)', backgroundColor: 'var(--notion-bg)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] notion-text-secondary uppercase font-medium">
                {format(day, 'EEE', { locale: ptBR })}
              </span>
              <span
                className={cn('text-sm font-semibold px-1.5 py-0.5 rounded', today && 'text-white')}
                style={{
                  color: today ? 'white' : 'var(--notion-text-primary)',
                  backgroundColor: today ? 'var(--notion-blue)' : 'transparent',
                }}
              >
                {format(day, 'd')}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 overflow-y-auto">
              {events.map((evt) => (
                <NotionCalendarEvent
                  key={evt.item.id}
                  item={evt.item}
                  color={evt.color}
                  statusName={evt.statusName}
                  onClick={() => onItemClick(evt.item)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotionCalendarWeek;
