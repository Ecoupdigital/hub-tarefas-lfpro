import React, { useState, useMemo } from 'react';
import { Columns3, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { MyWorkItem } from '@/hooks/useMyWorkItems';

export interface AvailableColumn {
  /** Unique key: lowercase title + type */
  key: string;
  title: string;
  type: string;
}

const STORAGE_KEY_PREFIX = 'lfpro-work-columns-';

export function loadSelectedColumns(page: 'mywork' | 'teamwork'): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + page);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function saveSelectedColumns(page: 'mywork' | 'teamwork', keys: string[]) {
  localStorage.setItem(STORAGE_KEY_PREFIX + page, JSON.stringify(keys));
}

/** Aggregate unique columns across all items by (title_lower + type) */
export function getAvailableColumns(items: MyWorkItem[]): AvailableColumn[] {
  const seen = new Map<string, AvailableColumn>();
  for (const item of items) {
    if (!item.extraColumns) continue;
    for (const ec of item.extraColumns) {
      const key = `${ec.columnTitle.toLowerCase()}::${ec.columnType}`;
      if (!seen.has(key)) {
        seen.set(key, { key, title: ec.columnTitle, type: ec.columnType });
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.title.localeCompare(b.title));
}

/** Get column value for an item given a column key */
export function getExtraValue(item: MyWorkItem, colKey: string): { value: any; settings?: any; type: string; columnId?: string } | null {
  if (!item.extraColumns) return null;
  for (const ec of item.extraColumns) {
    const key = `${ec.columnTitle.toLowerCase()}::${ec.columnType}`;
    if (key === colKey) {
      return { value: ec.value, settings: ec.settings, type: ec.columnType, columnId: ec.columnId };
    }
  }
  return null;
}

interface WorkColumnSelectorProps {
  page: 'mywork' | 'teamwork';
  available: AvailableColumn[];
  selected: string[];
  onChange: (keys: string[]) => void;
}

const TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  number: 'Numero',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  rating: 'Avaliacao',
  tags: 'Tags',
  email: 'Email',
  phone: 'Telefone',
  link: 'Link',
  progress: 'Progresso',
  long_text: 'Texto longo',
  timeline: 'Timeline',
  formula: 'Formula',
  color: 'Cor',
  location: 'Local',
  file: 'Arquivo',
  auto_number: 'Auto numero',
  creation_log: 'Criado em',
  last_updated: 'Atualizado em',
  time_tracking: 'Tempo',
  vote: 'Voto',
  button: 'Botao',
};

const WorkColumnSelector: React.FC<WorkColumnSelectorProps> = ({ page, available, selected, onChange }) => {
  const [open, setOpen] = useState(false);

  const toggle = (key: string) => {
    const next = selected.includes(key)
      ? selected.filter(k => k !== key)
      : [...selected, key];
    onChange(next);
    saveSelectedColumns(page, next);
  };

  if (available.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Columns3 className="w-3.5 h-3.5" />
          Colunas
          {selected.length > 0 && (
            <span className="bg-primary/15 text-primary text-[10px] font-bold px-1.5 rounded-full">
              {selected.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 py-1 mb-1">
          Colunas extras
        </p>
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {available.map(col => {
            const isActive = selected.includes(col.key);
            return (
              <button
                key={col.key}
                onClick={() => toggle(col.key)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors ${
                  isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                }`}>
                  {isActive && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <span className="truncate">{col.title}</span>
                <span className="text-[10px] text-muted-foreground/60 ml-auto flex-shrink-0">
                  {TYPE_LABELS[col.type] || col.type}
                </span>
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <button
            onClick={() => { onChange([]); saveSelectedColumns(page, []); }}
            className="w-full text-xs text-destructive hover:underline mt-2 py-1"
          >
            Limpar todas
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default WorkColumnSelector;
