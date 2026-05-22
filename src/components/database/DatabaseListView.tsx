import React from 'react';

interface DatabaseListViewProps {
  mode?: 'database' | 'board';
}

/**
 * Lista detalhada Notion-style - STUB.
 *
 * Implementacao completa vem no plano 02-07. Aqui mantemos um placeholder
 * pra DatabaseViewRenderer compilar e renderizar algo coerente quando o
 * usuario seleciona a view de tipo 'list_detailed'.
 */
const DatabaseListView: React.FC<DatabaseListViewProps> = () => (
  <div className="px-3 py-6 text-center font-density-cell text-muted-foreground">
    Lista detalhada disponivel em breve (02-07).
  </div>
);

export default DatabaseListView;
