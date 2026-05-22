import React from 'react';
import { NotionInlineCell } from './notionInlineCell';
import type { Column, Item, ColumnValue } from '@/types/board';

interface Profile {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
}

interface NotionTableRowProps {
  item: Item;
  columns: Column[];
  profiles: Profile[];
  gutterWidth?: number;
  onChangeCell: (columnId: string, value: unknown, text?: string) => void;
  onChangeName: (name: string) => void;
  onOpen: () => void;
}

/**
 * Linha Notion:
 *  - min-height var(--notion-row-h) (32px)
 *  - hover bg var(--notion-row-hover) via classe notion-row-hover
 *  - border-bottom var(--notion-border)
 *  - sem zebra striping
 *  - titulo: click=abre ItemDetailPanel, dblclick=edita inline
 */
const NotionTableRow: React.FC<NotionTableRowProps> = ({
  item, columns, profiles, gutterWidth = 32, onChangeCell, onChangeName, onOpen,
}) => {
  const [editingName, setEditingName] = React.useState(false);
  const [localName, setLocalName] = React.useState(item.name);

  React.useEffect(() => setLocalName(item.name), [item.name]);

  return (
    <div
      className="group flex items-stretch notion-row-hover border-b"
      style={{ minHeight: 'var(--notion-row-h)', borderColor: 'var(--notion-border)' }}
    >
      <div style={{ width: gutterWidth }} className="shrink-0" />
      <div className="flex-1 min-w-[200px] flex items-center px-2 py-1">
        {editingName ? (
          <input
            autoFocus
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={() => {
              setEditingName(false);
              if (localName.trim() && localName !== item.name) onChangeName(localName.trim());
              else setLocalName(item.name);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') { setLocalName(item.name); setEditingName(false); }
            }}
            className="flex-1 bg-transparent border-none outline-none text-sm focus:ring-1 focus:ring-[var(--notion-blue)] rounded px-1"
            style={{ color: 'var(--notion-text-primary)' }}
          />
        ) : (
          <button
            type="button"
            onClick={onOpen}
            onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true); }}
            className="flex-1 text-left text-sm truncate hover:underline"
            style={{ color: 'var(--notion-text-primary)' }}
            title="Clicar para abrir, dois cliques para renomear"
          >
            {item.name || <span className="notion-text-tertiary">Sem titulo</span>}
          </button>
        )}
      </div>
      {columns.map((col) => {
        const cv: ColumnValue | undefined = item.columnValues?.[col.id];
        return (
          <div
            key={col.id}
            className="flex items-center px-1.5 border-l"
            style={{
              width: Math.max(col.width || 140, 120),
              borderColor: 'var(--notion-border)',
            }}
          >
            <NotionInlineCell
              column={col}
              value={cv}
              profiles={profiles}
              onChange={(value, text) => onChangeCell(col.id, value, text)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default NotionTableRow;
