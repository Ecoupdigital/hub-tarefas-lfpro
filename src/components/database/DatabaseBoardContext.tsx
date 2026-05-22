import React from 'react';
import { BoardProvider } from '@/context/BoardContext';
import { FilterProvider } from '@/context/FilterContext';

interface DatabaseBoardContextProps {
  boardId: string;
  children: React.ReactNode;
}

/**
 * Wrapper que escopa um BoardProvider local ao boardId da database inline,
 * permitindo que BoardTable/Kanban/Calendar funcionem dentro de um bloco database
 * sem interferir no board ativo do app principal.
 *
 * Estrategia:
 *  - UIContext continua compartilhado (selectedItem aparece no painel global,
 *    activeBoardId do app NAO e alterado)
 *  - BoardProvider recebe `boardIdOverride` (Fase 02-06 estendeu BoardContext)
 *    que substitui o activeBoardId do UI somente neste sub-arvore
 *  - FilterProvider e re-instanciado localmente pra filtros/sort/hiddenColumns
 *    da database serem isolados do board principal
 *  - SelectionContext NAO e re-instanciado: ja vive em Index.tsx envolvendo
 *    todo o app autenticado. Multi-select que ficar ativo num board fica
 *    visualmente isolado porque a Selection limpa quando activeBoardId muda
 *    (e o activeBoardId do app permanece o do board original).
 */
const DatabaseBoardContext: React.FC<DatabaseBoardContextProps> = ({
  boardId,
  children,
}) => {
  return (
    <FilterProvider>
      <BoardProvider boardIdOverride={boardId}>{children}</BoardProvider>
    </FilterProvider>
  );
};

export default DatabaseBoardContext;
