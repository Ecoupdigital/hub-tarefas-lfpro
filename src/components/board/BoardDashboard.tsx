import React, { useMemo, useState, useCallback, useRef } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip as UiTooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from '@/components/ui/tooltip';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, PieChart as PieChartIcon, BarChart3, TrendingUp, Hash, Type, Activity,
  BarChart2, Pencil, Check, Filter, X, Table2, Users,
} from 'lucide-react';
import type { Column, Item, Group } from '@/types/board';
import { useDashboardWidgets, useCreateWidget, useUpdateWidget, useDeleteWidget } from '@/hooks/useDashboardWidgets';
import type { WidgetConfig, WidgetPosition, DashboardWidget } from '@/hooks/useDashboardWidgets';
import { DashboardFilterProvider, useDashboardFilter } from '@/context/DashboardFilterContext';
import WidgetContainer from './widgets/WidgetContainer';
import WidgetConfigPanel from './widgets/WidgetConfigPanel';

const FALLBACK_COLORS = [
  '#579BFC', '#FDAB3D', '#00C875', '#E2445C', '#A25DDC',
  '#FF642E', '#CAB641', '#9AADBD', '#66CCFF', '#7F5347',
];

const WIDGET_CATALOG = [
  { type: 'pie_chart', icon: PieChartIcon, label: 'Grafico de Pizza', description: 'Distribuicao por status' },
  { type: 'bar_chart', icon: BarChart3, label: 'Grafico de Barras', description: 'Itens por grupo ou status' },
  { type: 'line_chart', icon: TrendingUp, label: 'Grafico de Linha', description: 'Itens criados ao longo do tempo' },
  { type: 'numbers', icon: Hash, label: 'Contador', description: 'Contagem, soma, media de valores' },
  { type: 'progress', icon: BarChart2, label: 'Progresso', description: 'Percentual de conclusao do board' },
  { type: 'text', icon: Type, label: 'Texto', description: 'Notas e objetivos em texto livre' },
  { type: 'activity', icon: Activity, label: 'Atividade', description: 'Atividades recentes do board' },
  { type: 'table', icon: Table2, label: 'Tabela', description: 'Lista de itens com colunas selecionaveis' },
  { type: 'people_chart', icon: Users, label: 'Itens por Pessoa', description: 'Distribuicao de itens por responsavel' },
];

// ---- Default / Legacy Dashboard ---- //

