import React from 'react';
import { useApp } from '@/context/AppContext';

interface NotionListViewProps {
  mode?: 'database' | 'board';
}

/** STUB Fase 03 plano 02 — substituido pelo plano 03-06. */
const NotionListView: React.FC<NotionListViewProps> = ({ mode = 'database' }) => {
  const { activeBoard } = useApp();
  return (
    <div className="p-6 text-center text-sm notion-text-secondary">
      <p className="font-medium notion-text-primary mb-1">Notion List View</p>
      <p>Em construcao (plano 03-06).</p>
      {activeBoard && (
        <p className="mt-2 text-[11px] notion-text-tertiary">Board: {activeBoard.name} ({mode})</p>
      )}
    </div>
  );
};

export default NotionListView;
