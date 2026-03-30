import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyWorkItems, type MyWorkItem } from '@/hooks/useMyWorkItems';
import { useItemFull } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  parseISO, isBefore, isSameDay, isAfter, format, isValid, isWithinInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronDown, ChevronRight, Search, Calendar, Briefcase, Inbox,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useApp } from '@/context/AppContext';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import WorkColumnSelector, { getAvailableColumns, getExtraValue, loadSelectedColumns } from '@/components/work/WorkColumnSelector';
import WorkExtraCell from '@/components/work/WorkExtraCell';

interface DateSection {
  key: string;
  label: string;
  color: string;
  items: MyWorkItem[];
}

interface Option { value: string; label: string; color?: string }

// ---- Date range filter ----
type DatePreset = 'all' | 'today' | 'this-week' | 'this-month' | 'custom';

function filterByDateRange(
  items: MyWorkItem[],
  preset: DatePreset,
  customStart?: string,
  customEnd?: string,
): MyWorkItem[] {
  if (preset === 'all') return items;
  const now = new Date();
  let start: Date;
  let end: Date;
  switch (preset) {
    case 'today':
      start = startOfDay(now); end = endOfDay(now); break;
    case 'this-week':
      start = startOfWeek(now, { weekStartsOn: 1 }); end = endOfWeek(now, { weekStartsOn: 1 }); break;
    case 'this-month':
      start = startOfMonth(now); end = endOfMonth(now); break;
    case 'custom':
      if (!customStart || !customEnd) return items;
      start = startOfDay(parseISO(customStart)); end = endOfDay(parseISO(customEnd)); break;
    default: return items;
  }
  return items.filter(item => {
    if (!item.dateValue) return false;
    try {
      const d = parseISO(item.dateValue);
      return isValid(d) && isWithinInterval(d, { start, end });
    } catch { return false; }
  });
}

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  all: 'Todas as datas',
  today: 'Hoje',
  'this-week': 'Esta semana',
  'this-month': 'Este mes',
  custom: 'Personalizado',
};

