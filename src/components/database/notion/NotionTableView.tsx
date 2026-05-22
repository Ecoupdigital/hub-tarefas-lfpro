import React from 'react';
import { useApp } from '@/context/AppContext';

interface NotionTableViewProps {
  mode?: 'database' | 'board';
}

/**
 * STUB Fase 03 plano 02 — substituido por implementacao real no plano 03-03.
 *
 * Apenas exibe placeholder dizendo "Notion Table view em construcao" para que
 * o switch no DatabaseViewRenderer compile e a infraestrutura de toggle possa
 * ser validada antes de implementar a view completa.
 */
const NotionTableView: React.FC<NotionTableViewProps> = ({ mode = 'database' }) => {
  const { activeBoard } = useApp();

  return (
    <div className="p-6 text-center text-sm notion-text-secondary">
      <p className="font-medium notion-text-primary mb-1">Notion Table View</p>
      <p>Em construcao (plano 03-03).</p>
      {activeBoard && (
        <p className="mt-2 text-[11px] notion-text-tertiary">
          Board: {activeBoard.name} ({mode})
        </p>
      )}
    </div>
  );
};

export default NotionTableView;
