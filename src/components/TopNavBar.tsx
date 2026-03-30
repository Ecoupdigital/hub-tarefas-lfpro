import React, { useState, useEffect, useMemo } from 'react';
import { Search, Undo2, Redo2, Clock } from 'lucide-react';
import NotificationBell from './notifications/NotificationBell';
import UserProfile from './auth/UserProfile';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useSupabaseData';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useApp } from '@/context/AppContext';
import { parseTimeData, formatDuration } from '@/components/board/TimeTrackingDetailModal';

/** Isolated clock component so the 1s re-render doesn't propagate to the entire TopNavBar */
const ClockDisplay: React.FC<{ activeTimer: { item: any; col: any; td: any }; onClickItem: (item: any) => void }> = ({ activeTimer, onClickItem }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeSeconds = activeTimer.td.totalSeconds + Math.floor((Date.now() - new Date(activeTimer.td.runningFrom!).getTime()) / 1000);
  void tick; // consumed for live ticking

  return (
    <button
      onClick={() => onClickItem(activeTimer.item)}
      className="flex items-center gap-1.5 px-2 py-1 bg-accent/10 hover:bg-accent/20 rounded-full border border-accent/25 mr-1.5 transition-colors"
      title={`Timer ativo: ${activeTimer.item.name}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse flex-shrink-0" />
      <Clock className="w-3 h-3 text-accent flex-shrink-0" />
      <span className="font-density-tiny font-mono text-accent">{formatDuration(activeSeconds)}</span>
      <span className="font-density-tiny text-muted-foreground truncate max-w-[90px]">{activeTimer.item.name}</span>
    </button>
  );
};

const TopNavBar: React.FC = () => {
  const [showUserProfile, setShowUserProfile] = useState(false);
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const { activeBoard, setSelectedItem } = useApp();

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuario';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Find the first active timer across all items in the active board
  const activeTimer = useMemo(() => {
    if (!activeBoard) return null;
    const timeCols = activeBoard.columns.filter(c => c.type === 'time_tracking');
    if (!timeCols.length) return null;
    for (const group of activeBoard.groups) {
      for (const item of group.items) {
        if (!item.columnValues) continue;
        for (const col of timeCols) {
          const cv = item.columnValues[col.id];
          const td = parseTimeData(cv?.value);
          if (td.runningFrom) {
            return { item, col, td };
          }
        }
      }
    }
    return null;
  }, [activeBoard]);

  const handleSearchClick = () => {
    window.dispatchEvent(new CustomEvent('lfpro-command-palette'));
  };

  return (
    <>
      <header className="h-12 bg-sidebar border-b border-sidebar-border flex items-center justify-end px-4 shrink-0">
        <div className="flex items-center gap-0.5">
          {/* Global active timer indicator — isolated to avoid 1s re-renders on TopNavBar */}
          {activeTimer && (
            <ClockDisplay activeTimer={activeTimer} onClickItem={setSelectedItem} />
          )}

          <button
            onClick={() => undo()}
            disabled={!canUndo}
            className="p-1.5 rounded hover:bg-sidebar-accent text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Desfazer (Ctrl+Z)"
            aria-label="Desfazer ultima acao (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => redo()}
            disabled={!canRedo}
            className="p-1.5 rounded hover:bg-sidebar-accent text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Refazer (Ctrl+Y)"
            aria-label="Refazer ultima acao (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <NotificationBell />
          <button
            onClick={handleSearchClick}
            className="p-1.5 rounded hover:bg-sidebar-accent text-muted-foreground transition-colors"
            title="Busca global (Ctrl+K)"
            aria-label="Abrir busca global (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowUserProfile(true)}
            className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold ml-1 hover:bg-primary/30 transition-colors"
            title="Meu perfil"
            aria-label="Meu perfil"
          >
            {initials}
          </button>
        </div>
      </header>
      <UserProfile open={showUserProfile} onOpenChange={setShowUserProfile} />
    </>
  );
};

export default TopNavBar;
