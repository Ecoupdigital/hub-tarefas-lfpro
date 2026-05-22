import React from 'react';
import { useBoardViews } from '@/hooks/useBoardViews';
import DatabaseBoardContext from './DatabaseBoardContext';
import BoardTable from '@/components/board/BoardTable';
import BoardKanban from '@/components/board/BoardKanban';
import BoardCalendar from '@/components/board/BoardCalendar';
import DatabaseListView from './DatabaseListView';
import NotionTableView from './notion/NotionTableView';
import NotionKanbanView from './notion/NotionKanbanView';
import NotionCalendarView from './notion/NotionCalendarView';
import NotionListView from './notion/NotionListView';
import { getViewStyle } from '@/types/database';
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
 *
 * Fase 03: adicionalmente despacha por `board_views.config.style` ('lfpro'|'notion').
 * Quando style='notion', renderiza componentes Notion* dentro de `<div className="notion-view">`
 * para escopar a paleta cinza neutra (variaveis CSS em src/styles/notion-theme.css).
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
  const style = getViewStyle(activeView ?? null);

  const lfproContent = (
    <>
      {viewType === 'table' && <BoardTable mode="database" />}
      {viewType === 'kanban' && <BoardKanban mode="database" />}
      {viewType === 'calendar' && <BoardCalendar mode="database" />}
      {viewType === 'list_detailed' && (
        <DatabaseListView mode="database" activeViewId={activeView?.id ?? null} />
      )}
    </>
  );

  const notionContent = (
    <div className="notion-view">
      {viewType === 'table' && <NotionTableView mode="database" />}
      {viewType === 'kanban' && <NotionKanbanView mode="database" />}
      {viewType === 'calendar' && <NotionCalendarView mode="database" />}
      {viewType === 'list_detailed' && <NotionListView mode="database" />}
    </div>
  );

  return (
    <DatabaseBoardContext boardId={boardId}>
      {style === 'notion' ? notionContent : lfproContent}
    </DatabaseBoardContext>
  );
};

export default DatabaseViewRenderer;
