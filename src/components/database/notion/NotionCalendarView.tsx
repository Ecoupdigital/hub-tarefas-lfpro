import React from 'react';
import { useApp } from '@/context/AppContext';

interface NotionCalendarViewProps {
  mode?: 'database' | 'board';
}

/** STUB Fase 03 plano 02 — substituido pelo plano 03-05. */
const NotionCalendarView: React.FC<NotionCalendarViewProps> = ({ mode = 'database' }) => {
  const { activeBoard } = useApp();
  return (
    <div className="p-6 text-center text-sm notion-text-secondary">
      <p className="font-medium notion-text-primary mb-1">Notion Calendar View</p>
      <p>Em construcao (plano 03-05).</p>
      {activeBoard && (
        <p className="mt-2 text-[11px] notion-text-tertiary">Board: {activeBoard.name} ({mode})</p>
      )}
    </div>
  );
};

export default NotionCalendarView;
