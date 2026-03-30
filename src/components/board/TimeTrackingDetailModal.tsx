import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Clock, RotateCcw, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useSupabaseData';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export interface TimeSession {
  start: string;
  end: string | null;
  duration: number;
  note: string;
  userId?: string;
}

export interface TimeTrackingData {
  sessions: TimeSession[];
  totalSeconds: number;
  runningFrom: string | null;
  estimatedSeconds?: number;
  runningUserId?: string;
}

export const emptyTimeData = (): TimeTrackingData => ({
  sessions: [],
  totalSeconds: 0,
  runningFrom: null,
  estimatedSeconds: undefined,
});

export const parseTimeData = (val: any): TimeTrackingData => {
  if (!val || typeof val !== 'object') return { ...emptyTimeData(), totalSeconds: typeof val === 'number' ? val : 0 };
  return {
    sessions: Array.isArray(val.sessions) ? val.sessions : [],
    totalSeconds: typeof val.totalSeconds === 'number' ? val.totalSeconds : 0,
    runningFrom: val.runningFrom || null,
    estimatedSeconds: typeof val.estimatedSeconds === 'number' ? val.estimatedSeconds : undefined,
    runningUserId: val.runningUserId || undefined,
  };
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 0) seconds = 0;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
};

export const formatDurationFull = (seconds: number): string => {
  if (seconds < 0) seconds = 0;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (parts.length === 0 || s > 0) parts.push(`${s}s`);
  return parts.join(' ');
};

export const parseManualTime = (input: string): number | null => {
  const match = input.match(/^(?:(\d+)\s*[hH])?\s*(?:(\d+)\s*[mM])?\s*(?:(\d+)\s*[sS])?$/);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  return (parseInt(match[1] || '0') * 3600) + (parseInt(match[2] || '0') * 60) + parseInt(match[3] || '0');
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TimeTrackingData;
  onChange: (data: TimeTrackingData) => void;
}

