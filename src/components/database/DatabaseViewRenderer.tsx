import React from 'react';
import { useBoardViews } from '@/hooks/useBoardViews';
import DatabaseBoardContext from './DatabaseBoardContext';
import BoardTable from '@/components/board/BoardTable';
import BoardKanban from '@/components/board/BoardKanban';
import BoardCalendar from '@/components/board/BoardCalendar';
import DatabaseListView from './DatabaseListView';
import type { DatabaseViewType } from '@/types/database';

interface Props {
  boardId: string;
  /**
   * Id da view ativa (vem de DatabaseViewTabs no plano 02-08).
   * Se null/undefined, usa is_default ou primeira view.
   */
  activeViewId?: string | null;
}

/**
 * Renderer da view ativa da database inline.
 *
 * Envolve BoardTable/Kanban/Calendar com `DatabaseBoardContext` (que injeta
 * `boardIdOverride` no BoardProvider local), garantindo que cada bloco
 * database renderize seu proprio board sem alterar o board ativo do app.
 *
 * O switch entre views (table/kanban/calendar/list_detailed) e determinado
 * por `board_views.view_type` da view ativa.
 */
const DatabaseViewRenderer: React.FC<Props> = ({ boardId, activeViewId }) => {
  const { data: views = [], isLoading } = useBoardViews(boardId);

  if (isLoading) {
    return (
      <div className="px-3 py-4 font-density-cell text-muted-foreground">
        Carregando views...
      </div>
    );
  }

  // Determina view ativa: explicita > is_default > primeira > fallback table
  const activeView = activeViewId
    ? views.find((v) => v.id === activeViewId)
    : views.find((v) => v.is_default) ?? views[0];

  // Sem nenhuma view registrada: fallback para Tabela (comportamento defensivo
  // - 02-05 cria 4 views ao criar database, mas se algo der errado nao quebra)
  const viewType: DatabaseViewType = (activeView?.view_type as DatabaseViewType) ?? 'table';

  return (
    <DatabaseBoardContext boardId={boardId}>
      {viewType === 'table' && <BoardTable mode="database" />}
      {viewType === 'kanban' && <BoardKanban mode="database" />}
      {viewType === 'calendar' && <BoardCalendar mode="database" />}
      {viewType === 'list_detailed' && <DatabaseListView mode="database" />}
    </DatabaseBoardContext>
  );
};

export default DatabaseViewRenderer;
