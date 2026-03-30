import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import TimeTrackingDetailModal, { TimeTrackingData, parseTimeData, formatDuration, formatDurationFull, emptyTimeData } from './TimeTrackingDetailModal';

interface TimeTrackingCellProps {
  value: any;
  onChange: (val: any) => void;
  estimatedSeconds?: number;
}

const FORGOTTEN_HOURS = 8;

const TimeTrackingCell: React.FC<TimeTrackingCellProps> = ({ value, onChange, estimatedSeconds }) => {
  const { user } = useAuth();
  const data = parseTimeData(value);
  const [running, setRunning] = useState(!!data.runningFrom);
  const [displaySeconds, setDisplaySeconds] = useState(() => {
    let total = data.totalSeconds;
    if (data.runningFrom) {
      total += Math.floor((Date.now() - new Date(data.runningFrom).getTime()) / 1000);
    }
    return total;
  });
  const [showDetail, setShowDetail] = useState(false);
  const [flashDir, setFlashDir] = useState<'start' | 'stop' | null>(null);
  const lastSaveRef = useRef(Date.now());
  const dataRef = useRef(data);
  const forgottenShownRef = useRef(false);
  dataRef.current = data;

  // Recalc when value changes externally
  useEffect(() => {
    const d = parseTimeData(value);
    let total = d.totalSeconds;
    if (d.runningFrom) {
      total += Math.floor((Date.now() - new Date(d.runningFrom).getTime()) / 1000);
    }
    setDisplaySeconds(total);
    setRunning(!!d.runningFrom);

    // Forgotten timer protection — alert once on mount if > 8h
    if (d.runningFrom && !forgottenShownRef.current) {
      const elapsedHours = (Date.now() - new Date(d.runningFrom).getTime()) / 3_600_000;
      if (elapsedHours >= FORGOTTEN_HOURS) {
        forgottenShownRef.current = true;
        toast.warning(
          `Timer ativo há mais de ${Math.floor(elapsedHours)}h — você esqueceu de parar?`,
          {
            duration: 12000,
            action: {
              label: 'Parar agora',
              onClick: () => {
                const d2 = dataRef.current;
                if (!d2.runningFrom) return;
                const elapsed = Math.floor((Date.now() - new Date(d2.runningFrom).getTime()) / 1000);
                const newSession = {
                  start: d2.runningFrom,
                  end: new Date().toISOString(),
                  duration: elapsed,
                  note: 'Timer parado automaticamente',
                  userId: user?.id,
                };
                const newData: TimeTrackingData = {
                  ...d2,
                  sessions: [...d2.sessions, newSession],
                  totalSeconds: d2.totalSeconds + elapsed,
                  runningFrom: null,
                  runningUserId: undefined,
                };
                onChange(newData);
                setRunning(false);
                setDisplaySeconds(newData.totalSeconds);
                toast.success(`Timer parado — ${formatDurationFull(newData.totalSeconds)} registrados`);
              },
            },
          }
        );
      }
    }
  }, [value]);

  // Tick every second when running
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const d = dataRef.current;
      if (d.runningFrom) {
        const elapsed = Math.floor((Date.now() - new Date(d.runningFrom).getTime()) / 1000);
        setDisplaySeconds(d.totalSeconds + elapsed);
      }
      // Debounce save: every 30s
      if (Date.now() - lastSaveRef.current > 30000) {
        lastSaveRef.current = Date.now();
        onChange({ ...dataRef.current });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const triggerFlash = useCallback((dir: 'start' | 'stop') => {
    setFlashDir(dir);
    setTimeout(() => setFlashDir(null), 600);
  }, []);

  const handleToggle = useCallback(() => {
    const d = dataRef.current;
    if (running) {
      const startTime = d.runningFrom || new Date().toISOString();
      const elapsed = d.runningFrom
        ? Math.floor((Date.now() - new Date(d.runningFrom).getTime()) / 1000)
        : 0;
      const newSession = {
        start: startTime,
        end: new Date().toISOString(),
        duration: elapsed,
        note: '',
        userId: user?.id,
      };
      const newData: TimeTrackingData = {
        ...d,
        sessions: [...d.sessions, newSession],
        totalSeconds: d.totalSeconds + elapsed,
        runningFrom: null,
        runningUserId: undefined,
      };
      onChange(newData);
      setRunning(false);
      setDisplaySeconds(newData.totalSeconds);
      triggerFlash('stop');
      toast.success(`Timer pausado — ${formatDurationFull(elapsed)} registrados nesta sessão`);
    } else {
      const newData: TimeTrackingData = {
        ...d,
        runningFrom: new Date().toISOString(),
        runningUserId: user?.id,
      };
      onChange(newData);
      setRunning(true);
      lastSaveRef.current = Date.now();
      triggerFlash('start');
      toast.success('Timer iniciado');
    }
  }, [running, onChange, user?.id, triggerFlash]);

  const handleDetailChange = useCallback((newData: TimeTrackingData) => {
    onChange(newData);
    setDisplaySeconds(newData.totalSeconds);
    setRunning(!!newData.runningFrom);
  }, [onChange]);

  const estimated = estimatedSeconds || data.estimatedSeconds;
  const overEstimate = estimated ? displaySeconds > estimated : false;

  const flashClass = flashDir === 'stop'
    ? 'bg-destructive/15'
    : flashDir === 'start'
    ? 'bg-accent/15'
    : '';

  return (
    <>
      <div className={`w-full h-full flex items-center justify-center gap-1.5 relative rounded transition-[background-color] duration-500 ${flashClass}`}>
        <button
          onClick={handleToggle}
          className={`inline-flex items-center justify-center flex-shrink-0 w-4 h-4 transition-all active:scale-90 ${
            running
              ? 'text-destructive hover:text-destructive/80'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title={running ? 'Pausar timer' : 'Iniciar timer'}
        >
          {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => setShowDetail(true)}
          className={`font-density-cell font-mono text-xs transition-colors text-left ${
            running ? 'text-destructive font-semibold' : 'text-muted-foreground'
          } hover:text-foreground`}
          title={formatDurationFull(displaySeconds)}
        >
          {displaySeconds > 0 ? formatDuration(displaySeconds) : '—'}
        </button>
        {running && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
        )}
        {estimated != null && estimated > 0 && displaySeconds > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5">
            <div
              className={`h-full transition-all ${overEstimate ? 'bg-destructive' : 'bg-accent'}`}
              style={{ width: `${Math.min(100, (displaySeconds / estimated) * 100)}%` }}
            />
          </div>
        )}
      </div>
      <TimeTrackingDetailModal
        open={showDetail}
        onOpenChange={setShowDetail}
        data={{ ...parseTimeData(value), totalSeconds: displaySeconds }}
        onChange={handleDetailChange}
      />
    </>
  );
};

export default TimeTrackingCell;
