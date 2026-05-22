import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useBoardViews } from '@/hooks/useBoardViews';
import { useProfiles } from '@/hooks/useSupabaseData';
import NotionListRow from './NotionListRow';
import type { Column } from '@/types/board';

interface NotionListViewProps {
  mode?: 'database' | 'board';
}

/**
 * Notion list view refinada (paleta cinza pura).
 *
 * Diferente de DatabaseListView LFPro:
 *  - Linha compacta (~40px), nao py-3
 *  - Nome inline + chips a direita (sem empilhamento)
 *  - Hover sutil notion-row-hover
 *  - Border bottom 1px notion-border
 *
 * visibleProps: le de board_views.config.visibleProps (da view list_detailed ativa).
 * Default: 1a coluna de cada [status, date, people].
 */
const NotionListView: React.FC<NotionListViewProps> = ({ mode = 'database' }) => {
  const { activeBoard, setSelectedItem } = useApp();
  const { data: views = [] } = useBoardViews(activeBoard?.id ?? null);
  const { data: profiles = [] } = useProfiles();

  // Encontra a view list_detailed ativa (apenas para ler visibleProps).
  // Notion view e renderizada quando o renderer despacha por viewType='list_detailed' + style='notion',
  // entao se chegou aqui, ha view list_detailed.
  const visibleColumns: Column[] = useMemo(() => {
    if (!activeBoard) return [];
    const listView = views.find((v) => v.view_type === 'list_detailed');
    const cfg = (listView?.config as Record<string, unknown> | null | undefined) ?? {};
    const configIds = Array.isArray(cfg.visibleProps) ? (cfg.visibleProps as string[]) : null;
    if (configIds && configIds.length > 0) {
      return configIds
        .map((id) => activeBoard.columns.find((c) => c.id === id))
        .filter((c): c is Column => !!c);
    }
    return (['status', 'date', 'people'] as const)
      .map((t) => activeBoard.columns.find((c) => c.type === t))
      .filter((c): c is Column => !!c);
  }, [activeBoard, views]);

  if (!activeBoard) {
    return <div className="p-4 text-sm notion-text-secondary">Carregando lista...</div>;
  }

  const totalItems = activeBoard.groups.reduce((acc, g) => acc + g.items.length, 0);
  const groupsWithItems = activeBoard.groups.filter((g) => g.items.length > 0);

  const containerClass =
    mode === 'database'
      ? 'max-h-[640px] overflow-y-auto rounded-md border'
      : 'h-full overflow-y-auto';

  return (
    <div
      className={containerClass}
      style={{ borderColor: 'var(--notion-border)', backgroundColor: 'var(--notion-bg)' }}
    >
      {/* Header counter */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b sticky top-0 z-10"
        style={{ borderColor: 'var(--notion-border)', backgroundColor: 'var(--notion-header-bg)' }}
      >
        <span
          className="text-[11px] font-medium uppercase tracking-wide"
          style={{ color: 'var(--notion-text-secondary)' }}
        >
          {totalItems} {totalItems === 1 ? 'item' : 'itens'}
        </span>
      </div>

      {groupsWithItems.length === 0 ? (
        <div className="px-3 py-6 text-center text-sm notion-text-secondary">
          Nenhum item ainda.
        </div>
      ) : (
        groupsWithItems.map((group) => (
          <div key={group.id}>
            {activeBoard.groups.length > 1 && (
              <div
                className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide border-b"
                style={{
                  color: 'var(--notion-text-secondary)',
                  backgroundColor: 'var(--notion-panel)',
                  borderColor: 'var(--notion-border)',
                }}
              >
                {group.title}
              </div>
            )}
            {group.items.map((item) => (
              <NotionListRow
                key={item.id}
                item={item}
                visibleColumns={visibleColumns}
                profiles={profiles}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default NotionListView;
