import React from 'react';

interface Props {
  boardId: string;
}

/**
 * STUB - Renderer da view ativa da database inline.
 *
 * Implementacao completa vem nos planos 02-06 (Tabela/Kanban/Calendario com
 * mode='database') e 02-07 (DatabaseListView - Lista detalhada Notion-style).
 *
 * Stub mostra apenas placeholder pra que o bloco compile e renderize sem quebra.
 */
const DatabaseViewRenderer: React.FC<Props> = ({ boardId }) => (
  <div className="px-3 py-4 text-sm text-muted-foreground">
    Conteudo da view sera implementado em 02-06/07.
    <span className="block text-xs opacity-70 mt-1 font-mono">boardId: {boardId}</span>
  </div>
);

export default DatabaseViewRenderer;
