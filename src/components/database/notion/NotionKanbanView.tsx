import React, { useMemo } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useApp } from '@/context/AppContext';
import { useProfiles, useUpdateColumnValue, useCreateItem } from '@/hooks/useSupabaseData';
import { useBoardViews } from '@/hooks/useBoardViews';
import { useKanbanStatusGroup, getDefaultKanbanStatusColumnId } from '@/hooks/useKanbanStatusGroup';
import NotionKanbanColumn from './NotionKanbanColumn';
import type { Column } from '@/types/board';

interface NotionKanbanViewProps {
  mode?: 'database' | 'board';
}

/**
 * Kanban Notion-style.
 *
 * - Agrupa items por valor de uma coluna status (1a coluna 'status' do board)
 * - Cada coluna mostra header subtle (dot color + label + count)
 * - Cards Notion-style com nome + 2-3 props (status, date, people defaults)
 * - Drag entre colunas atualiza o valor da coluna status via useUpdateColumnValue
 * - "+ Nova" inline cria item ja com status preselecionado
 *
 * Sem virtualizacao no MVP. Sem reorder dentro da mesma coluna (apenas mudanca de status).
 */
const NotionKanbanView: React.FC<NotionKanbanViewProps> = ({ mode = 'database' }) => {
  const { activeBoard, setSelectedItem } = useApp();
  const { data: profiles = [] } = useProfiles();
  const { data: views = [] } = useBoardViews(activeBoard?.id ?? null);
  const updateColumnValue = useUpdateColumnValue();
  const createItem = useCreateItem();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Resolve statusColumnId: view.config.kanbanStatusColumnId > default 1a coluna status
  const statusColumnId = useMemo<string | null>(() => {
    if (!activeBoard) return null;
    const kanbanView = views.find((v) => v.view_type === 'kanban');
    const cfg = kanbanView?.config as Record<string, unknown> | null | undefined;
    const persisted = cfg?.kanbanStatusColumnId;
    if (typeof persisted === 'string' && activeBoard.columns.some((c) => c.id === persisted && c.type === 'status')) {
      return persisted;
    }
    return getDefaultKanbanStatusColumnId(activeBoard);
  }, [activeBoard, views]);

  const { columns, statusCol } = useKanbanStatusGroup(activeBoard ?? null, statusColumnId);

  // Resolve visibleColumns para os cards. Default: [status, date, people] (1a de cada tipo no board)
  const visibleColumns: Column[] = useMemo(() => {
    if (!activeBoard) return [];
    const kanbanView = views.find((v) => v.view_type === 'kanban');
    const cfg = kanbanView?.config as Record<string, unknown> | null | undefined;
    const configIds = Array.isArray(cfg?.visibleProps) ? (cfg!.visibleProps as string[]) : null;
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
    return <div className="p-4 text-sm notion-text-secondary">Carregando kanban...</div>;
  }

  if (!statusCol) {
    return (
      <div className="p-6 text-center text-sm notion-text-secondary">
        Kanban precisa de uma coluna de tipo "Status" no board.
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const itemId = event.active.data.current?.itemId as string | undefined;
    const targetStatusKey = event.over?.data.current?.statusKey as string | undefined;
    if (!itemId || !targetStatusKey) return;

    const item = activeBoard.groups.flatMap((g) => g.items).find((i) => i.id === itemId);
    if (!item) return;

    const currentValue = item.columnValues?.[statusCol.id]?.value;
    const nextValue = targetStatusKey === '__none__' ? null : targetStatusKey;
    if (currentValue === nextValue) return;

    const labelName =
      nextValue && statusCol.settings?.labels?.[nextValue]
        ? statusCol.settings.labels[nextValue].name
        : '';

    updateColumnValue.mutate({
      itemId: item.id,
      columnId: statusCol.id,
      value: nextValue,
      text: labelName,
      boardId: activeBoard.id,
      oldValue: currentValue,
      columnType: 'status',
      itemName: item.name,
    });
  };

  const handleCreate = (statusKey: string, name: string) => {
    const firstGroup = activeBoard.groups[0];
    if (!firstGroup) return;
    createItem.mutate(
      { boardId: activeBoard.id, groupId: firstGroup.id, name },
      {
        onSuccess: (data) => {
          if (statusKey === '__none__') return;
          const labelName = statusCol.settings?.labels?.[statusKey]?.name ?? '';
          updateColumnValue.mutate({
            itemId: data.id,
            columnId: statusCol.id,
            value: statusKey,
            text: labelName,
            boardId: activeBoard.id,
            columnType: 'status',
            itemName: name,
          });
        },
      }
    );
  };

  const containerClass =
    mode === 'database'
      ? 'max-h-[640px] overflow-auto p-3'
      : 'h-full overflow-auto p-4';

  return (
    <div className={containerClass} style={{ backgroundColor: 'var(--notion-bg)' }}>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 items-start min-h-[400px]">
          {columns.map((col) => (
            <NotionKanbanColumn
              key={col.key}
              column={col}
              visibleColumns={visibleColumns}
              profiles={profiles}
              onCardClick={(item) => setSelectedItem(item)}
              onCreate={(key, name) => handleCreate(key, name)}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
};

export default NotionKanbanView;
