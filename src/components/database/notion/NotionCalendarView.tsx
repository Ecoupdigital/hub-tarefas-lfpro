import React, { useState, useMemo } from 'react';
import { addMonths, addWeeks, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useBoardViews } from '@/hooks/useBoardViews';
import NotionCalendarGrid from './NotionCalendarGrid';
import NotionCalendarWeek from './NotionCalendarWeek';
import {
  useCalendarItems,
  getDefaultDateColumnId,
  getDefaultStatusColumnIdForCalendar,
} from './useCalendarItems';
import type { Item } from '@/types/board';

interface NotionCalendarViewProps {
  mode?: 'database' | 'board';
}

type CalendarMode = 'month' | 'week';

const NotionCalendarView: React.FC<NotionCalendarViewProps> = ({ mode = 'database' }) => {
  const { activeBoard, setSelectedItem } = useApp();
  const { data: views = [] } = useBoardViews(activeBoard?.id ?? null);

  const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()));
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('month');

  // Resolve coluna de data e status: view.config > defaults
  const { dateColumnId, statusColumnId } = useMemo(() => {
    if (!activeBoard) return { dateColumnId: null, statusColumnId: null };
    const calView = views.find((v) => v.view_type === 'calendar');
    const cfg = (calView?.config as Record<string, unknown> | null | undefined) ?? {};
    const cfgDate = typeof cfg.calendarDateColumnId === 'string' ? cfg.calendarDateColumnId : null;
    const cfgStatus = typeof cfg.calendarStatusColumnId === 'string' ? cfg.calendarStatusColumnId : null;
    return {
      dateColumnId:
        cfgDate && activeBoard.columns.some((c) => c.id === cfgDate && c.type === 'date')
          ? cfgDate
          : getDefaultDateColumnId(activeBoard),
      statusColumnId:
        cfgStatus && activeBoard.columns.some((c) => c.id === cfgStatus && c.type === 'status')
          ? cfgStatus
          : getDefaultStatusColumnIdForCalendar(activeBoard),
    };
  }, [activeBoard, views]);

  const itemsByDate = useCalendarItems(activeBoard ?? null, dateColumnId, statusColumnId);

  if (!activeBoard) {
    return <div className="p-4 text-sm notion-text-secondary">Carregando calendario...</div>;
  }

  if (!dateColumnId) {
    return (
      <div className="p-6 text-center text-sm notion-text-secondary">
        Calendario precisa de uma coluna de tipo "Date" no board.
      </div>
    );
  }

  const handleNav = (delta: number) => {
    setCurrentDate((d) =>
      calendarMode === 'month' ? addMonths(d, delta) : addWeeks(d, delta)
    );
  };

  const handleToday = () => setCurrentDate(startOfMonth(new Date()));

  const handleItemClick = (item: Item) => setSelectedItem(item);

  const containerClass =
    mode === 'database'
      ? 'max-h-[640px] overflow-auto'
      : 'h-full overflow-auto';

  return (
    <div className={containerClass} style={{ backgroundColor: 'var(--notion-bg)' }}>
      <div
        className="flex items-center justify-between px-3 py-2 border-b sticky top-0 z-10"
        style={{ borderColor: 'var(--notion-border)', backgroundColor: 'var(--notion-bg)' }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleNav(-1)}
            className="p-1 rounded notion-hover"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleNav(1)}
            className="p-1 rounded notion-hover"
            aria-label="Proximo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-2 py-0.5 text-xs rounded border notion-hover"
            style={{ borderColor: 'var(--notion-border)', color: 'var(--notion-text-secondary)' }}
          >
            Hoje
          </button>
          <span className="ml-2 text-sm font-medium" style={{ color: 'var(--notion-text-primary)' }}>
            {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-md border"
          style={{ borderColor: 'var(--notion-border)' }}
        >
          {(['month', 'week'] as CalendarMode[]).map((m) => {
            const active = calendarMode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setCalendarMode(m)}
                className="px-2 py-0.5 text-[11px] rounded transition-colors"
                style={{
                  backgroundColor: active ? 'var(--notion-panel)' : 'transparent',
                  color: active ? 'var(--notion-text-primary)' : 'var(--notion-text-secondary)',
                }}
              >
                {m === 'month' ? 'Mes' : 'Semana'}
              </button>
            );
          })}
        </div>
      </div>

      {calendarMode === 'month' ? (
        <NotionCalendarGrid
          currentMonth={currentDate}
          itemsByDate={itemsByDate}
          onItemClick={handleItemClick}
        />
      ) : (
        <NotionCalendarWeek
          currentDate={currentDate}
          itemsByDate={itemsByDate}
          onItemClick={handleItemClick}
        />
      )}
    </div>
  );
};

export default NotionCalendarView;
