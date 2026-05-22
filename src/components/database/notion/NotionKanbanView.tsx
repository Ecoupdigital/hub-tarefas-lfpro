import React from 'react';
import { useApp } from '@/context/AppContext';

interface NotionKanbanViewProps {
  mode?: 'database' | 'board';
}

/** STUB Fase 03 plano 02 — substituido pelo plano 03-04. */
const NotionKanbanView: React.FC<NotionKanbanViewProps> = ({ mode = 'database' }) => {
  const { activeBoard } = useApp();
  return (
    <div className="p-6 text-center text-sm notion-text-secondary">
      <p className="font-medium notion-text-primary mb-1">Notion Kanban View</p>
      <p>Em construcao (plano 03-04).</p>
      {activeBoard && (
        <p className="mt-2 text-[11px] notion-text-tertiary">Board: {activeBoard.name} ({mode})</p>
      )}
    </div>
  );
};

export default NotionKanbanView;
