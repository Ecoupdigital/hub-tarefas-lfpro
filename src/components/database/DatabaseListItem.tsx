import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import type { Column, Item } from '@/types/board';

interface Profile {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
}

interface DatabaseListItemProps {
  item: Item;
  visibleColumns: Column[];
  profiles: Profile[];
  onClick: (item: Item) => void;
}

/**
 * Renderiza UM item da DatabaseListView (Notion-style).
 *
 * Layout:
 *  - Linha 1: titulo grande (text-lg font-heading-medium), clicavel
 *  - Linha 2: chips horizontais das visibleColumns (status pill, data, avatares people, etc.)
 *  - py-3 border-b border-border, hover warm gold via bg-muted/30
 *
 * Os chips sao render-only. Edicao real abre o ItemDetailPanel via onClick.
 */
const DatabaseListItem: React.FC<DatabaseListItemProps> = ({
  item,
  visibleColumns,
  profiles,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className="w-full text-left py-3 px-3 border-b border-border last:border-b-0 hover:bg-muted/40 focus:bg-muted/40 focus:outline-none transition-colors"
      aria-label={`Abrir item ${item.name}`}
    >
      <h3
        className="font-heading text-lg font-medium text-foreground mb-1.5 truncate"
        title={item.name}
      >
        {item.name || 'Sem titulo'}
      </h3>
      {visibleColumns.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {visibleColumns.map((col) => {
            const cv = item.columnValues?.[col.id];
            if (!cv || cv.value === null || cv.value === undefined || cv.value === '') {
              return null;
            }
            return (
              <ListItemPropChip
                key={col.id}
                column={col}
                value={cv.value}
                profiles={profiles}
              />
            );
          })}
        </div>
      )}
    </button>
  );
};

/**
 * Render minimalista de uma propriedade por tipo de coluna (subset 8 tipos do MVP).
 * Esses chips sao read-only. Click no item abre ItemDetailPanel pra editar.
 */
const ListItemPropChip: React.FC<{
  column: Column;
  value: unknown;
  profiles: Profile[];
}> = ({ column, value, profiles }) => {
  const settings = column.settings ?? {};

  switch (column.type) {
    case 'status': {
      const key = String(value).replace(/^"|"$/g, '');
      const label = (settings.labels ?? {})[key];
      if (!label) return null;
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${label.color}22`, color: label.color }}
          title={`${column.title}: ${label.name}`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: label.color }}
          />
          {label.name}
        </span>
      );
    }

    case 'date': {
      let dateStr = '';
      if (typeof value === 'string') {
        const raw = value.replace(/^"|"$/g, '');
        try {
          const obj = JSON.parse(raw);
          if (obj && typeof obj === 'object' && obj.date) {
            dateStr = obj.date;
          } else {
            dateStr = raw;
          }
        } catch {
          dateStr = raw;
        }
      } else if (value && typeof value === 'object') {
        dateStr = (value as { date?: string }).date ?? '';
      }
      if (!dateStr) return null;
      try {
        const d = parseISO(dateStr);
        if (Number.isNaN(d.getTime())) return null;
        return (
          <span
            className="inline-flex items-center gap-1 text-muted-foreground"
            title={`${column.title}: ${dateStr}`}
          >
            <Calendar className="w-3 h-3" />
            {format(d, 'dd MMM yyyy', { locale: ptBR })}
          </span>
        );
      } catch {
        return null;
      }
    }

    case 'people': {
      const ids = Array.isArray(value) ? (value as string[]) : [];
      const people = ids
        .map((id) => profiles.find((p) => p.id === id))
        .filter((p): p is Profile => !!p);
      if (people.length === 0) return null;
      return (
        <span
          className="inline-flex items-center gap-1"
          title={`${column.title}: ${people.map((p) => p.name).join(', ')}`}
        >
          <span className="flex -space-x-1.5">
            {people.slice(0, 3).map((p) =>
              p.avatar_url ? (
                <img
                  key={p.id}
                  src={p.avatar_url}
                  alt={p.name}
                  className="w-5 h-5 rounded-full border-2 border-background object-cover"
                />
              ) : (
                <span
                  key={p.id}
                  className="w-5 h-5 rounded-full border-2 border-background bg-primary/20 text-primary text-[10px] flex items-center justify-center font-semibold"
                >
                  {p.name?.charAt(0).toUpperCase() ?? '?'}
                </span>
              ),
            )}
          </span>
          {people.length > 3 && (
            <span className="text-muted-foreground">+{people.length - 3}</span>
          )}
        </span>
      );
    }

    case 'number': {
      const n = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(n)) return null;
      return (
        <span
          className="font-tabular-nums text-muted-foreground"
          title={`${column.title}`}
        >
          {n.toLocaleString('pt-BR')}
          {settings.unit ? ` ${settings.unit}` : ''}
        </span>
      );
    }

    case 'checkbox': {
      const checked = value === true || value === 'true';
      return (
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
            checked
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}
          title={`${column.title}: ${checked ? 'Sim' : 'Nao'}`}
        >
          {checked ? 'Sim' : 'Nao'}
        </span>
      );
    }

    case 'dropdown': {
      const v = String(value).replace(/^"|"$/g, '');
      if (!v) return null;
      return (
        <span
          className="px-2 py-0.5 rounded bg-muted text-foreground"
          title={`${column.title}: ${v}`}
        >
          {v}
        </span>
      );
    }

    case 'text':
    case 'long_text': {
      const text = String(value).replace(/^"|"$/g, '');
      if (!text) return null;
      return (
        <span
          className="text-muted-foreground truncate max-w-[220px]"
          title={`${column.title}: ${text}`}
        >
          {text}
        </span>
      );
    }

    default:
      return null;
  }
};

export default DatabaseListItem;