const TimeTrackingDetailModal: React.FC<Props> = ({ open, onOpenChange, data, onChange }) => {
  const { user } = useAuth();
  const { data: profiles = [] } = useProfiles();

  const [manualInput, setManualInput] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [editingDuration, setEditingDuration] = useState<number | null>(null);
  const [tempDuration, setTempDuration] = useState('');
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [tempEstimate, setTempEstimate] = useState('');

  const getProfileName = (userId?: string) => {
    if (!userId) return null;
    return profiles.find(p => p.id === userId)?.name || null;
  };

  const handleAddManual = () => {
    const secs = parseManualTime(manualInput);
    if (!secs || secs <= 0) return;
    const now = new Date().toISOString();
    const newSession: TimeSession = {
      start: now,
      end: now,
      duration: secs,
      note: manualNote.trim() || 'Entrada manual',
      userId: user?.id,
    };
    onChange({
      ...data,
      sessions: [...data.sessions, newSession],
      totalSeconds: data.totalSeconds + secs,
    });
    setManualInput('');
    setManualNote('');
  };

  const handleDeleteSession = (idx: number) => {
    const session = data.sessions[idx];
    onChange({
      ...data,
      sessions: data.sessions.filter((_, i) => i !== idx),
      totalSeconds: Math.max(0, data.totalSeconds - session.duration),
    });
  };

  const handleReset = () => {
    onChange({ ...emptyTimeData(), estimatedSeconds: data.estimatedSeconds });
    setShowReset(false);
  };

  const handleSaveNote = (idx: number) => {
    const updated = [...data.sessions];
    updated[idx] = { ...updated[idx], note: tempNote };
    onChange({ ...data, sessions: updated });
    setEditingNote(null);
  };

  const handleSaveDuration = (idx: number) => {
    const secs = parseManualTime(tempDuration);
    if (secs !== null && secs > 0) {
      const diff = secs - data.sessions[idx].duration;
      const updated = [...data.sessions];
      updated[idx] = { ...updated[idx], duration: secs };
      onChange({
        ...data,
        sessions: updated,
        totalSeconds: Math.max(0, data.totalSeconds + diff),
      });
    }
    setEditingDuration(null);
  };

  const handleSaveEstimate = () => {
    const secs = parseManualTime(tempEstimate);
    if (secs !== null) {
      onChange({ ...data, estimatedSeconds: secs > 0 ? secs : undefined });
    }
    setEditingEstimate(false);
  };

  const estimated = data.estimatedSeconds;
  const overEstimate = estimated ? data.totalSeconds > estimated : false;
  const pct = estimated && estimated > 0 ? Math.min(100, Math.round((data.totalSeconds / estimated) * 100)) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> Controle de Tempo
            </DialogTitle>
          </DialogHeader>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-density-cell text-muted-foreground">Tempo total</span>
              <span className="text-lg font-bold text-foreground" title={formatDurationFull(data.totalSeconds)}>
                {formatDuration(data.totalSeconds)}
              </span>
            </div>

            {/* Editable estimate */}
            <div className="flex items-center justify-between">
              <span className="font-density-cell text-muted-foreground">Estimativa</span>
              {editingEstimate ? (
                <input
                  value={tempEstimate}
                  onChange={e => setTempEstimate(e.target.value)}
                  onBlur={handleSaveEstimate}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveEstimate(); if (e.key === 'Escape') setEditingEstimate(false); }}
                  autoFocus
                  placeholder="Ex: 2h 30m"
                  className="w-28 bg-transparent text-xs text-foreground outline-none border-b border-primary text-right"
                />
              ) : (
                <button
                  onClick={() => { setTempEstimate(estimated ? formatDuration(estimated) : ''); setEditingEstimate(true); }}
                  className="font-density-cell text-muted-foreground hover:text-foreground flex items-center gap-1 group"
                  title="Clique para editar estimativa"
                >
                  {estimated && estimated > 0
                    ? formatDuration(estimated)
                    : <span className="text-muted-foreground/50 text-xs italic">Definir estimativa</span>
                  }
                  <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                </button>
              )}
            </div>

            {estimated != null && estimated > 0 && (
              <>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${overEstimate ? 'bg-destructive' : 'bg-accent'}`}
                    style={{ width: `${Math.min(pct!, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-density-tiny text-muted-foreground">{pct}% concluído</span>
                  {overEstimate && (
                    <p className="font-density-tiny text-destructive font-medium">
                      +{formatDuration(data.totalSeconds - estimated)} acima do estimado
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="font-density-tiny text-muted-foreground">{data.sessions.length} sessão(ões)</span>
              <Button variant="ghost" size="sm" onClick={() => setShowReset(true)} className="h-6 font-density-tiny text-destructive hover:text-destructive">
                <RotateCcw className="w-3 h-3 mr-1" /> Resetar
              </Button>
            </div>
          </div>

          {/* Manual time entry */}
          <div className="space-y-1.5">
            <span className="font-density-cell font-medium text-foreground">Adicionar tempo manual</span>
            <div className="flex gap-1.5">
              <Input
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="Ex: 2h 30m"
                className="h-8 text-xs flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleAddManual(); }}
              />
              <Input
                value={manualNote}
                onChange={e => setManualNote(e.target.value)}
                placeholder="Nota (opcional)"
                className="h-8 text-xs flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleAddManual(); }}
              />
              <Button variant="outline" size="sm" onClick={handleAddManual} className="h-8">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Sessions list */}
          <div className="space-y-1">
            <span className="font-density-cell font-medium text-foreground">Sessões</span>
            {data.sessions.length === 0 && (
              <p className="font-density-cell text-muted-foreground py-2">Nenhuma sessão registrada.</p>
            )}
            {[...data.sessions].reverse().map((session, rIdx) => {
              const idx = data.sessions.length - 1 - rIdx;
              const authorName = getProfileName(session.userId);
              return (
                <div key={idx} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {editingDuration === idx ? (
                        <input
                          value={tempDuration}
                          onChange={e => setTempDuration(e.target.value)}
                          onBlur={() => handleSaveDuration(idx)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveDuration(idx); if (e.key === 'Escape') setEditingDuration(null); }}
                          autoFocus
                          placeholder="Ex: 1h 30m"
                          className="font-density-cell font-mono text-foreground bg-transparent outline-none border-b border-primary w-20 text-sm"
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingDuration(idx); setTempDuration(''); }}
                          className="font-density-cell font-mono text-foreground hover:text-primary transition-colors"
                          title={`${formatDurationFull(session.duration)} — clique para editar`}
                        >
                          {formatDurationFull(session.duration)}
                        </button>
                      )}
                      {session.start && (
                        <span className="font-density-tiny text-muted-foreground">
                          {(() => {
                            try { return format(parseISO(session.start), "dd/MM HH:mm", { locale: ptBR }); }
                            catch { return ''; }
                          })()}
                          {session.end && session.end !== session.start && (
                            <> → {(() => {
                              try { return format(parseISO(session.end), "HH:mm"); }
                              catch { return ''; }
                            })()}</>
                          )}
                        </span>
                      )}
                      {authorName && (
                        <span className="font-density-tiny text-muted-foreground/60 italic">{authorName}</span>
                      )}
                    </div>
                    {editingNote === idx ? (
                      <input
                        value={tempNote}
                        onChange={e => setTempNote(e.target.value)}
                        onBlur={() => handleSaveNote(idx)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveNote(idx); if (e.key === 'Escape') setEditingNote(null); }}
                        autoFocus
                        className="font-density-tiny text-muted-foreground bg-transparent outline-none border-b border-primary w-full mt-0.5"
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingNote(idx); setTempNote(session.note || ''); }}
                        className="font-density-tiny text-muted-foreground hover:text-foreground truncate block max-w-full mt-0.5"
                      >
                        {session.note || 'Adicionar nota...'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSession(idx)}
                    className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showReset} onOpenChange={setShowReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar tempo?</AlertDialogTitle>
            <AlertDialogDescription>Todas as sessões e o tempo acumulado serão zerados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Resetar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TimeTrackingDetailModal;
