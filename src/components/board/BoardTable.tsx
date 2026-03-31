import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useFilter } from '@/context/FilterContext';
import { useSelection } from '@/context/SelectionContext';
import { Group, Item } from '@/types/board';
import { useReorderItem, useReorderGroup, useBatchReorderItems, useMoveItemToGroup } from '@/hooks/useCrudMutations';
import { useAllSubitems } from '@/hooks/useSupabaseData';
import FilePreview from '@/components/shared/FilePreview';
import { type ItemFile } from '@/hooks/useFileUpload';
import CreateGroupModal from '@/components/modals/CreateGroupModal';
import DndProvider from '@/components/dnd/DndProvider';
import SortableItem from '@/components/dnd/SortableItem';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { getColorRulesForBoard, type ColorRule } from './ConditionalColorRules';
import { useBoardDependencies } from '@/hooks/useDependencies';
import BatchActionsBar from './BatchActionsBar';
import { DragOverlayRow } from './table/DragOverlayRow';
import { GroupSection } from './table/TableGroupSection';

const BoardTable: React.FC = () => {
  const { activeBoard, activeBoardId, columnValues } = useApp();
  const { activeFilterCount } = useFilter();
  const { selectedItems, clearSelection } = useSelection();
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [previewFile, setPreviewFile] = useState<ItemFile | null>(null);
  const { data: allSubitemsRaw = [] } = useAllSubitems(activeBoardId);

  // Monta mapa de column_values e injeta em cada subitem para que as células exibam dados corretos
  const allSubitems = useMemo(() => {
    const cvMap: Record<string, Record<string, { value: any }>> = {};
    for (const cv of columnValues) {
      if (!cvMap[cv.item_id]) cvMap[cv.item_id] = {};
      cvMap[cv.item_id][cv.column_id] = { value: cv.value };
    }
    return allSubitemsRaw.map((sub: any) => ({
      ...sub,
      columnValues: cvMap[sub.id] ?? {},
    }));
  }, [allSubitemsRaw, columnValues]);
  const reorderItem = useReorderItem();
  const batchReorderItems = useBatchReorderItems();
  const moveItemToGroup = useMoveItemToGroup();
  const reorderGroup = useReorderGroup();
  // Fetch board dependencies for blocking badge
  const { data: boardDeps = [] } = useBoardDependencies(activeBoardId);

  // Color rules from localStorage
  // Limpar seleção com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedItems.size > 0) clearSelection();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedItems.size, clearSelection]);

  const [colorRules, setColorRules] = useState<ColorRule[]>([]);
  useEffect(() => {
    if (activeBoardId) {
      setColorRules(getColorRulesForBoard(activeBoardId));
    } else {
      setColorRules([]);
    }
  }, [activeBoardId]);

  // Listen for color rules changes
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.boardId === activeBoardId) {
        setColorRules(getColorRulesForBoard(activeBoardId!));
      }
    };
    window.addEventListener('color-rules-changed', handler);
    return () => window.removeEventListener('color-rules-changed', handler);
  }, [activeBoardId]);

  // Listen for "Novo grupo" triggered from BoardHeader
  useEffect(() => {
    const handler = () => setShowCreateGroup(true);
    window.addEventListener('lfpro-create-group', handler);
    return () => window.removeEventListener('lfpro-create-group', handler);
  }, []);

  // Build map of all items for the drag overlay (must be before conditional return to respect hook rules)
  const allItemsMap = useMemo(() => {
    const map = new Map<string, Item>();
    if (activeBoard) {
      for (const group of activeBoard.groups) {
        for (const item of group.items) {
          map.set(item.id, item);
        }
      }
    }
    return map;
  }, [activeBoard]);

  // Compute blocked item map before conditional return (hooks must not be after early returns)
  const blockedItemMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!activeBoard || !boardDeps.length) return map;

    const statusColLocal = activeBoard.columns.find(c => c.type === 'status');
    const allItemsFlatLocal = activeBoard.groups.flatMap(g => g.items);

    const isItemDoneLocal = (itemId: string): boolean => {
      if (!statusColLocal) return false;
      const it = allItemsFlatLocal.find(i => i.id === itemId);
      if (!it) return false;
      const val = it.columnValues[statusColLocal.id]?.value;
      if (!val) return false;
      const label = statusColLocal.settings.labels?.[String(val)];
      if (label?.isDone) return true;
      const name = (label?.name || String(val)).toLowerCase();
      return name.includes('conclu') || name.includes('done') || name.includes('finaliz');
    };

    for (const dep of boardDeps) {
      let blockedId: string | null = null;
      let blockerId: string | null = null;

      if (dep.type === 'blocks') {
        blockedId = dep.target_item_id;
        blockerId = dep.source_item_id;
      } else if (dep.type === 'depends_on') {
        blockedId = dep.source_item_id;
        blockerId = dep.target_item_id;
      }

      if (!blockedId || !blockerId) continue;
      if (isItemDoneLocal(blockerId)) continue;

      const blockerItem = allItemsFlatLocal.find(i => i.id === blockerId);
      const blockerName = blockerItem?.name || 'Item desconhecido';

      const existing = map.get(blockedId) || [];
      existing.push(blockerName);
      map.set(blockedId, existing);
    }
    return map;
  }, [activeBoard, boardDeps]);

  if (!activeBoard) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Selecione um board na sidebar</p>
      </div>
    );
  }

  // Helper: find which group an item belongs to
  const findGroupForItem = (itemId: string): { group: Group; index: number } | null => {
    for (const group of activeBoard.groups) {
      const index = group.items.findIndex(i => i.id === itemId);
      if (index >= 0) return { group, index };
    }
    return null;
  };

  // Helper: find group by droppable id (droppable ids are `group-{groupId}`)
  const findGroupByDroppableId = (droppableId: string): Group | null => {
    const groupId = droppableId.replace('group-', '');
    return activeBoard.groups.find(g => g.id === groupId) || null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    // Handle group reorder (ids prefixed with 'grp-')
    if (activeId.startsWith('grp-') && overId.startsWith('grp-')) {
      const groups = activeBoard.groups;
      const activeGroupId = activeId.replace('grp-', '');
      const overGroupId = overId.replace('grp-', '');
      const oldIndex = groups.findIndex(g => g.id === activeGroupId);
      const newIndex = groups.findIndex(g => g.id === overGroupId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(groups, oldIndex, newIndex);
      const movedGrp = reordered[newIndex];
      const prevGrp = reordered[newIndex - 1];
      const nextGrp = reordered[newIndex + 1];
      let newPosition: number;
      if (!prevGrp && !nextGrp) {
        newPosition = Date.now();
      } else if (!prevGrp) {
        newPosition = nextGrp.position - 1;
      } else if (!nextGrp) {
        newPosition = prevGrp.position + 1;
      } else {
        newPosition = (prevGrp.position + nextGrp.position) / 2;
      }
      reorderGroup.mutate({ groupId: movedGrp.id, position: newPosition });
      return;
    }

    // Column reorder is handled by isolated DndContext in SortableColumnHeaders
    if (activeId.startsWith('col-')) return;

    const activeResult = findGroupForItem(activeId);
    if (!activeResult) return;

    // Determine target group: over could be an item id or a group droppable id
    let targetGroup: Group | null = null;
    let overIndex = -1;

    // Check if dropping over an item
    const overResult = findGroupForItem(overId);
    if (overResult) {
      targetGroup = overResult.group;
      overIndex = overResult.index;
    } else {
      // Dropping over a group droppable
      targetGroup = findGroupByDroppableId(overId);
      if (targetGroup) {
        overIndex = targetGroup.items.length; // append at end
      }
    }

    if (!targetGroup) return;

    const sameGroup = activeResult.group.id === targetGroup.id;

    if (sameGroup) {
      // Reorder within the same group
      const items = activeResult.group.items;
      const oldIndex = activeResult.index;
      const newIndex = overIndex;
      if (oldIndex === newIndex) return;

      const reordered = arrayMove(items, oldIndex, newIndex);

      // Check if positions have duplicates (degenerate case, e.g. legacy items all at position=0)
      const positionSet = new Set(items.map(i => i.position));
      const hasDegenerate = positionSet.size < items.length;

      if (hasDegenerate) {
        // Normalize ALL positions in the group to match the reordered visual order
        const updates = reordered.map((item, idx) => ({
          itemId: item.id,
          position: (idx + 1) * 1000,
        }));
        batchReorderItems.mutate({ updates });
      } else {
        // Efficient single-item midpoint update
        const movedItem = reordered[newIndex];
        const prevItem = reordered[newIndex - 1];
        const nextItem = reordered[newIndex + 1];
        let newPosition: number;
        if (!prevItem && !nextItem) {
          newPosition = Date.now();
        } else if (!prevItem) {
          newPosition = nextItem.position > 1 ? nextItem.position / 2 : nextItem.position - 1;
        } else if (!nextItem) {
          newPosition = prevItem.position + 1;
        } else {
          newPosition = (prevItem.position + nextItem.position) / 2;
        }
        reorderItem.mutate({ itemId: movedItem.id, position: newPosition });
      }
    } else {
      // Move to a different group
      const targetItems = targetGroup.items;

      // Check if target group has degenerate positions
      const targetPosSet = new Set(targetItems.map(i => i.position));
      const targetHasDegenerate = targetItems.length > 0 && targetPosSet.size < targetItems.length;

      if (targetHasDegenerate) {
        // Insert the moved item at the desired index, then normalize all positions
        const newTargetItems = [...targetItems];
        const insertAt = Math.min(overIndex, newTargetItems.length);
        // We need to assign position to the moved item after normalization
        // First compute all positions for existing items + the new one
        const updates: Array<{ itemId: string; position: number }> = [];
        for (let i = 0; i < newTargetItems.length; i++) {
          const adjustedIdx = i < insertAt ? i : i + 1;
          updates.push({ itemId: newTargetItems[i].id, position: (adjustedIdx + 1) * 1000 });
        }
        const newItemPosition = (insertAt + 1) * 1000;
        // Normalize existing items first, then move the item with correct position
        if (updates.length > 0) {
          batchReorderItems.mutate({ updates });
        }
        moveItemToGroup.mutate({
          itemId: activeId,
          groupId: targetGroup.id,
          position: newItemPosition,
        });
      } else {
        // Efficient single-item midpoint
        let newPosition: number;
        if (targetItems.length === 0) {
          newPosition = Date.now();
        } else if (overIndex >= targetItems.length) {
          newPosition = targetItems[targetItems.length - 1].position + 1;
        } else if (overIndex === 0) {
          newPosition = targetItems[0].position > 1 ? targetItems[0].position / 2 : targetItems[0].position - 1;
        } else {
          newPosition = (targetItems[overIndex - 1].position + targetItems[overIndex].position) / 2;
        }
        moveItemToGroup.mutate({
          itemId: activeId,
          groupId: targetGroup.id,
          position: newPosition,
        });
      }
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback is handled by the DroppableGroup component via isOver
  };

  // Flatten all item IDs across groups for range selection
  // Flatten all IDs: parent items + their subitems (interleaved for range selection)
  const allItemIds = useMemo(() => {
    const ids: string[] = [];
    for (const group of activeBoard.groups) {
      for (const item of group.items) {
        ids.push(item.id);
        const subs = allSubitems.filter((s: any) => s.parent_item_id === item.id);
        for (const sub of subs) {
          ids.push(sub.id);
        }
      }
    }
    return ids;
  }, [activeBoard.groups, allSubitems]);

  // No-results empty state when filters are active
  const hasFiltersActive = activeFilterCount > 0;
  const totalVisibleItems = activeBoard.groups.reduce((sum, g) => sum + g.items.length, 0);

  if (hasFiltersActive && totalVisibleItems === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Search className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">Nenhum item corresponde aos filtros aplicados.</p>
      </div>
    );
  }

  const renderDragOverlay = (activeId: string | null) => {
    if (!activeId) return null;

    // Column drag overlay is handled by SortableColumnHeaders' own DndContext
    if (activeId.startsWith('col-')) return null;

    const item = allItemsMap.get(activeId);
    if (!item) return null;
    return <DragOverlayRow item={item} columns={activeBoard.columns} />;
  };

  const groupDndIds = activeBoard.groups.map(g => `grp-${g.id}`);

  return (
    <div className="flex-1 overflow-auto scrollbar-thin" role="grid" aria-label="Tabela do board">
      <DndProvider onDragEnd={handleDragEnd} onDragOver={handleDragOver} renderOverlay={renderDragOverlay}>
        <div className="min-w-max">
          <SortableContext items={groupDndIds} strategy={verticalListSortingStrategy}>
            {activeBoard.groups.map(group => (
              <SortableItem key={group.id} id={`grp-${group.id}`}>
                {({ attributes, listeners, setNodeRef, isDragging, style }) => (
                  <div ref={setNodeRef} style={{ ...style, opacity: isDragging ? 0.6 : 1 }}>
                    <div {...attributes} {...listeners} className="absolute left-0 top-0 h-8 w-1.5 cursor-grab active:cursor-grabbing z-20" title="Arrastar grupo" />
                    <GroupSection group={group} columns={activeBoard.columns} boardId={activeBoard.id} allSubitems={allSubitems} allGroups={activeBoard.groups} allItemIds={allItemIds} colorRules={colorRules} onFilePreview={setPreviewFile} blockedItemMap={blockedItemMap} />
                  </div>
                )}
              </SortableItem>
            ))}
          </SortableContext>
          <button onClick={() => setShowCreateGroup(true)}
            className="flex items-center gap-1.5 px-3 py-2 font-density-cell text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="w-3.5 h-3.5" /> Adicionar grupo
          </button>
        </div>
      </DndProvider>
      <CreateGroupModal open={showCreateGroup} onOpenChange={setShowCreateGroup} boardId={activeBoard.id} />
      {selectedItems.size > 0 && <BatchActionsBar />}
      <FilePreview file={previewFile} open={!!previewFile} onOpenChange={(open) => { if (!open) setPreviewFile(null); }} />
    </div>
  );
};

export default BoardTable;
