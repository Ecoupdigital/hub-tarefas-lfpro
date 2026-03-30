import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useBoardViews, useCreateBoardView, useDeleteBoardView } from '@/hooks/useBoardViews';
import {
  Table2, Kanban, CalendarDays, GanttChart, BarChart3, LayoutGrid,
  Bookmark, Trash2, Save, X, Check, ChevronDown,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { BoardView } from '@/context/AppContext';

const VIEW_ICONS: Record<string, React.ReactNode> = {
  table: <Table2 className="w-3.5 h-3.5" />,
  kanban: <Kanban className="w-3.5 h-3.5" />,
  calendar: <CalendarDays className="w-3.5 h-3.5" />,
  timeline: <GanttChart className="w-3.5 h-3.5" />,
  dashboard: <BarChart3 className="w-3.5 h-3.5" />,
  cards: <LayoutGrid className="w-3.5 h-3.5" />,
  charts: <BarChart3 className="w-3.5 h-3.5" />,
  files: <Bookmark className="w-3.5 h-3.5" />,
};

const VIEW_LABELS: Record<string, string> = {
  table: 'Tabela',
  kanban: 'Kanban',
  calendar: 'Calendario',
  timeline: 'Timeline',
  dashboard: 'Dashboard',
  cards: 'Cards',
  charts: 'Graficos',
  files: 'Arquivos',
};

const ViewSelector: React.FC = () => {
  const {
    activeBoard, activeView, setActiveView,
    sort, setSort,
    hiddenColumns, setHiddenColumns,
    advancedFilter, setAdvancedFilter,
  } = useApp();

  const boardId = activeBoard?.id ?? null;
  const { data: savedViews = [] } = useBoardViews(boardId);
  const createView = useCreateBoardView();
  const deleteView = useDeleteBoardView();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewName, setViewName] = useState('');

  if (!activeBoard) return null;

  const VALID_VIEW_TYPES = ['table', 'kanban', 'calendar', 'timeline', 'dashboard'] as const;

  const handleSaveView = () => {
    if (!viewName.trim()) return;
    const safeViewType = VALID_VIEW_TYPES.includes(activeView as any) ? activeView : 'table';
    createView.mutate(
      {
        boardId: activeBoard.id,
        name: viewName.trim(),
        viewType: safeViewType,
        config: { activeView, sort, hiddenColumns, advancedFilter },
      },
      {
        onSuccess: () => {
          setViewName('');
          setSaving(false);
          toast.success('View salva com sucesso');
        },
        onError: () => {
          toast.error('Erro ao salvar view');
        },
      },
    );
  };

  const handleApplyView = (view: any) => {
    const config = view.config as any;
    if (config.activeView) setActiveView(config.activeView as BoardView);
    if (config.sort !== undefined) setSort(config.sort);
    if (config.hiddenColumns) setHiddenColumns(config.hiddenColumns);
    if (config.advancedFilter) setAdvancedFilter(config.advancedFilter);
    // Migrate legacy simple filters to advancedFilter rules
    if (config.filters && Array.isArray(config.filters) && config.filters.length > 0 && !config.advancedFilter) {
      setAdvancedFilter({
        combinator: 'and',
        rules: config.filters.map((f: any) => ({
          id: Math.random().toString(36).slice(2, 10),
          columnId: f.columnId,
          operator: 'contains' as const,
          value: f.value,
        })),
      });
    }
    setOpen(false);
    toast.success('View aplicada');
  };

  const handleDeleteView = (e: React.MouseEvent, viewId: string) => {
    e.stopPropagation();
    deleteView.mutate(viewId, {
      onSuccess: () => toast.success('View removida'),
      onError: () => toast.error('Erro ao remover view'),
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-density-cell text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Bookmark className="w-3.5 h-3.5" />
          Views
          {savedViews.length > 0 && (
            <span className="ml-0.5 text-xs bg-muted-foreground/20 text-muted-foreground rounded-full px-1.5">
              {savedViews.length}
            </span>
          )}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-2">
          <p className="font-density-cell font-medium text-foreground">Views salvas</p>

          {savedViews.length === 0 && !saving && (
            <p className="font-density-tiny text-muted-foreground py-2">Nenhuma view salva ainda.</p>
          )}

          {/* Saved views list */}
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {savedViews.map((sv: any) => {
              const viewType = sv.view_type || sv.config?.activeView || 'table';
              const isActive = activeView === viewType;
              return (
                <button
                  key={sv.id}
                  onClick={() => handleApplyView(sv)}
                  className={`group flex items-center gap-2 w-full px-2 py-1.5 rounded font-density-cell transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                  }`}
                >
                  {VIEW_ICONS[viewType] || <Bookmark className="w-3.5 h-3.5" />}
                  <span className="flex-1 text-left truncate">{sv.name}</span>
                  {isActive && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Check className="w-3 h-3 text-primary" />
                      </TooltipTrigger>
                      <TooltipContent side="top">View ativa</TooltipContent>
                    </Tooltip>
                  )}
                  <span
                    role="button"
                    onClick={(e) => handleDeleteView(e, sv.id)}
                    className="p-0.5 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Save current view */}
          {saving ? (
            <div className="flex items-center gap-1.5 pt-2 border-t border-border">
              <Input
                value={viewName}
                onChange={e => setViewName(e.target.value)}
                placeholder="Nome da view..."
                className="h-7 text-xs flex-1"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveView();
                  if (e.key === 'Escape') { setViewName(''); setSaving(false); }
                }}
              />
              <button
                onClick={handleSaveView}
                disabled={!viewName.trim() || createView.isPending}
                className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => { setViewName(''); setSaving(false); }} className="p-1.5 rounded hover:bg-muted">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSaving(true)}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded font-density-cell text-primary hover:bg-primary/10 transition-colors border-t border-border pt-2"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar view atual
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ViewSelector;
