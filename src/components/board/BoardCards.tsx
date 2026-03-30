import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Settings2, Check, LayoutGrid } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Column, Item, StatusLabel } from '@/types/board';

const CARD_COLUMN_PREFS_KEY = 'lfpro-card-columns';

const getCardColumnPrefs = (boardId: string): string[] => {
  try {
    const stored = localStorage.getItem(CARD_COLUMN_PREFS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed[boardId] || [];
    }
  } catch { /* ignore */ }
  return [];
};

const setCardColumnPrefs = (boardId: string, columnIds: string[]) => {
  try {
    const stored = localStorage.getItem(CARD_COLUMN_PREFS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    parsed[boardId] = columnIds;
    localStorage.setItem(CARD_COLUMN_PREFS_KEY, JSON.stringify(parsed));
  } catch { /* ignore */ }
};

const StatusBadge: React.FC<{ value: any; labels: Record<string, StatusLabel> }> = ({ value, labels }) => {
  const label = value !== undefined ? labels[value] : undefined;
  if (!label) return null;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: label.color }}
    >
      {label.name}
    </span>
  );
};

const PeopleAvatars: React.FC<{ value: any }> = ({ value }) => {
  const { users } = useApp();
  const ids = Array.isArray(value) ? value : value ? [value] : [];
  if (ids.length === 0) return null;

  return (
    <div className="flex -space-x-1.5">
      {ids.slice(0, 3).map((id: string) => {
        const user = users.find(u => u.id === id);
        const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
        return (
          <div
            key={id}
            className="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-primary text-[9px] font-bold"
            title={user?.name || id}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
        );
      })}
      {ids.length > 3 && (
        <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-muted-foreground text-[9px] font-bold">
          +{ids.length - 3}
        </div>
      )}
    </div>
  );
};

const DateDisplay: React.FC<{ value: any }> = ({ value }) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return (
      <span className="text-xs text-muted-foreground">
        {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
      </span>
    );
  } catch {
    return null;
  }
};

const CellValueDisplay: React.FC<{ column: Column; value: any }> = ({ column, value }) => {
  if (value == null) return null;

  switch (column.type) {
    case 'status':
      return <StatusBadge value={value} labels={column.settings.labels || {}} />;
    case 'people':
      return <PeopleAvatars value={value} />;
    case 'date':
      return <DateDisplay value={value} />;
    case 'tags': {
      const tags = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',').map((t: string) => t.trim()) : [];
      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag: string) => (
            <span key={tag} className="px-1.5 py-0.5 rounded bg-muted text-xs text-foreground">{tag}</span>
          ))}
          {tags.length > 3 && <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>}
        </div>
      );
    }
    case 'progress': {
      const pct = typeof value === 'number' ? value : parseInt(value) || 0;
      return (
        <div className="flex items-center gap-1.5 w-full">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
      );
    }
    case 'rating': {
      const rating = typeof value === 'number' ? value : parseInt(value) || 0;
      return (
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < rating ? 'text-yellow-500' : 'text-muted-foreground/30'}>&#9733;</span>
          ))}
        </div>
      );
    }
    case 'checkbox':
      return value ? <Check className="w-4 h-4 text-accent" /> : null;
    default:
      return <span className="text-xs text-muted-foreground truncate">{String(value)}</span>;
  }
};

const ItemCard: React.FC<{ item: Item; visibleColumns: Column[] }> = ({ item, visibleColumns }) => {
  const { setSelectedItem } = useApp();

  // Find status column for left border color
  const statusCol = visibleColumns.find(c => c.type === 'status');
  const statusVal = statusCol ? item.columnValues[statusCol.id]?.value : undefined;
  const statusLabel = statusCol?.settings.labels?.[statusVal];
  const borderColor = statusLabel?.color || 'hsl(var(--border))';

  return (
    <button
      onClick={() => setSelectedItem(item)}
      className="bg-card border border-border rounded-lg p-3 hover:shadow-md hover:border-primary/30 transition-all text-left w-full group"
      style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
    >
      <p className="font-medium text-foreground text-sm mb-2 group-hover:text-primary transition-colors line-clamp-2">
        {item.name}
      </p>
      <div className="space-y-1.5">
        {visibleColumns.map(col => {
          const cv = item.columnValues[col.id];
          if (!cv?.value) return null;
          return (
            <div key={col.id} className="flex items-center gap-2">
              <CellValueDisplay column={col} value={cv.value} />
            </div>
          );
        })}
      </div>
    </button>
  );
};

const BoardCards: React.FC = () => {
  const { activeBoard } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const savedColumnIds = useMemo(() => {
    if (!activeBoard) return [];
    return getCardColumnPrefs(activeBoard.id);
  }, [activeBoard?.id]);

  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>(savedColumnIds);

  // Determine which columns to show on cards
  const visibleColumns = useMemo(() => {
    if (!activeBoard) return [];
    if (selectedColumnIds.length > 0) {
      return activeBoard.columns.filter(c => selectedColumnIds.includes(c.id));
    }
    // Default: show status, people, date columns (first of each type)
    const defaults: Column[] = [];
    const seen = new Set<string>();
    for (const col of activeBoard.columns) {
      if (['status', 'people', 'date'].includes(col.type) && !seen.has(col.type)) {
        defaults.push(col);
        seen.add(col.type);
      }
    }
    return defaults;
  }, [activeBoard, selectedColumnIds]);

  const toggleColumn = (columnId: string) => {
    setSelectedColumnIds(prev => {
      const next = prev.includes(columnId) ? prev.filter(id => id !== columnId) : [...prev, columnId];
      if (activeBoard) setCardColumnPrefs(activeBoard.id, next);
      return next;
    });
  };

  if (!activeBoard) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Selecione um board na sidebar</p>
      </div>
    );
  }

  const allItems = activeBoard.groups.flatMap(g => g.items);

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{allItems.length} itens</span>
        </div>
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted text-muted-foreground transition-colors text-sm">
              <Settings2 className="w-3.5 h-3.5" /> Campos
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="end">
            <p className="font-density-cell font-medium text-foreground mb-1.5">Campos nos cards</p>
            <div className="space-y-0.5">
              {activeBoard.columns.map(col => {
                const isSelected = selectedColumnIds.includes(col.id) || (selectedColumnIds.length === 0 && ['status', 'people', 'date'].includes(col.type));
                return (
                  <button
                    key={col.id}
                    onClick={() => toggleColumn(col.id)}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded font-density-cell transition-colors ${
                      isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="w-3.5 h-3.5 rounded-[3px] pointer-events-none"
                    />
                    <span className="truncate">{col.title}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Cards grid */}
      {allItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <p className="text-muted-foreground">Nenhum item encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {allItems.map(item => (
            <ItemCard key={item.id} item={item} visibleColumns={visibleColumns} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BoardCards;
