import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useUpdateColumnValue, useCreateItem } from '@/hooks/useSupabaseData';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isToday, isSameDay, parseISO, addMonths, subMonths,
  addWeeks, subWeeks
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type CalView = 'month' | 'week';

const BoardCalendar: React.FC = () => {
  const { activeBoard, setSelectedItem } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calView, setCalView] = useState<CalView>('month');
  const updateColVal = useUpdateColumnValue();
  const createItem = useCreateItem();
  const [dragItem, setDragItem] = useState<string | null>(null);

  const dateColumns = useMemo(() => {
    if (!activeBoard) return [];
    return activeBoard.columns.filter(c => c.type === 'date');
  }, [activeBoard]);

  const storageKey = activeBoard ? `lfpro-cal-datecol-${activeBoard.id}` : '';
  const [selectedDateColId, setSelectedDateColId] = useState<string | null>(() => {
    if (!storageKey) return null;
    return localStorage.getItem(storageKey);
  });

  const handleDateColChange = (colId: string) => {
    setSelectedDateColId(colId);
    if (storageKey) localStorage.setItem(storageKey, colId);
  };

  const dateCol = useMemo(() => {
    if (dateColumns.length === 0) return null;
    if (selectedDateColId) {
      const found = dateColumns.find(c => c.id === selectedDateColId);
      if (found) return found;
    }
    return dateColumns[0];
  }, [dateColumns, selectedDateColId]);

  const allItems = useMemo(() => {
    if (!activeBoard) return [];
    return activeBoard.groups.flatMap(g => g.items);
  }, [activeBoard]);

  if (!activeBoard) return null;
  if (!dateCol) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground font-density-cell">Adicione uma coluna de data para usar a visualização Calendário.</p>
      </div>
    );
  }

  const weekStartPref = localStorage.getItem('lfpro-week-start') || 'sunday';
  const weekStartsOn = weekStartPref === 'monday' ? 1 : 0;
  const weekOpts = { weekStartsOn } as { weekStartsOn: 0 | 1 };

  const getDays = () => {
    if (calView === 'week') {
      const wStart = startOfWeek(currentDate, weekOpts);
      const wEnd = endOfWeek(currentDate, weekOpts);
      return eachDayOfInterval({ start: wStart, end: wEnd });
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, weekOpts);
    const calEnd = endOfWeek(monthEnd, weekOpts);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  };

  const days = getDays();
  const allWeekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const weekDays = weekStartsOn === 1
    ? [...allWeekDays.slice(1), allWeekDays[0]]
    : allWeekDays;

  /** Extract the date portion from a column value (string or JSON object) */
  const extractDateStr = (val: any): string => {
    if (!val) return '';
    const raw = typeof val === 'string' ? val.replace(/^"|"$/g, '') : '';
    // Try JSON object with date field
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object' && obj.date) return obj.date;
    } catch { /* not JSON */ }
    return raw;
  };

  const getItemsForDay = (day: Date) =>
    allItems.filter(item => {
      const val = item.columnValues[dateCol.id]?.value;
      if (!val) return false;
      const dateStr = extractDateStr(val);
      if (!dateStr) return false;
      try { const d = parseISO(dateStr); return !isNaN(d.getTime()) && isSameDay(d, day); } catch { return false; }
    });

  const statusCol = activeBoard.columns.find(c => c.type === 'status');
  const getChipColor = (item: any) => {
    if (!statusCol) return 'hsl(var(--primary))';
    const val = item.columnValues[statusCol.id]?.value;
    const label = val ? statusCol.settings.labels?.[val] : null;
    return label?.color || 'hsl(var(--muted-foreground))';
  };

  const handleDropOnDay = (day: Date) => {
    if (!dragItem) return;
    // Preserve existing time when moving to a different day
    const item = allItems.find(i => i.id === dragItem);
    const currentVal = item?.columnValues[dateCol.id]?.value;
    let newValue: string = format(day, 'yyyy-MM-dd');
    if (currentVal) {
      const raw = typeof currentVal === 'string' ? currentVal.replace(/^"|"$/g, '') : '';
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' && obj.date) {
          obj.date = format(day, 'yyyy-MM-dd');
          newValue = JSON.stringify(obj);
        }
      } catch { /* simple string - use plain date */ }
    }
    updateColVal.mutate({ itemId: dragItem, columnId: dateCol.id, value: newValue });
    setDragItem(null);
  };

  const handleClickDay = (day: Date) => {
    const firstGroup = activeBoard.groups[0];
    if (!firstGroup) return;
    const name = `Novo item ${format(day, 'dd/MM')}`;
    createItem.mutate(
      { boardId: activeBoard.id, groupId: firstGroup.id, name },
      { onSuccess: (data) => { updateColVal.mutate({ itemId: data.id, columnId: dateCol.id, value: format(day, 'yyyy-MM-dd') }); } }
    );
  };

  const nav = (dir: 1 | -1) => {
    if (calView === 'week') setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  return (
    <div className="flex-1 overflow-auto p-4 bg-board-bg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-1)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <h2 className="font-density-cell font-bold text-foreground capitalize">
            {calView === 'month' ? format(currentDate, 'MMMM yyyy', { locale: ptBR }) : `Semana de ${format(startOfWeek(currentDate, weekOpts), 'dd/MM', { locale: ptBR })}`}
          </h2>
          <button onClick={() => nav(1)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          {/* Date column selector */}
          {dateColumns.length > 1 && (
            <div className="flex items-center gap-1.5 bg-muted rounded-md px-2.5 py-1">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={dateCol.id}
                onChange={e => handleDateColChange(e.target.value)}
                className="bg-transparent font-density-cell font-medium text-foreground outline-none cursor-pointer border-none pr-1"
              >
                {dateColumns.map(col => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>
          )}
          {/* Month / Week toggle */}
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <button onClick={() => setCalView('month')} className={`px-2.5 py-1 rounded font-density-cell font-medium transition-colors ${calView === 'month' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Mês</button>
            <button onClick={() => setCalView('week')} className={`px-2.5 py-1 rounded font-density-cell font-medium transition-colors ${calView === 'week' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Semana</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px mb-px">
        {weekDays.map(d => (
          <div key={d} className="text-center font-density-tiny font-semibold text-muted-foreground uppercase py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {days.map(day => {
          const dayItems = getItemsForDay(day);
          const inMonth = calView === 'week' || isSameMonth(day, currentDate);
          const today = isToday(day);
          return (
            <div key={day.toISOString()}
              className={`min-h-[100px] bg-card p-1.5 ${!inMonth ? 'opacity-40' : ''} ${calView === 'week' ? 'min-h-[200px]' : ''}`}
              onDragOver={e => e.preventDefault()} onDrop={() => handleDropOnDay(day)}
              onDoubleClick={() => handleClickDay(day)}>
              <div className={`font-density-cell font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${today ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, calView === 'week' ? 10 : 3).map(item => {
                  // Extract startTime for display
                  const val = item.columnValues[dateCol.id]?.value;
                  let chipTime = '';
                  if (val) {
                    try {
                      const raw = typeof val === 'string' ? val.replace(/^"|"$/g, '') : '';
                      const obj = JSON.parse(raw);
                      if (obj?.startTime) chipTime = obj.startTime;
                    } catch { /* no time */ }
                  }
                  return (
                    <button key={item.id} draggable onDragStart={() => setDragItem(item.id)} onDragEnd={() => setDragItem(null)}
                      onClick={() => setSelectedItem(item)}
                      className="w-full text-left px-1.5 py-0.5 rounded font-density-tiny font-medium text-white truncate transition-opacity hover:opacity-80"
                      style={{ backgroundColor: getChipColor(item) }}>
                      {chipTime && <span className="opacity-75 mr-0.5">{chipTime}</span>}
                      {item.name}
                    </button>
                  );
                })}
                {dayItems.length > (calView === 'week' ? 10 : 3) && (
                  <span className="font-density-badge text-muted-foreground px-1">+{dayItems.length - (calView === 'week' ? 10 : 3)} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BoardCalendar;
