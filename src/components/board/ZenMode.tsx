import React, { ReactNode } from 'react';
import { Table2, Kanban, CalendarDays, GanttChart, BarChart3, X } from 'lucide-react';
import type { BoardView } from '@/context/AppContext';

interface ZenModeProps {
  boardName: string;
  activeView: BoardView;
  onExit: () => void;
  children: ReactNode;
}

const viewLabels: Record<BoardView, { icon: React.ReactNode; label: string }> = {
  table: { icon: <Table2 className="w-3.5 h-3.5" />, label: 'Tabela' },
  kanban: { icon: <Kanban className="w-3.5 h-3.5" />, label: 'Kanban' },
  calendar: { icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'Calendário' },
  timeline: { icon: <GanttChart className="w-3.5 h-3.5" />, label: 'Timeline' },
  dashboard: { icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Dashboard' },
};

const ZenMode: React.FC<ZenModeProps> = ({ boardName, activeView, onExit, children }) => {
  const view = viewLabels[activeView];

  return (
    <div className="fixed inset-0 z-50 bg-background animate-in fade-in duration-300 flex flex-col">
      {/* Minimal toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground truncate">{boardName}</h2>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted font-density-cell text-muted-foreground">
            {view.icon}
            <span>{view.label}</span>
          </div>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-density-cell font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Sair
          <kbd className="ml-1 px-1 py-0.5 rounded bg-muted-foreground/10 font-density-tiny font-mono">Esc</kbd>
        </button>
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-hidden p-4 flex">
        {children}
      </div>
    </div>
  );
};

export default ZenMode;
