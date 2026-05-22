import React from 'react';

interface Props {
  boardId: string;
}

/**
 * STUB - Tabs de view da database inline.
 *
 * Implementacao completa vem no plano 02-08:
 *  - Lista todas as board_views deste boardId
 *  - Tab ativo destacado
 *  - Botao "+" pra criar view nova
 *  - Persiste view ativa em estado local/url
 */
const DatabaseViewTabs: React.FC<Props> = () => (
  <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
    Tabs de view (implementacao em 02-08)
  </div>
);

export default DatabaseViewTabs;
