import React, { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'lucide-react';

interface TimelineCellProps {
  value: { start: string; end: string } | undefined;
  onChange: (val: { start: string; end: string }) => void;
  color?: string;
}

const TimelineCell: React.FC<TimelineCellProps> = ({ value, onChange, color = 'hsl(var(--primary))' }) => {
  const [editing, setEditing] = useState(false);
  const [startDate, setStartDate] = useState(value?.start || '');
  const [endDate, setEndDate] = useState(value?.end || '');

  const parsedStart = value?.start ? parseISO(value.start) : null;
  const parsedEnd = value?.end ? parseISO(value.end) : null;
  const validStart = parsedStart && !isNaN(parsedStart.getTime()) ? parsedStart : null;
  const validEnd = parsedEnd && !isNaN(parsedEnd.getTime()) ? parsedEnd : null;

  const duration = validStart && validEnd ? differenceInDays(validEnd, validStart) + 1 : 0;
  const barWidth = Math.min(Math.max(duration * 4, 20), 100);

  const handleSave = () => {
    if (startDate && endDate) {
      onChange({ start: startDate, end: endDate });
    }
    setEditing(false);
  };

  return (
    <div className="relative w-full h-full">
      <button
        onClick={() => {
          setStartDate(value?.start || '');
          setEndDate(value?.end || '');
          setEditing(true);
        }}
        className="w-full h-full flex items-center justify-center px-1"
      >
        {validStart && validEnd ? (
          <div className="flex flex-col items-center gap-0.5 w-full">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                backgroundColor: color,
                width: `${barWidth}%`,
                minWidth: '20px',
              }}
            />
            <span className="font-density-badge text-muted-foreground whitespace-nowrap">
              {format(validStart, 'dd MMM', { locale: ptBR })} - {format(validEnd, 'dd MMM', { locale: ptBR })}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground/40 font-density-cell flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            —
          </span>
        )}
      </button>
      {editing && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setEditing(false)} />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[240px] animate-fade-in">
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-muted rounded px-2 py-1 font-density-cell text-foreground outline-none mt-0.5"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-muted rounded px-2 py-1 font-density-cell text-foreground outline-none mt-0.5"
                />
              </div>
              <div className="flex gap-1 justify-end">
                <button
                  onClick={() => setEditing(false)}
                  className="px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-2 py-1 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TimelineCell;
