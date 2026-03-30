import React, { useState, useEffect } from 'react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, X, Clock, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import TimeScrollPicker from './TimeScrollPicker';

interface DateCellProps {
  value: string | undefined;
  onChange: (val: string) => void;
}

/** Parse date value supporting both legacy string and new JSON object format */
export function parseDateValue(value: string | undefined): { date: string; startTime: string; endTime: string } {
  if (!value) return { date: '', startTime: '', endTime: '' };
  const raw = typeof value === 'string' ? value.replace(/^"|"$/g, '') : '';
  if (!raw) return { date: '', startTime: '', endTime: '' };
  // Try JSON object
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object' && obj.date) {
      return { date: obj.date, startTime: obj.startTime || '', endTime: obj.endTime || '' };
    }
  } catch { /* not JSON */ }
  // String with time: "yyyy-MM-ddTHH:mm"
  if (raw.includes('T')) {
    return { date: raw.split('T')[0], startTime: raw.split('T')[1]?.substring(0, 5) || '', endTime: '' };
  }
  // Simple date string
  return { date: raw, startTime: '', endTime: '' };
}

/** Serialize date value - returns simple string for backward compat, JSON object when time exists */
export function serializeDateValue(date: string, startTime: string, endTime: string): string {
  if (!date) return '';
  if (!startTime && !endTime) return date; // Simple string for retrocompat
  return JSON.stringify({
    date,
    ...(startTime ? { startTime } : {}),
    ...(endTime ? { endTime } : {}),
  });
}

const getDateDisplayFormat = (): string => {
  const pref = localStorage.getItem('lfpro-date-format') || 'DD/MM/YYYY';
  switch (pref) {
    case 'MM/DD/YYYY': return 'MMM dd';
    case 'YYYY-MM-DD': return 'yyyy-MM-dd';
    case 'DD/MM/YYYY':
    default: return 'dd MMM';
  }
};

const DateCell: React.FC<DateCellProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);

  const { date: dateStr, startTime: initStart, endTime: initEnd } = parseDateValue(value);
  const [startTime, setStartTime] = useState(initStart);
  const [endTime, setEndTime] = useState(initEnd);
  const [showTime, setShowTime] = useState(!!initStart);

  // Sync when value changes externally
  useEffect(() => {
    const { date: _d, startTime: st, endTime: et } = parseDateValue(value);
    setStartTime(st);
    setEndTime(et);
    if (st) setShowTime(true);
  }, [value]);

  const dateObj = dateStr ? parseISO(dateStr) : null;
  const validDate = dateObj && !isNaN(dateObj.getTime()) ? dateObj : null;
  const overdue = validDate && isPast(validDate) && !isToday(validDate);
  const today = validDate && isToday(validDate);

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(serializeDateValue(format(day, 'yyyy-MM-dd'), startTime, endTime));
    } else {
      onChange('');
      setStartTime('');
      setEndTime('');
      setShowTime(false);
      setOpen(false);
    }
    // Do NOT close popover on day select - user may want to adjust time
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setStartTime('');
    setEndTime('');
    setShowTime(false);
    setOpen(false);
  };

  const handleStartTimeChange = (t: string) => {
    setStartTime(t);
    if (dateStr) onChange(serializeDateValue(dateStr, t, endTime));
  };

  const handleEndTimeChange = (t: string) => {
    setEndTime(t);
    if (dateStr) onChange(serializeDateValue(dateStr, startTime, t));
  };

  const handleClearTime = () => {
    handleStartTimeChange('');
    handleEndTimeChange('');
    setShowTime(false);
    if (dateStr) onChange(serializeDateValue(dateStr, '', ''));
  };

  const timeDisplay = startTime ? ` ${startTime}${endTime ? `-${endTime}` : ''}` : '';
  const headerText = validDate
    ? format(validDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) + timeDisplay
    : 'Selecione uma data';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-full h-full flex items-center justify-center gap-1 font-density-cell transition-[filter] duration-[70ms] hover:brightness-[0.95] group',
            overdue ? 'text-destructive font-medium' : today ? 'text-status-orange font-medium' : 'text-foreground'
          )}
        >
          {validDate ? (
            <>
              <CalendarIcon className="w-3 h-3 flex-shrink-0 opacity-50" />
              <span>{format(validDate, getDateDisplayFormat(), { locale: ptBR })}</span>
              {startTime && (
                <span className="text-muted-foreground/70 ml-0.5 text-[10px]">
                  {startTime}{endTime ? `-${endTime}` : ''}
                </span>
              )}
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClear(e as any); } }}
                className="ml-0.5 p-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity duration-[70ms] cursor-pointer"
                aria-label="Limpar data"
              >
                <X className="w-3 h-3" />
              </span>
            </>
          ) : (
            <span className="text-muted-foreground/40">--</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 shadow-ds-lg border border-border"
        align="center"
        side="bottom"
        sideOffset={4}
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {headerText}
          </span>
          {validDate && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => handleSelect(undefined)}>
              Limpar
            </Button>
          )}
        </div>

        {/* Time picker section */}
        <div className="px-3 pb-2 border-b border-border">
          <button
            onClick={() => setShowTime(!showTime)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full py-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {startTime
                ? `${startTime}${endTime ? ` - ${endTime}` : ''}`
                : 'Adicionar horario'}
            </span>
            <ChevronDown className={cn("w-3 h-3 ml-auto transition-transform", showTime && "rotate-180")} />
          </button>
          {showTime && (
            <div className="flex items-center gap-3 pt-2 pb-1">
              <div className="flex-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1 block">Inicio</span>
                <TimeScrollPicker value={startTime} onChange={handleStartTimeChange} placeholder="Inicio" />
              </div>
              <span className="text-muted-foreground mt-4">-</span>
              <div className="flex-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1 block">Fim</span>
                <TimeScrollPicker value={endTime} onChange={handleEndTimeChange} placeholder="Fim" />
              </div>
              {(startTime || endTime) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 mt-4"
                  onClick={handleClearTime}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        <Calendar
          mode="single"
          selected={validDate ?? undefined}
          onSelect={handleSelect}
          defaultMonth={validDate ?? new Date()}
          locale={ptBR}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

export default DateCell;
