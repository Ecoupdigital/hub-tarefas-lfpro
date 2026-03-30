import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Undo2, Redo2, Clock, Trash2, Moon, Sun, User, Settings, Paintbrush, LogOut } from 'lucide-react';
import NotificationBell from './notifications/NotificationBell';
import UserProfile from './auth/UserProfile';
import ThemeCustomizer from '@/components/settings/ThemeCustomizer';
import TrashDrawer from '@/components/workspace/TrashDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useSupabaseData';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useApp } from '@/context/AppContext';
import { useTrashItems } from '@/hooks/useTrash';
import { parseTimeData, formatDuration } from '@/components/board/TimeTrackingDetailModal';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

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

const ThemeToggleInline: React.FC = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <button
      onClick={() => setDark(d => !d)}
      className="p-1.5 rounded hover:bg-sidebar-accent text-muted-foreground transition-colors"
      title={dark ? 'Modo claro' : 'Modo escuro'}
      aria-label={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};

const TopNavBar: React.FC = () => {
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const { activeBoard, setSelectedItem } = useApp();
  const { data: trashItems = [] } = useTrashItems();
  const navigate = useNavigate();

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
      <header className="h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 shrink-0">
        {/* Left side */}
        <div className="flex items-center gap-0.5">
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
          {/* Global active timer indicator */}
          {activeTimer && (
            <ClockDisplay activeTimer={activeTimer} onClickItem={setSelectedItem} />
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-0.5">
          {/* Trash */}
          <button
            onClick={() => setShowTrash(true)}
            className="relative p-1.5 rounded hover:bg-sidebar-accent text-muted-foreground transition-colors"
            title="Lixeira"
            aria-label="Abrir lixeira"
          >
            <Trash2 className="w-4 h-4" />
            {trashItems.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {trashItems.length}
              </span>
            )}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Search */}
          <button
            onClick={handleSearchClick}
            className="p-1.5 rounded hover:bg-sidebar-accent text-muted-foreground transition-colors"
            title="Busca global (Ctrl+K)"
            aria-label="Abrir busca global (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme toggle */}
          <ThemeToggleInline />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 ml-1 px-1.5 py-1 rounded hover:bg-sidebar-accent transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                  {initials}
                </div>
                <span className="font-density-cell font-medium text-sidebar-foreground truncate max-w-[100px] hidden sm:inline">
                  {displayName}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-3 py-2 border-b border-border">
                <p className="font-density-cell font-medium text-foreground truncate">{displayName}</p>
                <p className="font-density-tiny text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuItem onClick={() => setShowUserProfile(true)}>
                <User className="w-3.5 h-3.5 mr-2" /> Meu perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="w-3.5 h-3.5 mr-2" /> Configuracoes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowThemeCustomizer(true)}>
                <Paintbrush className="w-3.5 h-3.5 mr-2" /> Personalizar tema
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="w-3.5 h-3.5 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <UserProfile open={showUserProfile} onOpenChange={setShowUserProfile} />
      <ThemeCustomizer open={showThemeCustomizer} onOpenChange={setShowThemeCustomizer} />
      <TrashDrawer open={showTrash} onOpenChange={setShowTrash} />
    </>
  );
};

export default TopNavBar;
