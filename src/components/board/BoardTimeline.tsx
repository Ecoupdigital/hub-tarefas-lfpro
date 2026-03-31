import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useBoardDependencies } from '@/hooks/useDependencies';
import { useUpdateColumnValue } from '@/hooks/useSupabaseData';
import {
  startOfDay, addDays, differenceInDays, format, parseISO,
  startOfWeek, startOfMonth, addWeeks, addMonths, isToday,
  subDays, subWeeks, subMonths, endOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

type ZoomLevel = 'day' | 'week' | 'month';

const ZOOM_CONFIG: Record<ZoomLevel, { periods: number; columnWidth: number }> = {
  day: { periods: 30, columnWidth: 40 },
  week: { periods: 12, columnWidth: 100 },
  month: { periods: 6, columnWidth: 160 },
};

const LEFT_PANEL_WIDTH = 250;
const ROW_HEIGHT = 36;
const BAR_HEIGHT = 28;
const HEADER_HEIGHT = 50;
const GROUP_HEADER_HEIGHT = 32;

const BoardTimeline: React.FC = () => {
  const { activeBoard, setSelectedItem, activeBoardId } = useApp();
  const { data: boardDeps = [] } = useBoardDependencies(activeBoardId);
  const updateColumnValue = useUpdateColumnValue();
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date(), { locale: ptBR }));
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drag state
  const dragState = useRef<{
    itemId: string;
    columnId: string;
    originalDate: Date;
    startX: number;
    currentDeltaDays: number;
  } | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragDeltaDays, setDragDeltaDays] = useState(0);

  const dateColumns = useMemo(() => {
    if (!activeBoard) return [];
    return activeBoard.columns.filter(c => c.type === 'date');
  }, [activeBoard]);

  const dateCol = dateColumns[0];
  const endDateCol = dateColumns.length >= 2 ? dateColumns[1] : null;
  const statusCol = activeBoard?.columns.find(c => c.type === 'status');

  const config = ZOOM_CONFIG[zoom];
  const totalWidth = config.periods * config.columnWidth;

  const getDateColumns = useMemo(() => {
    const cols: { date: Date; label: string; subLabel?: string }[] = [];
    for (let i = 0; i < config.periods; i++) {
      let date: Date;
      let label: string;
      let subLabel: string | undefined;
      if (zoom === 'day') {
        date = addDays(viewStart, i);
        label = format(date, 'dd', { locale: ptBR });
        subLabel = format(date, 'EEE', { locale: ptBR });
      } else if (zoom === 'week') {
        date = addWeeks(viewStart, i);
        label = format(date, 'dd/MM', { locale: ptBR });
        subLabel = `Sem ${format(date, 'w')}`;
      } else {
        date = addMonths(startOfMonth(viewStart), i);
        label = format(date, 'MMM yyyy', { locale: ptBR });
      }
      cols.push({ date, label, subLabel });
    }
    return cols;
  }, [viewStart, zoom, config.periods]);

  const viewEnd = useMemo(() => {
    if (zoom === 'day') return addDays(viewStart, config.periods);
    if (zoom === 'week') return addWeeks(viewStart, config.periods);
    return addMonths(startOfMonth(viewStart), config.periods);
  }, [viewStart, zoom, config.periods]);

  const totalDays = differenceInDays(viewEnd, viewStart);

  const parseDate = (val: any): Date | null => {
    if (!val) return null;
    const raw = typeof val === 'string' ? val.replace(/^"|"$/g, '') : String(val);
    try {
      const d = parseISO(raw);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const getBarPosition = (itemDate: Date): number => {
    const days = differenceInDays(startOfDay(itemDate), startOfDay(viewStart));
    return (days / totalDays) * totalWidth;
  };

  const getBarWidth = (start: Date, end: Date | null): number => {
    if (end) {
      const span = Math.max(1, differenceInDays(startOfDay(end), startOfDay(start)) + 1);
      return (span / totalDays) * totalWidth;
    }
    // Default width based on zoom
    if (zoom === 'day') return config.columnWidth;
    if (zoom === 'week') return config.columnWidth / 2;
    return config.columnWidth / 4;
  };

  const getItemColor = (item: any): string => {
    if (!statusCol) return 'hsl(var(--primary))';
    const val = item.columnValues[statusCol.id]?.value;
    const label = val ? statusCol.settings.labels?.[val] : null;
    return label?.color || 'hsl(var(--muted-foreground))';
  };

  const getItemStatus = (item: any): string | null => {
    if (!statusCol) return null;
    const val = item.columnValues[statusCol.id]?.value;
    const label = val ? statusCol.settings.labels?.[val] : null;
    return label?.name || null;
  };

  const todayPos = useMemo(() => {
    const today = startOfDay(new Date());
    const days = differenceInDays(today, startOfDay(viewStart));
    if (days < 0 || days > totalDays) return null;
    return (days / totalDays) * totalWidth;
  }, [viewStart, totalDays, totalWidth]);

  const navigate = (dir: 1 | -1) => {
    if (zoom === 'day') {
      setViewStart(prev => dir === 1 ? addDays(prev, 7) : subDays(prev, 7));
    } else if (zoom === 'week') {
      setViewStart(prev => dir === 1 ? addWeeks(prev, 4) : subWeeks(prev, 4));
    } else {
      setViewStart(prev => dir === 1 ? addMonths(prev, 3) : subMonths(prev, 3));
    }
  };

  const goToToday = () => {
    if (zoom === 'day') {
      setViewStart(subDays(startOfDay(new Date()), 5));
    } else if (zoom === 'week') {
      setViewStart(startOfWeek(subWeeks(new Date(), 1), { locale: ptBR }));
    } else {
      setViewStart(subMonths(startOfMonth(new Date()), 1));
    }
  };

  const handleMouseEnter = (itemId: string, e: React.MouseEvent) => {
    setHoveredItem(itemId);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (hoveredItem) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
    setTooltipPos(null);
  };

  // Drag handlers para barras da timeline
  const handleBarMouseDown = useCallback((
    e: React.MouseEvent,
    itemId: string,
    columnId: string,
    originalDate: Date,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragState.current = {
      itemId,
      columnId,
      originalDate,
      startX: e.clientX,
      currentDeltaDays: 0,
    };
    setDraggingItemId(itemId);
    setDragDeltaDays(0);

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const pxPerDay = totalWidth / totalDays;
      const deltaPx = ev.clientX - dragState.current.startX;
      const delta = Math.round(deltaPx / pxPerDay);
      dragState.current.currentDeltaDays = delta;
      setDragDeltaDays(delta);
    };

    const onMouseUp = async () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (!dragState.current) return;
      const { itemId: dItemId, columnId: dColId, originalDate: dOrigDate, currentDeltaDays } = dragState.current;
      dragState.current = null;
      setDraggingItemId(null);
      setDragDeltaDays(0);
      if (currentDeltaDays !== 0) {
        const newDate = addDays(dOrigDate, currentDeltaDays);
        const newDateStr = format(newDate, 'yyyy-MM-dd');
        try {
          await updateColumnValue.mutateAsync({
            itemId: dItemId,
            columnId: dColId,
            value: newDateStr,
            text: format(newDate, 'dd/MM/yyyy', { locale: ptBR }),
          });
        } catch (err) {
          console.error('Erro ao atualizar data via drag:', err);
        }
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [totalWidth, totalDays, updateColumnValue]);

  if (!activeBoard) return null;

  if (!dateCol) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Adicione uma coluna de data para usar a visualização Timeline.
        </p>
      </div>
    );
  }

  // Build row data
  const rows: {
    type: 'group' | 'item';
    group?: any;
    item?: any;
    groupColor?: string;
  }[] = [];

  for (const group of activeBoard.groups) {
    rows.push({ type: 'group', group, groupColor: group.color });
    if (!group.isCollapsed) {
      for (const item of group.items) {
        rows.push({ type: 'item', item, groupColor: group.color });
      }
    }
  }

  const hoveredItemData = hoveredItem
    ? activeBoard.groups.flatMap(g => g.items).find(i => i.id === hoveredItem)
    : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-2.5 py-1 rounded-md font-density-cell font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-foreground ml-2">
            {format(viewStart, "dd MMM yyyy", { locale: ptBR })} — {format(viewEnd, "dd MMM yyyy", { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center bg-muted rounded-md p-0.5">
          {(['day', 'week', 'month'] as ZoomLevel[]).map(z => (
            <button
              key={z}
              onClick={() => {
                setZoom(z);
                if (z === 'day') setViewStart(subDays(startOfDay(new Date()), 5));
                else if (z === 'week') setViewStart(startOfWeek(subWeeks(new Date(), 1), { locale: ptBR }));
                else setViewStart(subMonths(startOfMonth(new Date()), 1));
              }}
              className={`px-2.5 py-1 rounded font-density-cell font-medium transition-colors ${
                zoom === z
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {z === 'day' ? 'Dia' : z === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - item names */}
        <div
          className="flex-shrink-0 border-r border-border bg-card overflow-y-auto"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          {/* Header spacer */}
          <div
            className="border-b border-border bg-muted/50 px-3 flex items-center"
            style={{ height: HEADER_HEIGHT }}
          >
            <span className="font-density-cell font-semibold text-muted-foreground uppercase">Itens</span>
          </div>

          {/* Rows */}
          {rows.map((row, idx) => {
            if (row.type === 'group') {
              return (
                <div
                  key={`group-${row.group.id}`}
                  className="flex items-center px-3 gap-2 border-b border-border"
                  style={{
                    height: GROUP_HEADER_HEIGHT,
                    backgroundColor: row.groupColor + '15',
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: row.groupColor }}
                  />
                  <span
                    className="font-density-cell font-bold truncate"
                    style={{ color: row.groupColor }}
                  >
                    {row.group.title}
                  </span>
                  <span className="font-density-tiny text-muted-foreground ml-auto">
                    {row.group.items.length}
                  </span>
                </div>
              );
            }
            return (
              <div
                key={`item-${row.item.id}`}
                className="flex items-center px-3 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                style={{ height: ROW_HEIGHT }}
                onClick={() => setSelectedItem(row.item)}
              >
                <span className="font-density-cell text-foreground truncate">{row.item.name}</span>
              </div>
            );
          })}
        </div>

        {/* Right panel - timeline */}
        <div className="flex-1 overflow-auto bg-board-bg" ref={scrollRef}>
          <div style={{ width: totalWidth, minHeight: '100%' }} className="relative">
            {/* Timeline header */}
            <div
              className="sticky top-0 z-10 flex border-b border-border bg-muted/50"
              style={{ height: HEADER_HEIGHT }}
            >
              {getDateColumns.map((col, i) => {
                const isTodayCol =
                  zoom === 'day' && isToday(col.date);
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center border-r border-border/50 text-center flex-shrink-0 ${
                      isTodayCol ? 'bg-primary/10' : ''
                    }`}
                    style={{ width: config.columnWidth }}
                  >
                    {col.subLabel && (
                      <span className="font-density-badge text-muted-foreground uppercase">
                        {col.subLabel}
                      </span>
                    )}
                    <span className={`font-density-cell font-medium ${isTodayCol ? 'text-primary font-bold' : 'text-foreground'}`}>
                      {col.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid lines */}
            <div className="absolute inset-0" style={{ top: HEADER_HEIGHT }}>
              {getDateColumns.map((col, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-border/30"
                  style={{ left: i * config.columnWidth }}
                />
              ))}
            </div>

            {/* Today indicator */}
            {todayPos !== null && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: todayPos }}
              >
                <div className="w-0.5 h-full bg-red-500/70" />
                <div
                  className="absolute top-0 w-3 h-3 rounded-full bg-red-500 -translate-x-[5px]"
                />
              </div>
            )}

            {/* Dependency arrows */}
            {boardDeps.length > 0 && (() => {
              // Build a map of item id -> row index (only item rows)
              const itemRowMap: Record<string, number> = {};
              let cumulativeY = HEADER_HEIGHT;
              rows.forEach((row) => {
                if (row.type === 'group') {
                  cumulativeY += GROUP_HEADER_HEIGHT;
                } else {
                  itemRowMap[row.item.id] = cumulativeY + ROW_HEIGHT / 2;
                  cumulativeY += ROW_HEIGHT;
                }
              });

              // Build item date positions
              const allItems = activeBoard!.groups.flatMap(g => g.items);
              const itemBarCenter: Record<string, { x: number; y: number }> = {};
              for (const item of allItems) {
                const startVal = dateCol ? item.columnValues[dateCol.id]?.value : null;
                const sd = parseDate(startVal);
                if (!sd || !itemRowMap[item.id]) continue;
                const endVal = endDateCol ? item.columnValues[endDateCol.id]?.value : null;
                const ed = endVal ? parseDate(endVal) : null;
                const left = getBarPosition(sd);
                const w = getBarWidth(sd, ed);
                itemBarCenter[item.id] = {
                  x: Math.max(0, left) + Math.min(w, totalWidth - Math.max(0, left)),
                  y: itemRowMap[item.id],
                };
              }

              const arrows = boardDeps.filter(dep =>
                itemBarCenter[dep.source_item_id] && itemBarCenter[dep.target_item_id]
              );

              if (arrows.length === 0) return null;

              return (
                <svg
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{ top: 0, left: 0, width: totalWidth, height: cumulativeY }}
                >
                  <defs>
                    <marker id="dep-arrow-solid" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                      <path d="M0,0 L6,2 L0,4 Z" fill="hsl(var(--primary))" opacity="0.6" />
                    </marker>
                    <marker id="dep-arrow-dashed" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                      <path d="M0,0 L6,2 L0,4 Z" fill="hsl(var(--muted-foreground))" opacity="0.4" />
                    </marker>
                  </defs>
                  {arrows.map(dep => {
                    const src = itemBarCenter[dep.source_item_id];
                    const tgt = itemBarCenter[dep.target_item_id];
                    const isRelated = dep.type === 'related';
                    const midX = (src.x + tgt.x) / 2;
                    const curveOffset = Math.abs(src.y - tgt.y) < ROW_HEIGHT ? 20 : 0;
                    return (
                      <path
                        key={dep.id}
                        d={`M${src.x},${src.y} C${midX + curveOffset},${src.y} ${midX - curveOffset},${tgt.y} ${tgt.x},${tgt.y}`}
                        fill="none"
                        stroke={isRelated ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))'}
                        strokeWidth={1.5}
                        strokeDasharray={isRelated ? '4 3' : 'none'}
                        opacity={isRelated ? 0.4 : 0.5}
                        markerEnd={isRelated ? 'url(#dep-arrow-dashed)' : 'url(#dep-arrow-solid)'}
                      />
                    );
                  })}
                </svg>
              );
            })()}

            {/* Rows with bars */}
            <div style={{ paddingTop: HEADER_HEIGHT }}>
              {rows.map((row, idx) => {
                if (row.type === 'group') {
                  return (
                    <div
                      key={`g-${row.group.id}`}
                      className="border-b border-border"
                      style={{
                        height: GROUP_HEADER_HEIGHT,
                        backgroundColor: row.groupColor + '08',
                      }}
                    />
                  );
                }

                const item = row.item;
                const startVal = item.columnValues[dateCol.id]?.value;
                const startDate = parseDate(startVal);
                const endVal = endDateCol
                  ? item.columnValues[endDateCol.id]?.value
                  : null;
                const endDate = endVal ? parseDate(endVal) : null;

                if (!startDate) {
                  return (
                    <div
                      key={`i-${item.id}`}
                      className="border-b border-border/30 flex items-center"
                      style={{ height: ROW_HEIGHT }}
                    >
                      <span className="font-density-tiny text-muted-foreground/40 italic pl-2 select-none">
                        sem data
                      </span>
                    </div>
                  );
                }

                const isDragging = draggingItemId === item.id;
                const effectiveDelta = isDragging ? dragDeltaDays : 0;
                const effectiveStart = effectiveDelta !== 0 ? addDays(startDate, effectiveDelta) : startDate;
                const left = getBarPosition(effectiveStart);
                const width = getBarWidth(effectiveStart, endDate && effectiveDelta !== 0 ? addDays(endDate, effectiveDelta) : endDate);
                const barColor = getItemColor(item);
                const isVisible = left + width > 0 && left < totalWidth;

                return (
                  <div
                    key={`i-${item.id}`}
                    className="relative border-b border-border/30"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {isVisible && (
                      <div
                        className={`absolute rounded-md flex items-center px-2 overflow-hidden select-none ${
                          isDragging
                            ? 'cursor-grabbing shadow-lg opacity-90'
                            : 'cursor-grab transition-all hover:brightness-110 hover:shadow-md'
                        }`}
                        style={{
                          left: Math.max(0, left),
                          width: Math.min(width, totalWidth - Math.max(0, left)),
                          height: BAR_HEIGHT,
                          top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                          backgroundColor: barColor,
                          zIndex: isDragging ? 20 : undefined,
                        }}
                        onClick={() => !isDragging && setSelectedItem(item)}
                        onMouseDown={(e) => handleBarMouseDown(e, item.id, dateCol.id, startDate)}
                        onMouseEnter={(e) => !draggingItemId && handleMouseEnter(item.id, e)}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                      >
                        <span className="font-density-tiny font-medium text-white truncate whitespace-nowrap">
                          {item.name}
                          {isDragging && effectiveDelta !== 0 && (
                            <span className="ml-1 opacity-80">
                              ({effectiveDelta > 0 ? '+' : ''}{effectiveDelta}d)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredItemData && tooltipPos && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg p-3 pointer-events-none"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y + 12,
            maxWidth: 280,
          }}
        >
          <p className="font-density-cell font-semibold text-foreground mb-1">
            {hoveredItemData.name}
          </p>
          {dateCol && (
            <p className="font-density-tiny text-muted-foreground">
              {dateCol.title}:{' '}
              {(() => {
                const d = parseDate(hoveredItemData.columnValues[dateCol.id]?.value);
                return d ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : '—';
              })()}
            </p>
          )}
          {endDateCol && (
            <p className="font-density-tiny text-muted-foreground">
              {endDateCol.title}:{' '}
              {(() => {
                const d = parseDate(hoveredItemData.columnValues[endDateCol.id]?.value);
                return d ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : '—';
              })()}
            </p>
          )}
          {getItemStatus(hoveredItemData) && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getItemColor(hoveredItemData) }}
              />
              <span className="font-density-tiny text-foreground">
                {getItemStatus(hoveredItemData)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BoardTimeline;