function MultiSelectFilter({
  label,
  unit,
  options,
  selected,
  onChange,
}: {
  label: string;
  unit: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const allSelected = selected.length === 0 || selected.length === options.length;

  const triggerLabel = () => {
    if (selected.length === 0) return label;
    if (selected.length === 1) {
      const opt = options.find(o => o.value === selected[0]);
      return opt?.label ?? label;
    }
    return `${selected.length} ${unit}`;
  };

  const toggleAll = () => {
    if (selected.length < options.length) {
      onChange(options.map(o => o.value));
    } else {
      onChange([]);
    }
  };

  const toggleOne = (value: string) => {
    if (selected.length === 0) {
      // Modo "mostrar tudo": clicar = excluir este = selecionar todos os outros
      onChange(options.filter(o => o.value !== value).map(o => o.value));
    } else if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 h-8 px-3 text-sm rounded-md border border-input bg-background text-foreground hover:bg-muted/50 transition-colors">
          <span className="truncate max-w-[160px]">{triggerLabel()}</span>
          {selected.length > 0 && selected.length < options.length && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        {/* Select all toggle */}
        <button
          onClick={toggleAll}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors"
        >
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            className="pointer-events-none"
          />
          <span className="font-medium">Selecionar todos</span>
        </button>
        <div className="my-1 border-t border-border" />
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => toggleOne(opt.value)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={selected.length === 0 ? true : selected.includes(opt.value)}
              onCheckedChange={() => toggleOne(opt.value)}
              className="pointer-events-none"
            />
            {opt.color && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: opt.color }}
              />
            )}
            <span className="truncate">{opt.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ---- Sort helper ----
function sortByDate(items: MyWorkItem[]): MyWorkItem[] {
  return [...items].sort((a, b) => {
    if (!a.dateValue && !b.dateValue) return 0;
    if (!a.dateValue) return 1;
    if (!b.dateValue) return -1;
    const aKey = a.dateValue + (a.startTime ? `T${a.startTime}` : '');
    const bKey = b.dateValue + (b.startTime ? `T${b.startTime}` : '');
    return aKey.localeCompare(bKey);
  });
}

function groupByDateSections(
  items: MyWorkItem[],
  statusFilters: string[],
  boardFilters: string[],
  searchQuery: string,
): DateSection[] {
  let filtered = items;

  if (statusFilters.length) {
    // Filter by label (human name) so cross-board items with the same
    // label are correctly grouped regardless of their raw value key.
    filtered = filtered.filter(i =>
      i.statusValue ? statusFilters.includes(i.statusValue.label) : false
    );
  }
  if (boardFilters.length) {
    filtered = filtered.filter(i => boardFilters.includes(i.boardId));
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.boardName.toLowerCase().includes(q)
    );
  }

  const today = startOfDay(new Date());
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Parse dates safely — invalid or missing dates go to "Sem data"
  const safeParseDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    try {
      const d = parseISO(dateStr);
      return isValid(d) ? d : null;
    } catch {
      return null;
    }
  };

  const overdue: MyWorkItem[] = [];
  const todayItems: MyWorkItem[] = [];
  const thisWeek: MyWorkItem[] = [];
  const upcoming: MyWorkItem[] = [];
  const noDate: MyWorkItem[] = [];

  for (const item of filtered) {
    const d = safeParseDate(item.dateValue);
    if (!d) {
      noDate.push(item);
    } else if (isSameDay(d, today)) {
      todayItems.push(item);
    } else if (isBefore(d, today)) {
      overdue.push(item);
    } else if (isBefore(d, weekEnd) || isSameDay(d, weekEnd)) {
      thisWeek.push(item);
    } else {
      upcoming.push(item);
    }
  }

  return [
    { key: 'overdue', label: 'Atrasado', color: '#E2445C', items: sortByDate(overdue) },
    { key: 'today', label: 'Hoje', color: '#0073EA', items: sortByDate(todayItems) },
    { key: 'this-week', label: 'Esta semana', color: '#00C875', items: sortByDate(thisWeek) },
    { key: 'upcoming', label: 'Proximo', color: '#C4C4C4', items: sortByDate(upcoming) },
    { key: 'no-date', label: 'Sem data', color: '#797E93', items: noDate },
  ].filter(s => s.items.length > 0);
}

