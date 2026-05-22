import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { StatusPill, PersonAvatar } from './notionInlineCell';
import type { Column, Item, StatusLabel } from '@/types/board';

interface Profile {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
}

interface NotionListRowProps {
  item: Item;
  visibleColumns: Column[];
  profiles: Profile[];
  onClick: () => void;
}

/**
 * Linha Notion list view.
 *
 * Layout horizontal compacto (~40px):
 *  +----------------------------------------------------------------+
 *  | Nome do item             [status] [data] [avatars] [num] ...   |
 *  +----------------------------------------------------------------+
 *
 * Sem empilhamento. Chips a direita em ordem visibleColumns.
 */
const NotionListRow: React.FC<NotionListRowProps> = ({ item, visibleColumns, profiles, onClick }) => {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 border-b notion-row-hover text-left"
      style={{
        minHeight: 'var(--notion-list-row-h)',
        borderColor: 'var(--notion-border)',
      }}
      aria-label={`Abrir item ${item.name}`}
    >
      <span
        className="flex-1 min-w-0 text-sm font-medium truncate"
        style={{ color: 'var(--notion-text-primary)' }}
      >
        {item.name || <span className="notion-text-tertiary">Sem titulo</span>}
      </span>

      <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end max-w-[60%]">
        {visibleColumns.map((col) => {
          const raw = item.columnValues?.[col.id]?.value;
          if (raw === null || raw === undefined || raw === '') return null;

          if (col.type === 'status') {
            const label = col.settings?.labels?.[raw as string] as StatusLabel | undefined;
            return label ? <StatusPill key={col.id} label={label} /> : null;
          }

          if (col.type === 'date') {
            const dateStr = typeof raw === 'string' ? raw : (raw as { date?: string })?.date;
            if (!dateStr) return null;
            try {
              const d = parseISO(dateStr);
              if (!isValid(d)) return null;
              return (
                <span
                  key={col.id}
                  className="inline-flex items-center gap-1 text-[11px]"
                  style={{ color: 'var(--notion-text-secondary)' }}
                >
                  <Calendar className="w-3 h-3" />
                  {format(d, "d 'de' MMM", { locale: ptBR })}
                </span>
              );
            } catch {
              return null;
            }
          }

          if (col.type === 'people') {
            const ids = Array.isArray(raw) ? raw : [];
            if (ids.length === 0) return null;
            return (
              <span key={col.id} className="flex items-center gap-0.5">
                {ids.slice(0, 3).map((id) => (
                  <PersonAvatar key={id} profile={profileMap.get(id)} />
                ))}
                {ids.length > 3 && (
                  <span className="text-[10px] notion-text-secondary ml-1">+{ids.length - 3}</span>
                )}
              </span>
            );
          }

          if (col.type === 'checkbox') {
            return (
              <span
                key={col.id}
                className="text-[11px]"
                style={{ color: raw ? 'var(--notion-blue)' : 'var(--notion-text-tertiary)' }}
              >
                {raw ? '✓ ' + col.title : ''}
              </span>
            );
          }

          // text / long_text / number / dropdown: chip texto
          const display =
            col.type === 'long_text' ? String(raw).slice(0, 40) :
            String(raw);
          return (
            <span
              key={col.id}
              className="text-[11px] px-1.5 py-0.5 rounded notion-panel notion-text-secondary truncate max-w-[160px]"
              style={{ backgroundColor: 'var(--notion-panel)' }}
              title={`${col.title}: ${display}`}
            >
              {display}
            </span>
          );
        })}
      </div>
    </button>
  );
};

export default NotionListRow;
