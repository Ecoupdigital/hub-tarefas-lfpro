import React from 'react';
import { NotionColumnIcon } from './notionColumnIcon';
import type { Column } from '@/types/board';

interface Props {
  columns: Column[];
  gutterWidth?: number;
}

const NotionTableHeader: React.FC<Props> = ({ columns, gutterWidth = 32 }) => (
  <div
    className="flex items-center sticky top-0 z-10 border-b"
    style={{ borderColor: 'var(--notion-border)', backgroundColor: 'var(--notion-header-bg)' }}
  >
    <div style={{ width: gutterWidth }} className="shrink-0" />
    <div
      className="flex-1 min-w-[200px] flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium"
      style={{ color: 'var(--notion-text-secondary)' }}
    >
      <NotionColumnIcon type="text" />
      <span>Nome</span>
    </div>
    {columns.map((col) => (
      <div
        key={col.id}
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium border-l"
        style={{
          width: Math.max(col.width || 140, 120),
          borderColor: 'var(--notion-border)',
          color: 'var(--notion-text-secondary)',
        }}
        title={col.title}
      >
        <NotionColumnIcon type={col.type} />
        <span className="truncate">{col.title}</span>
      </div>
    ))}
  </div>
);

export default NotionTableHeader;