const MyWork: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: items = [], isLoading } = useMyWorkItems();
  const { setSelectedItem, updateSelectedItem, setActiveBoardId, selectedItem } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [boardFilters, setBoardFilters] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [selectedExtraCols, setSelectedExtraCols] = useState<string[]>(() => loadSelectedColumns('mywork'));

  const availableExtraCols = useMemo(() => getAvailableColumns(items), [items]);

  // Carregar filtros persistidos assim que o user.id estiver disponível
  useEffect(() => {
    if (!user?.id) return;
    try {
      const p = JSON.parse(localStorage.getItem(`lfpro-mywork-filters-${user.id}`) ?? '{}');
      if (Array.isArray(p.statusFilters)) setStatusFilters(p.statusFilters);
      if (Array.isArray(p.boardFilters)) setBoardFilters(p.boardFilters);
    } catch { /* ignore */ }
  }, [user?.id]);

  // Salvar filtros automaticamente ao mudar
  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(
        `lfpro-mywork-filters-${user.id}`,
        JSON.stringify({ statusFilters, boardFilters }),
      );
    } catch { /* ignore */ }
  }, [statusFilters, boardFilters, user?.id]);

  const dateFilteredItems = useMemo(
    () => filterByDateRange(items, datePreset, customDateStart, customDateEnd),
    [items, datePreset, customDateStart, customDateEnd],
  );

  const sections = useMemo(
    () => groupByDateSections(dateFilteredItems, statusFilters, boardFilters, searchQuery),
    [dateFilteredItems, statusFilters, boardFilters, searchQuery],
  );

  // Unique boards and statuses for filters
  const uniqueBoards = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(i => map.set(i.boardId, i.boardName));
    return Array.from(map.entries());
  }, [items]);

  const uniqueStatuses = useMemo(() => {
    // Key by label (human name) instead of raw value key.
    // Raw keys like "3" or "done" are board-specific — the same key can mean
    // "Reunião agendada" in one board and "Finalizado" in another, so using
    // the label avoids cross-board collisions in the filter dropdown.
    const map = new Map<string, string>(); // label → color
    items.forEach(i => {
      if (i.statusValue && !map.has(i.statusValue.label)) {
        map.set(i.statusValue.label, i.statusValue.color);
      }
    });
    return Array.from(map.entries()); // [label, color][]
  }, [items]);

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Use selectedItem.id from context (survives remounts caused by
  // ErrorBoundary key={activeBoardId} change when setActiveBoardId is called)
  const openItemId = selectedItem?.id ?? null;
  const { data: fullItemData } = useItemFull(openItemId);

  useEffect(() => {
    if (!fullItemData) return;
    updateSelectedItem(fullItemData);
  }, [fullItemData, updateSelectedItem]);

  const handleItemClick = (item: MyWorkItem) => {
    const immediateItem = {
      id: item.id,
      name: item.name,
      boardId: item.boardId,
      groupId: item.groupId ?? '',
      position: item.position,
      columnValues: {} as Record<string, any>,
      createdAt: item.createdAt,
    };
    setSelectedItem(immediateItem);
    setActiveBoardId(item.boardId);
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Briefcase className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Meu trabalho</h1>
        <Badge variant="secondary" className="text-xs">
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar itens..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>

        {/* Board filter */}
        <MultiSelectFilter
          label="Todos os boards"
          unit="boards"
          options={uniqueBoards.map(([id, name]) => ({ value: id, label: name }))}
          selected={boardFilters}
          onChange={setBoardFilters}
        />

        {/* Status filter */}
        <MultiSelectFilter
          label="Todos os status"
          unit="status"
          options={uniqueStatuses.map(([label, color]) => ({ value: label, label, color }))}
          selected={statusFilters}
          onChange={setStatusFilters}
        />

        {/* Date filter */}
        <select
          value={datePreset}
          onChange={e => setDatePreset(e.target.value as DatePreset)}
          className="h-8 text-sm rounded-md border border-input bg-background px-2 text-foreground"
        >
          {Object.entries(DATE_PRESET_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={customDateStart}
              onChange={e => setCustomDateStart(e.target.value)}
              className="h-8 text-sm rounded-md border border-input bg-background px-2 text-foreground"
            />
            <span className="text-muted-foreground text-xs">ate</span>
            <input
              type="date"
              value={customDateEnd}
              onChange={e => setCustomDateEnd(e.target.value)}
              className="h-8 text-sm rounded-md border border-input bg-background px-2 text-foreground"
            />
          </div>
        )}

        {(statusFilters.length || boardFilters.length || searchQuery || datePreset !== 'all') && (
          <button
            onClick={() => { setStatusFilters([]); setBoardFilters([]); setSearchQuery(''); setDatePreset('all'); }}
            className="h-8 px-3 text-xs rounded-md border border-input bg-background text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpar filtros
          </button>
        )}

        <div className="ml-auto">
          <WorkColumnSelector
            page="mywork"
            available={availableExtraCols}
            selected={selectedExtraCols}
            onChange={setSelectedExtraCols}
          />
        </div>
      </div>

      {/* Sections */}
      {sections.map(section => (
        <div key={section.key} className="mb-4">
          {/* Section header */}
          <button
            onClick={() => toggleSection(section.key)}
            className="flex items-center gap-2 w-full text-left py-2 px-1 hover:bg-muted/50 rounded-md transition-colors"
          >
            {collapsedSections.has(section.key) ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: section.color }}
            />
            <span className="font-semibold text-sm">{section.label}</span>
            <Badge variant="secondary" className="text-xs ml-1">
              {section.items.length}
            </Badge>
          </button>

          {/* Section table */}
          {!collapsedSections.has(section.key) && (
            <div className="ml-6 border border-border rounded-md overflow-x-auto">
              {/* Table header */}
              <div
                className="grid gap-0 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide"
                style={{ gridTemplateColumns: `1fr 120px 100px 130px 120px 100px${selectedExtraCols.map(() => ' 120px').join('')}` }}
              >
                <div className="px-3 py-2">Item</div>
                <div className="px-3 py-2">Board</div>
                <div className="px-3 py-2">Grupo</div>
                <div className="px-3 py-2">Status</div>
                <div className="px-3 py-2">Data</div>
                <div className="px-3 py-2">Pessoa</div>
                {selectedExtraCols.map(key => {
                  const col = availableExtraCols.find(c => c.key === key);
                  return <div key={key} className="px-3 py-2 truncate">{col?.title || key}</div>;
                })}
              </div>

              {/* Table rows */}
              {section.items.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="grid gap-0 border-b border-border last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  style={{
                    height: 'var(--density-row-h, 36px)',
                    gridTemplateColumns: `1fr 120px 100px 130px 120px 100px${selectedExtraCols.map(() => ' 120px').join('')}`,
                  }}
                >
                  {/* Item name */}
                  <div className="px-3 flex items-center text-sm font-medium truncate">
                    {item.parentItemName ? (
                      <span className="flex items-center gap-1 truncate">
                        <span className="text-muted-foreground/50 text-xs flex-shrink-0">↳</span>
                        <span className="truncate">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground/40 flex-shrink-0 ml-1">({item.parentItemName})</span>
                      </span>
                    ) : item.name}
                  </div>

                  {/* Board */}
                  <div className="px-3 flex items-center text-xs text-muted-foreground truncate">
                    {item.boardName}
                  </div>

                  {/* Group */}
                  <div className="px-3 flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.groupColor }}
                    />
                    <span className="text-xs text-muted-foreground truncate">
                      {item.groupTitle}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="px-3 flex items-center">
                    {item.statusValue ? (
                      <span
                        className="inline-flex items-center justify-center w-full h-6 rounded text-xs font-medium text-white truncate px-2"
                        style={{ backgroundColor: item.statusValue.color }}
                      >
                        {item.statusValue.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="px-3 flex items-center text-xs">
                    {(() => {
                      if (!item.dateValue) return <span className="text-muted-foreground">--</span>;
                      try {
                        const d = parseISO(item.dateValue);
                        if (!isValid(d)) return <span className="text-muted-foreground">--</span>;
                        return (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            {format(d, 'dd MMM', { locale: ptBR })}
                            {item.startTime && (
                              <span className="text-muted-foreground/70 text-[10px]">
                                {item.startTime}{item.endTime ? `-${item.endTime}` : ''}
                              </span>
                            )}
                          </span>
                        );
                      } catch {
                        return <span className="text-muted-foreground">--</span>;
                      }
                    })()}
                  </div>

                  {/* People */}
                  <div className="px-3 flex items-center">
                    <div className="flex -space-x-1">
                      {item.people.slice(0, 3).map(person => (
                        <Avatar key={person.id} className="w-6 h-6 border border-background">
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                            {person.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {item.people.length > 3 && (
                        <span className="text-[10px] text-muted-foreground ml-1">
                          +{item.people.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Extra columns */}
                  {selectedExtraCols.map(key => {
                    const extra = getExtraValue(item, key);
                    return (
                      <div key={key} className="px-3 flex items-center text-xs overflow-hidden">
                        {extra ? <WorkExtraCell value={extra.value} type={extra.type} settings={extra.settings} /> : <span className="text-muted-foreground/40">--</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Nenhum item atribuído</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Quando alguém atribuir um item a você em qualquer board, ele aparecerá aqui.
          </p>
        </div>
      )}

      {/* No results after filter */}
      {items.length > 0 && sections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhum item encontrado com os filtros atuais.
          </p>
        </div>
      )}
    </div>
  );
};

export default MyWork;
