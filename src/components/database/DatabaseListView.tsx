import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useBoardViews } from '@/hooks/useBoardViews';
import { useProfiles } from '@/hooks/useSupabaseData';
import DatabaseListItem from './DatabaseListItem';
import DatabaseListViewConfig from './DatabaseListViewConfig';
import type { Column, Group } from '@/types/board';

interface DatabaseListViewProps {
  /**
   * 'board' usa container fullscreen, 'database' usa container compacto (default).
   */
  mode?: 'database' | 'board';
  /**
   * Id da view ativa (vem do DatabaseViewTabs no plano 02-08). Quando undefined,
   * pega a primeira view 'list_detailed' do board.
   */
  activeViewId?: string | null;
}

interface BoardViewRow {
  id: string;
  view_type: string;
  config: Record<string, unknown> | null;
  is_default?: boolean;
}

/**
 * View Notion-style "lista detalhada".
 *
 * Le do BoardProvider local (via useApp): activeBoard, profiles.
 * Agrupa items por group (espelha BoardTable/BoardCalendar). Cada item renderiza
 * com titulo grande + chips horizontais das visibleProps.
 *
 * Config persiste em board_views.config.visibleProps (array de column_ids).
 * Default visibleProps: primeiras colunas de tipo status/date/people.
 */
const DatabaseListView: React.FC<DatabaseListViewProps> = ({ mode = 'database', activeViewId }) => {
  const { activeBoard, setSelectedItem } = useApp();
  const { data: views = [] } = useBoardViews(activeBoard?.id ?? null);
  const { data: profiles = [] } = useProfiles();

  // View ativa: explicita > primeira list_detailed > undefined (default visibleProps)
  const listView: BoardViewRow | undefined = useMemo(() => {
    if (activeViewId) {
      return (views as BoardViewRow[]).find((v) => v.id === activeViewId);
    }
    return (views as BoardViewRow[]).find((v) => v.view_type === 'list_detailed');
  }, [views, activeViewId]);

  const baseConfig = (listView?.config ?? {}) as Record<string, unknown>;
  const configVisibleProps = Array.isArray(baseConfig.visibleProps)
    ? (baseConfig.visibleProps as string[])
    : null;

  // Default: primeira coluna de cada tipo desejado (status, date, people)
  const visibleProps = useMemo(() => {
    if (configVisibleProps && configVisibleProps.length > 0) {
      return configVisibleProps;
    }
    if (!activeBoard) return [];
    const defaults = ['status', 'date', 'people']
      .map((t) => activeBoard.columns.find((c) => c.type === t)?.id)
      .filter((id): id is string => !!id);
    return defaults;
  }, [configVisibleProps, activeBoard]);

  const visibleColumns: Column[] = useMemo(() => {
    if (!activeBoard) return [];
    return visibleProps
      .map((id) => activeBoard.columns.find((c) => c.id === id))
      .filter((c): c is Column => !!c);
  }, [visibleProps, activeBoard]);

  const totalItems = useMemo(() => {
    if (!activeBoard) return 0;
    return activeBoard.groups.reduce((acc, g) => acc + g.items.length, 0);
  }, [activeBoard]);

  if (!activeBoard) {
    return (
      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
        Carregando lista detalhada...
      </div>
    );
  }

  const containerClass =
    mode === 'database'
      ? 'max-h-[560px] overflow-y-auto bg-board-bg rounded-md'
      : 'h-full overflow-y-auto bg-board-bg';

  const groupsWithItems: Group[] = activeBoard.groups.filter((g) => g.items.length > 0);

  return (
    <div className={containerClass}>
      {/* Header com contador + botao de config */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 sticky top-0 z-10">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {totalItems} {totalItems === 1 ? 'item' : 'itens'}
        </span>
        {listView && (
          <DatabaseListViewConfig
            viewId={listView.id}
            columns={activeBoard.columns}
            visibleProps={visibleProps}
            baseConfig={baseConfig}
          />
        )}
      </div>

      {/* Empty state */}
      {totalItems === 0 && (
        <p className="px-3 py-10 text-center text-sm text-muted-foreground">
          Nenhum item ainda. Use a view Tabela para adicionar.
        </p>
      )}

      {/* Lista agrupada por group */}
      {groupsWithItems.map((g) => (
        <div key={g.id}>
          <div
            className="px-3 py-1.5 bg-muted/40 text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
            style={{ color: g.color || undefined }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: g.color || '#a89172' }}
            />
            {g.title}
            <span className="text-[10px] font-normal text-muted-foreground normal-case">
              {g.items.length}
            </span>
          </div>
          {g.items.map((item) => (
            <DatabaseListItem
              key={item.id}
              item={item}
              visibleColumns={visibleColumns}
              profiles={profiles}
              onClick={setSelectedItem}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default DatabaseListView;