const DefaultDashboard: React.FC<{
  allItems: Item[];
  allGroups: Group[];
  allColumns: Column[];
  users: any[];
}> = ({ allItems, allGroups, allColumns, users }) => {
  const statusColumns = useMemo(() => allColumns.filter(c => c.type === 'status'), [allColumns]);
  const dateColumns = useMemo(() => allColumns.filter(c => c.type === 'date'), [allColumns]);
  const progressColumns = useMemo(() => allColumns.filter(c => c.type === 'progress'), [allColumns]);
  const peopleColumns = useMemo(() => allColumns.filter(c => c.type === 'people'), [allColumns]);

  const allLabelsMap = useMemo(() => {
    const map: Record<string, { name: string; color: string; isDone?: boolean; count: number }> = {};
    for (const col of statusColumns) {
      const labels = col.settings.labels || {};
      for (const item of allItems) {
        const val = item.columnValues[col.id]?.value;
        if (val != null && labels[String(val)]) {
          const label = labels[String(val)];
          const key = `${col.id}::${val}`;
          if (!map[key]) {
            map[key] = { name: label.name, color: label.color, isDone: label.isDone, count: 0 };
          }
          map[key].count++;
        }
      }
    }
    return map;
  }, [statusColumns, allItems]);

  const kpiData = useMemo(() => {
    const total = allItems.length;
    let done = 0;
    let inProgress = 0;
    let overdue = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const item of allItems) {
      let itemDone = false;
      let itemHasStatus = false;

      for (const col of statusColumns) {
        const val = item.columnValues[col.id]?.value;
        if (val == null) continue;
        const label = col.settings.labels?.[String(val)];
        if (!label) continue;
        itemHasStatus = true;
        if (label.isDone) {
          itemDone = true;
        }
      }

      if (itemDone) {
        done++;
      } else if (itemHasStatus) {
        inProgress++;
      }

      if (!itemDone) {
        for (const col of dateColumns) {
          const val = item.columnValues[col.id]?.value;
          if (val) {
            const d = new Date(val);
            if (!isNaN(d.getTime()) && d < today) {
              overdue++;
              break;
            }
          }
        }
      }
    }
    return { total, done, inProgress, overdue };
  }, [allItems, statusColumns, dateColumns]);

  const statusPieData = useMemo(() => {
    return Object.values(allLabelsMap).filter(d => d.count > 0);
  }, [allLabelsMap]);

  const groupBarData = useMemo(() => {
    return allGroups.map(g => ({
      name: g.title,
      count: g.items.length,
      color: g.color,
    }));
  }, [allGroups]);

  const progressData = useMemo(() => {
    if (progressColumns.length > 0) {
      const progCol = progressColumns[0];
      return allGroups.map(g => {
        const values = g.items
          .map(i => {
            const v = i.columnValues[progCol.id]?.value;
            return v != null ? Number(v) : null;
          })
          .filter((v): v is number => v !== null);
        const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
        return { name: g.title, valor: avg, color: g.color };
      });
    }
    return allGroups.map(g => {
      const total = g.items.length;
      if (total === 0) return { name: g.title, valor: 0, color: g.color };
      let doneCount = 0;
      for (const item of g.items) {
        for (const col of statusColumns) {
          const val = item.columnValues[col.id]?.value;
          if (val != null) {
            const label = col.settings.labels?.[String(val)];
            if (label?.isDone) { doneCount++; break; }
          }
        }
      }
      return { name: g.title, valor: Math.round((doneCount / total) * 100), color: g.color };
    });
  }, [progressColumns, allGroups, statusColumns]);

  const progressLabel = progressColumns.length > 0 ? 'Progresso Medio por Grupo' : 'Taxa de Conclusao por Grupo (%)';

  const personBarData = useMemo(() => {
    if (peopleColumns.length === 0) return [];
    const countMap: Record<string, number> = {};
    for (const item of allItems) {
      for (const col of peopleColumns) {
        const val = item.columnValues[col.id]?.value;
        if (!val) continue;
        const ids = Array.isArray(val) ? val : [val];
        for (const id of ids) {
          countMap[String(id)] = (countMap[String(id)] || 0) + 1;
        }
      }
    }
    return Object.entries(countMap).map(([id, count]) => {
      const user = users.find(u => u.id === id);
      return { name: user?.name || 'Desconhecido', count };
    });
  }, [peopleColumns, allItems, users]);

  const recentItems = useMemo(() => {
    const withGroup = allItems.map(item => {
      const group = allGroups.find(g => g.id === item.groupId);
      return { ...item, groupTitle: group?.title ?? '' };
    });
    return withGroup
      .filter(i => i.createdAt)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 10);
  }, [allItems, allGroups]);

  const totalStatusCount = statusPieData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* KPI Cards */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="font-density-cell font-semibold">Indicadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted border border-border p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{kpiData.total}</p>
              <p className="font-density-cell text-muted-foreground mt-1">Total de Itens</p>
            </div>
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{kpiData.done}</p>
              <p className="font-density-cell text-muted-foreground mt-1">Concluidos</p>
            </div>
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">{kpiData.inProgress}</p>
              <p className="font-density-cell text-muted-foreground mt-1">Em Andamento</p>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{kpiData.overdue}</p>
              <p className="font-density-cell text-muted-foreground mt-1">Atrasados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution - Pie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-density-cell font-semibold">Distribuicao por Status</CardTitle>
        </CardHeader>
        <CardContent>
          {statusPieData.length === 0 ? (
            <p className="font-density-cell text-muted-foreground text-center py-8">Nenhuma coluna de status configurada</p>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusPieData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number, name: string) => [`${value} itens`, name]} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">
                    {totalStatusCount}
                  </text>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {statusPieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 font-density-cell">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name} ({d.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items by Group - Bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-density-cell font-semibold">Itens por Grupo</CardTitle>
        </CardHeader>
        <CardContent>
          {groupBarData.length === 0 ? (
            <p className="font-density-cell text-muted-foreground text-center py-8">Nenhum grupo encontrado</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={groupBarData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => [`${value} itens`, 'Quantidade']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {groupBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-density-cell font-semibold">{progressLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {progressData.length === 0 ? (
            <p className="font-density-cell text-muted-foreground text-center py-8">Sem dados de progresso</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={progressData} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => [`${value}%`, 'Valor']} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  {progressData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Items by Person */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-density-cell font-semibold">Itens por Pessoa</CardTitle>
        </CardHeader>
        <CardContent>
          {personBarData.length === 0 ? (
            <p className="font-density-cell text-muted-foreground text-center py-8">Nenhuma coluna de pessoa configurada</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={personBarData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => [`${value} itens`, 'Quantidade']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {personBarData.map((_, i) => (
                    <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="font-density-cell font-semibold">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentItems.length === 0 ? (
            <p className="font-density-cell text-muted-foreground text-center py-8">Nenhuma atividade recente</p>
          ) : (
            <div className="space-y-2">
              {recentItems.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-density-cell text-foreground truncate">{item.name}</span>
                    <span className="font-density-tiny px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {item.groupTitle}
                    </span>
                  </div>
                  <span className="font-density-tiny text-muted-foreground shrink-0 ml-2">
                    {item.createdAt
                      ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ptBR })
                      : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ---- Main Dashboard Component ---- //

const BoardDashboard: React.FC = () => {
  const { activeBoard, users } = useApp();
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [configuringWidget, setConfiguringWidget] = useState<DashboardWidget | null>(null);
  const { width: containerWidth, containerRef } = useContainerWidth();

  const boardId = activeBoard?.id ?? null;
  const { data: widgets = [] } = useDashboardWidgets(boardId);
  const createWidget = useCreateWidget();
  const updateWidget = useUpdateWidget();
  const deleteWidget = useDeleteWidget();

  const allColumns = activeBoard?.columns ?? [];
  const allGroups = activeBoard?.groups ?? [];
  const allItems = useMemo(
    () => allGroups.flatMap(g => g.items),
    [allGroups]
  );

  // Debounced position save
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = useRef<Map<string, WidgetPosition>>(new Map());

  const flushPositionUpdates = useCallback(() => {
    pendingUpdatesRef.current.forEach((pos, id) => {
      updateWidget.mutate({ id, position: pos });
    });
    pendingUpdatesRef.current.clear();
  }, [updateWidget]);

  const debouncedUpdatePosition = useCallback((id: string, pos: WidgetPosition) => {
    pendingUpdatesRef.current.set(id, pos);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(flushPositionUpdates, 600);
  }, [flushPositionUpdates]);

  // Build RGL layout from widget positions
  const layout = useMemo(() =>
    widgets.map(w => ({
      i: w.id,
      x: w.position?.x ?? 0,
      y: w.position?.y ?? 0,
      w: w.position?.w ?? 1,
      h: w.position?.h ?? 2,
      minW: 1, maxW: 3,
      minH: 1, maxH: 4,
    })),
    [widgets]
  );

  const handleLayoutChange = useCallback((newLayout: Array<{ i: string; x: number; y: number; w: number; h: number }>) => {
    newLayout.forEach(item => {
      const widget = widgets.find(w => w.id === item.i);
      if (!widget) return;
      const newPos: WidgetPosition = { x: item.x, y: item.y, w: item.w, h: item.h };
      if (
        widget.position?.x !== newPos.x ||
        widget.position?.y !== newPos.y ||
        widget.position?.w !== newPos.w ||
        widget.position?.h !== newPos.h
      ) {
        debouncedUpdatePosition(item.i, newPos);
      }
    });
  }, [widgets, debouncedUpdatePosition]);

  if (!activeBoard) return null;

  const hasCustomWidgets = widgets.length > 0;

  const handleAddWidget = (widgetType: string) => {
    if (!boardId) return;

    const defaultConfigs: Record<string, WidgetConfig> = {
      pie_chart: { title: 'Distribuicao por Status' },
      bar_chart: { title: 'Itens por Grupo', groupBy: 'group' },
      line_chart: { title: 'Itens Criados' },
      numbers: { title: 'Total de Itens', aggregation: 'count' },
      progress: { title: 'Progresso do Board' },
      text: { title: 'Notas', text: '' },
      activity: { title: 'Atividade Recente', limit: 20 },
      table: { title: 'Tabela de Itens' },
      people_chart: { title: 'Itens por Pessoa' },
    };

    const position: WidgetPosition = {
      x: 0,
      y: 999,
      w: 1,
      h: 2,
    };

    createWidget.mutate({
      boardId,
      widgetType,
      config: defaultConfigs[widgetType] || {},
      position,
    });

    setShowAddWidget(false);
  };

  const handleUpdateWidget = (id: string, config?: WidgetConfig) => {
    if (config) {
      updateWidget.mutate({ id, config });
    }
  };

  const handleDeleteWidget = (id: string) => {
    deleteWidget.mutate(id);
  };

  const handleDuplicateWidget = (widgetId: string) => {
    const original = widgets.find(w => w.id === widgetId);
    if (!original || !boardId) return;
    createWidget.mutate({
      boardId,
      widgetType: original.widget_type,
      config: original.config,
      position: { x: 0, y: 999, w: original.position?.w ?? 1, h: original.position?.h ?? 2 },
    });
  };

  return (
    <DashboardFilterProvider>
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <DashboardFilterBanner />
      {/* Header with Edit Mode toggle and Add Widget button */}
      <div className="flex justify-end gap-1.5 mb-2">
        <TooltipProvider delayDuration={300}>
          <UiTooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsEditMode(prev => !prev)}
                className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
                  isEditMode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {isEditMode ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isEditMode ? 'Concluir edicao' : 'Editar dashboard'}
            </TooltipContent>
          </UiTooltip>
        </TooltipProvider>
        {isEditMode && (
          <TooltipProvider delayDuration={300}>
            <UiTooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowAddWidget(true)}
                  className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Adicionar Widget</TooltipContent>
            </UiTooltip>
          </TooltipProvider>
        )}
      </div>

      {hasCustomWidgets ? (
        <ResponsiveGridLayout
          className="layout"
          width={containerWidth}
          layouts={{ lg: layout, md: layout, sm: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={{ lg: 3, md: 3, sm: 1 }}
          rowHeight={200}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".widget-drag-handle"
        >
          {widgets.map(widget => (
            <div key={widget.id}>
              <WidgetContainer
                widget={widget}
                items={allItems}
                columns={allColumns}
                groups={allGroups}
                boardId={activeBoard.id}
                profiles={users}
                isEditMode={isEditMode}
                onUpdate={handleUpdateWidget}
                onDelete={handleDeleteWidget}
                onConfigure={(w) => setConfiguringWidget(w)}
                onDuplicate={handleDuplicateWidget}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      ) : (
        /* Default auto-generated charts (backward compatible) */
        <DefaultDashboard
          allItems={allItems}
          allGroups={allGroups}
          allColumns={allColumns}
          users={users}
        />
      )}

      {/* Add Widget Catalog Dialog */}
      <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Widget</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {WIDGET_CATALOG.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  onClick={() => handleAddWidget(item.type)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center"
                >
                  <Icon className="w-8 h-8 text-primary" />
                  <span className="font-density-cell font-medium text-foreground">{item.label}</span>
                  <span className="font-density-tiny text-muted-foreground">{item.description}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Widget Config Panel (Sheet) */}
      {configuringWidget && (
        <WidgetConfigPanel
          open={!!configuringWidget}
          onOpenChange={(open) => { if (!open) setConfiguringWidget(null); }}
          widget={configuringWidget}
          boardId={activeBoard.id}
          columns={allColumns}
          items={allItems}
          groups={allGroups}
          onSave={({ config, widget_type }) => {
            updateWidget.mutate({
              id: configuringWidget.id,
              config: config ?? configuringWidget.config,
              widget_type: widget_type ?? configuringWidget.widget_type,
            });
            setConfiguringWidget(null);
          }}
        />
      )}
    </div>
    </DashboardFilterProvider>
  );
};

// Cross-widget filter banner component
const DashboardFilterBanner: React.FC = () => {
  const { activeFilter, clearDashboardFilter } = useDashboardFilter();
  if (!activeFilter) return null;

  return (
    <div className="flex items-center gap-2 px-1 py-2 bg-primary/10 rounded-lg border border-primary/20 mb-3 text-sm">
      <Filter className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      <span className="text-foreground flex-1">
        Filtrando por: <span className="font-medium">{activeFilter.label}</span>
      </span>
      <button
        onClick={clearDashboardFilter}
        className="p-0.5 rounded hover:bg-primary/20 text-primary transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default BoardDashboard;
