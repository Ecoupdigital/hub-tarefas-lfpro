import React from 'react';
import type { Item } from '@/types/board';

interface NotionCalendarEventProps {
  item: Item;
  color: string;
  statusName?: string;
  onClick: () => void;
}

const NotionCalendarEvent: React.FC<NotionCalendarEventProps> = ({ item, color, statusName, onClick }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    title={statusName ? `${item.name} - ${statusName}` : item.name}
    className="w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate notion-hover transition-colors"
    style={{
      backgroundColor: `var(--notion-status-${color}-bg, var(--notion-status-gray-bg))`,
      color: `var(--notion-status-${color}, var(--notion-status-gray))`,
    }}
  >
    {item.name || 'Sem titulo'}
  </button>
);

export default NotionCalendarEvent;
