import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useUpdateColumnValue, useCreateItem } from '@/hooks/useSupabaseData';
import { useReorderItem, useMoveItem, useBatchReorderItems } from '@/hooks/useCrudMutations';
import type { Item, StatusLabel, Column, Group } from '@/types/board';
import { Plus, ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';
import DndProvider from '@/components/dnd/DndProvider';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';

import type { KanbanSettings, KanbanColumn, Swimlane } from './kanban/KanbanTypes';
import { isLaneEligible, loadKanbanSettings, saveKanbanSettings } from './kanban/KanbanTypes';
import { getColumnLaneOptions, getItemLaneKeys } from './kanban/kanbanHelpers';
import { injectStyles } from './kanban/kanbanStyles';
import SortableKanbanCard from './kanban/KanbanCard';
import ColumnHeader from './kanban/KanbanColumnHeader';
import KanbanToolbar from './kanban/KanbanToolbar';
import { DroppableKanbanColumn, KanbanDragOverlay } from './kanban/DroppableKanbanColumn';

// ── Main Component ─────────────────────────────────────────────────────
const BoardKanban: React.FC = () => {
  const { activeBoard, setSelectedItem, users } = useApp();
  const updateColVal = useUpdateColumnValue();
  const createItem = useCreateItem();
  const reorderItem = useReorderItem();
  const batchReorderItems = useBatchReorderItems();
  const moveItem = useMoveItem();

  const [addingToCol, setAddingToCol] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [settings, setSettings] = useState<KanbanSettings>(() => loadKanbanSettings(activeBoard?.id));
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<Set<string>>(new Set());
  // Busca inline client-side (sem re-fetch)
  const [inlineSearch, setInlineSearch] = useState('');

  // Inject CSS animations once
  useEffect(() => { injectStyles(); }, []);

  // Reload settings when board changes
  useEffect(() => {
    if (activeBoard?.id) {
      setSettings(loadKanbanSettings(activeBoard.id));
    }
  }, [activeBoard?.id]);

  // Persist settings to localStorage on change
  useEffect(() => {
    saveKanbanSettings(activeBoard?.id, settings);
  }, [activeBoard?.id, settings]);

  // ── Colunas elegiveis para lanes (status, dropdown, tags) ──────────
  const laneEligibleCols = useMemo(() => {
    if (!activeBoard) return [];
    return activeBoard.columns.filter(c => isLaneEligible(c.type));
  }, [activeBoard]);

  // ── Coluna ativa para lanes no modo 'column' ──────────────────────
  const kanbanCol = useMemo(() => {
    if (!activeBoard || settings.kanbanMode !== 'column') return null;
    if (settings.kanbanColumnId) {
      const found = laneEligibleCols.find(c => c.id === settings.kanbanColumnId);
      if (found) return found;
    }
    // Fallback: primeira coluna status, ou primeira elegivel
    const firstStatus = laneEligibleCols.find(c => c.type === 'status');
    return firstStatus ?? laneEligibleCols[0] ?? null;
  }, [activeBoard, settings.kanbanMode, settings.kanbanColumnId, laneEligibleCols]);

  const peopleCol = useMemo(() => activeBoard?.columns.find(c => c.type === 'people') ?? null, [activeBoard]);
  const dateCol = useMemo(() => activeBoard?.columns.find(c => c.type === 'date') ?? null, [activeBoard]);
  const progressCol = useMemo(() => activeBoard?.columns.find(c => c.type === 'progress') ?? null, [activeBoard]);
  const tagsCol = useMemo(() => activeBoard?.columns.find(c => c.type === 'tags') ?? null, [activeBoard]);

  // Columns eligible for swimlane grouping
  const swimlaneOptions = useMemo(() => {
    if (!activeBoard) return [];
    return activeBoard.columns.filter(c => ['people', 'status', 'dropdown', 'tags'].includes(c.type));
  }, [activeBoard]);

  const swimlaneCol = useMemo(() => {
    if (!settings.swimlaneEnabled || !settings.swimlaneColumnId || !activeBoard) return null;
    return activeBoard.columns.find(c => c.id === settings.swimlaneColumnId) ?? null;
  }, [settings.swimlaneEnabled, settings.swimlaneColumnId, activeBoard]);

  // ── Build kanban data ────────────────────────────────────────────────
  const rawAllItems = useMemo(() => activeBoard?.groups.flatMap(g => g.items) ?? [], [activeBoard]);

  // Filtro client-side por busca inline (sem re-fetch)
  const allItems = useMemo(() => {
    const q = inlineSearch.trim().toLowerCase();
    if (!q) return rawAllItems;
    return rawAllItems.filter(item => item.name.toLowerCase().includes(q));
  }, [rawAllItems, inlineSearch]);

  // Build a map of all items for quick lookup
  const allItemsMap = useMemo(() => {
    const map = new Map<string, Item>();
    for (const item of allItems) {
      map.set(item.id, item);
    }
    return map;
  }, [allItems]);

  // ── Lane options (para modo coluna) ────────────────────────────────
  const kanbanLaneOptions = useMemo(() => {
    if (!kanbanCol) return new Map<string, StatusLabel>();
    return getColumnLaneOptions(kanbanCol, allItems);
  }, [kanbanCol, allItems]);

  // ── Build kanban columns por coluna ────────────────────────────────
  const buildKanbanColumnsByCol = useCallback((items: Item[]): KanbanColumn[] => {
    if (!kanbanCol) return [];
    const options = kanbanLaneOptions;

    const result: KanbanColumn[] = [];
    for (const [key, label] of options) {
      result.push({
        key,
        label,
        items: items.filter(item => {
          const keys = getItemLaneKeys(item, kanbanCol);
          return keys.includes(key);
        }),
      });
    }

    // "Sem valor" column
    result.push({
      key: '__none__',
      label: null,
      items: items.filter(item => {
        const keys = getItemLaneKeys(item, kanbanCol);
        return keys.length === 0;
      }),
    });

    return result;
  }, [kanbanCol, kanbanLaneOptions]);

  // ── Build kanban columns por grupo ─────────────────────────────────
  const buildKanbanColumnsByGroup = useCallback((items: Item[], groups: Group[]): KanbanColumn[] => {
    return [
      ...groups.map(group => ({
        key: `group:${group.id}`,
        label: { name: group.title, color: group.color } as StatusLabel,
        items: items.filter(item => item.groupId === group.id),
      })),
      {
        key: '__none__',
        label: null,
        items: items.filter(item => !groups.some(g => g.id === item.groupId)),
      },
    ];
  }, []);

  // ── Funcao unificada de build ──────────────────────────────────────
  const buildKanbanColumns = useCallback((items: Item[]): KanbanColumn[] => {
    if (settings.kanbanMode === 'group' && activeBoard) {
      return buildKanbanColumnsByGroup(items, activeBoard.groups);
    }
    return buildKanbanColumnsByCol(items);
  }, [settings.kanbanMode, activeBoard, buildKanbanColumnsByCol, buildKanbanColumnsByGroup]);

  const swimlanes: Swimlane[] = useMemo(() => {
    if (!settings.swimlaneEnabled) {
      return [{
        key: '__all__',
        title: '',
        columns: buildKanbanColumns(allItems),
        isCollapsed: false,
      }];
    }

    // Swimlane por grupo do board (modo 'group')
    if (settings.swimlaneMode === 'group' && activeBoard) {
      const result: Swimlane[] = [];
      for (const group of activeBoard.groups) {
        const groupItems = allItems.filter(item => item.groupId === group.id);
        result.push({
          key: group.id,
          title: group.title,
          color: group.color,
          columns: settings.kanbanMode === 'group'
            // Se lanes primarias JA sao por grupo, swimlanes por grupo nao faz sentido - mostrar flat
            ? buildKanbanColumnsByCol(groupItems)
            : buildKanbanColumns(groupItems),
          isCollapsed: collapsedSwimlanes.has(group.id),
        });
      }
      return result;
    }

    // Modo 'column': agrupar por valor de coluna selecionada
    if (!swimlaneCol) {
      return [{
        key: '__all__',
        title: '',
        columns: buildKanbanColumns(allItems),
        isCollapsed: false,
      }];
    }

    const groupMap = new Map<string, Item[]>();
    const groupMeta = new Map<string, { title: string; color?: string }>();

    for (const item of allItems) {
      const rawVal = item.columnValues[swimlaneCol.id]?.value;
      const keys: string[] = [];

      if (Array.isArray(rawVal)) {
        keys.push(...rawVal.map(String));
      } else if (rawVal) {
        keys.push(String(rawVal));
      } else {
        keys.push('__sem_valor__');
      }

      for (const k of keys) {
        if (!groupMap.has(k)) groupMap.set(k, []);
        groupMap.get(k)!.push(item);

        if (!groupMeta.has(k)) {
          if (k === '__sem_valor__') {
            groupMeta.set(k, { title: 'Sem valor' });
          } else if (swimlaneCol.type === 'people') {
            const user = users.find(u => u.id === k);
            groupMeta.set(k, { title: user?.name ?? k });
          } else if (swimlaneCol.type === 'status' && swimlaneCol.settings.labels?.[k]) {
            const sl = swimlaneCol.settings.labels[k];
            groupMeta.set(k, { title: sl.name, color: sl.color });
          } else {
            groupMeta.set(k, { title: k });
          }
        }
      }
    }

    const result: Swimlane[] = [];
    for (const [key, items] of groupMap) {
      const meta = groupMeta.get(key)!;
      result.push({
        key,
        title: meta.title,
        color: meta.color,
        columns: buildKanbanColumns(items),
        isCollapsed: collapsedSwimlanes.has(key),
      });
    }

    return result;
  }, [settings.swimlaneEnabled, settings.swimlaneMode, settings.kanbanMode, swimlaneCol, allItems, buildKanbanColumns, buildKanbanColumnsByCol, collapsedSwimlanes, users, activeBoard]);

  // ── dnd-kit: item-to-column mapping ──────────────────────────────────
  const itemToColumnKeyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const lane of swimlanes) {
      for (const col of lane.columns) {
        for (const item of col.items) {
          map.set(item.id, col.key);
        }
      }
    }
    return map;
  }, [swimlanes]);

  const findKanbanColumnForItem = useCallback((itemId: string): KanbanColumn | null => {
    const colKey = itemToColumnKeyMap.get(itemId);
    if (!colKey) return null;
    for (const lane of swimlanes) {
      const found = lane.columns.find(c => c.key === colKey);
      if (found) return found;
    }
    return null;
  }, [itemToColumnKeyMap, swimlanes]);

  const findKanbanColumnByDroppableId = useCallback((droppableId: string): KanbanColumn | null => {
    const colKey = droppableId.replace('kanban-col-', '');
    for (const lane of swimlanes) {
      const found = lane.columns.find(c => c.key === colKey);
      if (found) return found;
    }
    return null;
  }, [swimlanes]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeColumn = findKanbanColumnForItem(activeId);
    if (!activeColumn) return;

    // Determine target: could be another item or a column droppable
    let targetColumn: KanbanColumn | null = null;
    let overItemIndex = -1;

    const overColumn = findKanbanColumnForItem(overId);
    if (overColumn) {
      targetColumn = overColumn;
      overItemIndex = overColumn.items.findIndex(i => i.id === overId);
    } else {
      targetColumn = findKanbanColumnByDroppableId(overId);
      if (targetColumn) {
        overItemIndex = targetColumn.items.length;
      }
    }

    if (!targetColumn) return;

    const sameColumn = activeColumn.key === targetColumn.key;

    if (sameColumn) {
      // Reorder within same column
      const activeIndex = activeColumn.items.findIndex(i => i.id === activeId);
      if (activeIndex === overItemIndex || overItemIndex === -1) return;
      const reordered = arrayMove(activeColumn.items, activeIndex, overItemIndex);

      // Check if positions have duplicates (degenerate case, e.g. legacy items all at position=0)
      const positionSet = new Set(activeColumn.items.map(i => i.position));
      const hasDegenerate = positionSet.size < activeColumn.items.length;

      if (hasDegenerate) {
        // Normalize ALL positions to match the reordered visual order
        const updates = reordered.map((item, idx) => ({
          itemId: item.id,
          position: (idx + 1) * 1000,
        }));
        batchReorderItems.mutate({ updates });
      } else {
        // Efficient single-item midpoint update
        const movedItem = reordered[overItemIndex];
        const prevItem = reordered[overItemIndex - 1];
        const nextItem = reordered[overItemIndex + 1];
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
      // Move to different lane
      if (settings.kanbanMode === 'group') {
        // Modo grupo: mover item para outro grupo
        const targetGroupId = targetColumn.key.replace('group:', '');
        if (targetGroupId && targetGroupId !== '__none__') {
          moveItem.mutate({ itemId: activeId, groupId: targetGroupId });
        }
      } else if (kanbanCol) {
        // Modo coluna: atualizar valor da coluna
        const newVal = targetColumn.key === '__none__' ? '' : targetColumn.key;
        if (kanbanCol.type === 'tags') {
          // Para tags: remover da lane anterior, adicionar na nova
          const item = allItemsMap.get(activeId);
          if (item) {
            const currentTags = getItemLaneKeys(item, kanbanCol);
            const oldKey = activeColumn.key;
            let newTags = currentTags.filter(t => t !== oldKey);
            if (newVal) newTags.push(newVal);
            updateColVal.mutate({ itemId: activeId, columnId: kanbanCol.id, value: newTags });
          }
        } else {
          updateColVal.mutate({ itemId: activeId, columnId: kanbanCol.id, value: newVal });
        }
      }

      // Also update position within target
      if (overItemIndex >= 0 && overItemIndex < targetColumn.items.length) {
        const targetItem = targetColumn.items[overItemIndex];
        reorderItem.mutate({ itemId: activeId, position: targetItem.position - 0.5 });
      }
    }
  }, [settings.kanbanMode, kanbanCol, findKanbanColumnForItem, findKanbanColumnByDroppableId, reorderItem, batchReorderItems, updateColVal, moveItem, allItemsMap]);

  const handleAddItem = useCallback((laneKey: string) => {
    if (!newItemName.trim() || !activeBoard) return;

    if (settings.kanbanMode === 'group') {
      // Modo grupo: criar item no grupo correspondente
      const groupId = laneKey.replace('group:', '');
      const targetGroup = activeBoard.groups.find(g => g.id === groupId);
      if (!targetGroup) return;
      createItem.mutate(
        { boardId: activeBoard.id, groupId: targetGroup.id, name: newItemName.trim() }
      );
    } else if (kanbanCol) {
      // Modo coluna: criar item no primeiro grupo e definir valor da coluna
      const firstGroup = activeBoard.groups[0];
      if (!firstGroup) return;
      createItem.mutate(
        { boardId: activeBoard.id, groupId: firstGroup.id, name: newItemName.trim() },
        {
          onSuccess: (data: { id: string }) => {
            if (laneKey !== '__none__') {
              if (kanbanCol.type === 'tags') {
                updateColVal.mutate({ itemId: data.id, columnId: kanbanCol.id, value: [laneKey] });
              } else {
                updateColVal.mutate({ itemId: data.id, columnId: kanbanCol.id, value: laneKey });
              }
            }
          },
        }
      );
    }

    setNewItemName('');
    setAddingToCol(null);
  }, [newItemName, activeBoard, settings.kanbanMode, kanbanCol, createItem, updateColVal]);

  const toggleSwimlane = useCallback((key: string) => {
    setCollapsedSwimlanes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const updateSetting = useCallback(<K extends keyof KanbanSettings>(key: K, value: KanbanSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleField = useCallback((field: keyof KanbanSettings['visibleFields']) => {
    setSettings(prev => ({
      ...prev,
      visibleFields: { ...prev.visibleFields, [field]: !prev.visibleFields[field] },
    }));
  }, []);

  const setWipLimit = useCallback((colKey: string, limit: number) => {
    setSettings(prev => ({
      ...prev,
      wipLimits: { ...prev.wipLimits, [colKey]: limit },
    }));
  }, []);

  const renderDragOverlay = useCallback((activeId: string | null) => {
    if (!activeId) return null;
    const item = allItemsMap.get(activeId);
    if (!item) return null;
    return <KanbanDragOverlay item={item} />;
  }, [allItemsMap]);

  // ── Guard ────────────────────────────────────────────────────────────
  if (!activeBoard) return null;

  // No modo 'column' sem nenhuma coluna elegivel, sugerir trocar para modo grupo
  const needsColumnFallback = settings.kanbanMode === 'column' && !kanbanCol;

  // Montar labels para o WIP limits (depende do modo)
  const wipLabels: Record<string, StatusLabel> = {};
  if (settings.kanbanMode === 'group') {
    for (const group of activeBoard.groups) {
      wipLabels[`group:${group.id}`] = { name: group.title, color: group.color };
    }
  } else {
    for (const [key, label] of kanbanLaneOptions) {
      wipLabels[key] = label;
    }
  }

  const hasSwimlanes = swimlanes.length > 1 || (swimlanes.length === 1 && swimlanes[0].key !== '__all__');

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-board-bg">
      {/* ── Header toolbar ────────────────────────────────────────── */}
      <KanbanToolbar
        kanbanMode={settings.kanbanMode}
        onSetKanbanMode={(mode) => updateSetting('kanbanMode', mode)}
        laneEligibleCols={laneEligibleCols}
        selectedKanbanColId={kanbanCol?.id ?? null}
        onSelectKanbanCol={(id) => updateSetting('kanbanColumnId', id)}
        swimlaneEnabled={settings.swimlaneEnabled}
        onToggleSwimlane={(v) => updateSetting('swimlaneEnabled', v)}
        swimlaneMode={settings.swimlaneMode}
        onSetSwimlaneMode={(mode) => updateSetting('swimlaneMode', mode)}
        swimlaneOptions={swimlaneOptions}
        swimlaneColumnId={settings.swimlaneColumnId}
        onSelectSwimlaneCol={(id) => updateSetting('swimlaneColumnId', id)}
        visibleFields={settings.visibleFields}
        onToggleField={toggleField}
        wipLimits={settings.wipLimits}
        onSetWipLimit={setWipLimit}
        labels={wipLabels}
        inlineSearch={inlineSearch}
        onInlineSearchChange={setInlineSearch}
      />

      {/* Fallback: sem coluna elegivel no modo coluna */}
      {needsColumnFallback && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground text-sm">
              Nenhuma coluna disponivel para lanes (status, dropdown ou tags).
            </p>
            <button
              onClick={() => updateSetting('kanbanMode', 'group')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-density-cell font-medium hover:bg-primary/90 transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              Usar grupos do board como lanes
            </button>
          </div>
        </div>
      )}

      {/* ── Board area ────────────────────────────────────────────── */}
      {!needsColumnFallback && (
        <div className="flex-1 overflow-auto p-4">
          <DndProvider onDragEnd={handleDragEnd} renderOverlay={renderDragOverlay}>
            {swimlanes.map(lane => (
              <div key={lane.key} className="kanban-swimlane-enter">
                {/* Swimlane header */}
                {hasSwimlanes && (
                  <button
                    onClick={() => toggleSwimlane(lane.key)}
                    className="flex items-center gap-2 mb-2 mt-3 first:mt-0 px-1 py-1 rounded hover:bg-muted/60 transition-colors w-full text-left"
                  >
                    {lane.isCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    {lane.color && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: lane.color }} />}
                    <span className="font-density-item font-semibold text-foreground">{lane.title}</span>
                    <span className="font-density-cell text-muted-foreground ml-1">
                      ({lane.columns.reduce((sum, c) => sum + c.items.length, 0)} itens)
                    </span>
                  </button>
                )}

                {/* Kanban columns row */}
                {!lane.isCollapsed && (
                  <div className="flex gap-3 min-h-[180px] mb-4 overflow-x-auto pb-2">
                    {lane.columns.map(col => {
                      const wipLimit = settings.wipLimits[col.key] ?? 0;
                      const exceeded = wipLimit > 0 && col.items.length > wipLimit;

                      return (
                        <div
                          key={col.key}
                          className={`flex flex-col w-[280px] min-w-[280px] bg-muted/50 rounded-lg ${exceeded ? 'kanban-col-wip-exceeded' : ''}`}
                        >
                          {/* Column header */}
                          <ColumnHeader
                            label={col.label}
                            itemCount={col.items.length}
                            wipLimit={wipLimit}
                            exceeded={exceeded}
                            onSetWipLimit={(limit) => setWipLimit(col.key, limit)}
                            noValueLabel={settings.kanbanMode === 'group' ? 'Sem Grupo' : 'Sem Valor'}
                          />

                          {/* Column progress bar */}
                          {wipLimit > 0 && (
                            <div className="px-3 pb-1">
                              <div className="h-1 bg-black/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${exceeded ? 'bg-destructive' : 'bg-white/50'}`}
                                  style={{ width: `${Math.min((col.items.length / wipLimit) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Cards with dnd-kit */}
                          <DroppableKanbanColumn columnKey={col.key}>
                            <SortableContext items={col.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                              {col.items.map(item => (
                                <SortableKanbanCard
                                  key={item.id}
                                  item={item}
                                  statusLabel={col.label}
                                  onClick={() => setSelectedItem(item)}
                                  visibleFields={settings.visibleFields}
                                  peopleCol={peopleCol}
                                  dateCol={dateCol}
                                  progressCol={progressCol}
                                  tagsCol={tagsCol}
                                  users={users}
                                />
                              ))}
                            </SortableContext>
                          </DroppableKanbanColumn>

                          {/* Add item */}
                          <div className="px-2 pb-2">
                            {addingToCol === col.key ? (
                              <input
                                value={newItemName}
                                onChange={e => setNewItemName(e.target.value)}
                                placeholder="Nome do item"
                                autoFocus
                                onBlur={() => { if (newItemName.trim()) handleAddItem(col.key); else setAddingToCol(null); }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleAddItem(col.key);
                                  if (e.key === 'Escape') { setNewItemName(''); setAddingToCol(null); }
                                }}
                                className="w-full bg-card border border-border rounded px-2 py-1.5 font-density-cell text-foreground outline-none"
                              />
                            ) : (
                              <button
                                onClick={() => setAddingToCol(col.key)}
                                className="flex items-center gap-1 w-full px-2 py-1.5 rounded font-density-cell text-muted-foreground hover:bg-muted transition-colors"
                              >
                                <Plus className="w-3 h-3" /> Adicionar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </DndProvider>
        </div>
      )}
    </div>
  );
};

export default BoardKanban;
