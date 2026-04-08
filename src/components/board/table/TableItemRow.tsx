import React, { useState, useCallback, useMemo, useRef } from 'react';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { ChevronDown, ChevronRight, Plus, GripVertical, MoreHorizontal, Trash2, Copy, ArrowRight, Star, Bell, Lock } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useSelection } from '@/context/SelectionContext';
import { Group, Column, Item } from '@/types/board';
import { useDeleteItem, useCreateSubitem, useDuplicateItem, useMoveItem, useUpdateColumn, useReorderItem } from '@/hooks/useCrudMutations';
import { useBatchUpdateColumnValue } from '@/hooks/useSupabaseData';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import SortableItem from '@/components/dnd/SortableItem';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { evaluateColorRules, type ColorRule } from '../ConditionalColorRules';
import { type ItemFile } from '@/hooks/useFileUpload';
import { renderCellByType } from './renderCellByType';
import { SubitemRow } from './SubitemRow';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export const CellErrorFallback = () => (
  <div className="flex items-center justify-center w-full h-full bg-destructive/10 rounded" title="Erro ao renderizar célula">
    <span className="text-destructive text-xs">!</span>
  </div>
);

export interface SortableItemRowProps {
  item: Item;
  columns: Column[];
  boardId: string;
  subitems: any[];
  groups: Group[];
  onEditColumn?: (col: Column) => void;
  getColumnWidth: (col: Column) => number;
  allItemIds: string[];
  colorRules?: ColorRule[];
  onFilePreview?: (file: ItemFile) => void;
  isBlocked?: boolean;
  blockedByNames?: string[];
}

// Tipos de coluna que NÃO participam de edição em massa (somente leitura / auto-calculadas)
export const NON_BATCH_TYPES = new Set([
  'auto_number', 'creation_log', 'last_updated', 'formula', 'mirror', 'connect_boards', 'button',
]);

/** Sortable wrapper for subitems — enables drag-and-drop reorder within a parent item */
const SortableSubitems: React.FC<{
  subitems: any[];
  columns: Column[];
  getColumnWidth: (col: Column) => number;
  parentItem: any;
  allItemIds: string[];
}> = ({ subitems, columns, getColumnWidth, parentItem, allItemIds }) => {
  const reorderItem = useReorderItem();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = subitems.findIndex(s => s.id === active.id);
    const newIndex = subitems.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(subitems, oldIndex, newIndex);
    const moved = reordered[newIndex];
    const prev = reordered[newIndex - 1];
    const next = reordered[newIndex + 1];

    let newPosition: number;
    if (!prev && !next) newPosition = Date.now();
    else if (!prev) newPosition = next.position > 1 ? next.position / 2 : next.position - 1;
    else if (!next) newPosition = prev.position + 1;
    else newPosition = (prev.position + next.position) / 2;

    reorderItem.mutate({ itemId: moved.id, position: newPosition });
  };

  const subitemIds = subitems.map(s => s.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={subitemIds} strategy={verticalListSortingStrategy}>
        {subitems.map(sub => (
          <SubitemRow key={sub.id} subitem={sub} columns={columns} getColumnWidth={getColumnWidth} parentItem={parentItem} allItemIds={allItemIds} />
        ))}
      </SortableContext>
    </DndContext>
  );
};

export const SortableItemRow: React.FC<SortableItemRowProps> = React.memo(({ item, columns, boardId, subitems, groups, onEditColumn, getColumnWidth, allItemIds, colorRules, onFilePreview, isBlocked, blockedByNames }) => {
  const { setSelectedItem, updateItemColumnValue, updateItemName } = useApp();
  const { isSelected, toggleItem, selectRange, lastSelectedId, setLastSelectedId, selectedItems, hasMultiSelection } = useSelection();
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(item.name);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [addingSubitem, setAddingSubitem] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [activeBatchCol, setActiveBatchCol] = useState<string | null>(null);
  const deleteItem = useDeleteItem();
  const createSubitem = useCreateSubitem();
  const duplicateItem = useDuplicateItem();
  const moveItem = useMoveItem();
  const updateColumnMut = useUpdateColumn();
  const batchUpdate = useBatchUpdateColumnValue();
  const { pushAction, undo } = useUndoRedo();

  const selected = isSelected(item.id);

  // Intercepta onChange de qualquer célula: propaga para todos os selecionados se houver multi-seleção
  const handleBatchChange = useCallback((col: Column, newValue: unknown) => {
    if (selected && hasMultiSelection && !NON_BATCH_TYPES.has(col.type)) {
      const ids = Array.from(selectedItems);
      const updates = ids.map(id => ({
        itemId: id,
        columnId: col.id,
        value: newValue,
        oldValue: item.columnValues?.[col.id]?.value ?? null,
      }));
      batchUpdate.mutate(updates, {
        onSuccess: ({ failed, total } = {} as any) => {
          const succeeded = (total ?? ids.length) - (failed ?? 0);
          if ((failed ?? 0) > 0) {
            toast.warning(`${succeeded} de ${total} itens atualizados. ${failed} falharam.`, {
              action: { label: 'Desfazer', onClick: undo },
              duration: 6000,
            });
          } else {
            toast.success(`"${col.title}" atualizado para ${ids.length} itens`, {
              action: { label: 'Desfazer', onClick: undo },
              duration: 5000,
            });
          }
        },
        onError: () => toast.error(`Erro ao atualizar em massa`),
      });
    } else {
      updateItemColumnValue(item.id, col.id, { value: newValue });
    }
  }, [selected, hasMultiSelection, selectedItems, batchUpdate, updateItemColumnValue, item, undo]);

  const handleDelete = async () => {
    try {
      await deleteItem.mutateAsync(item.id);
      pushAction({
        type: 'item_delete',
        entityId: item.id,
        entityType: 'item',
        oldValue: 'active',
        newValue: 'deleted',
      });
      toast.success('Item movido para a lixeira', {
        action: {
          label: 'Desfazer',
          onClick: () => { undo(); },
        },
        duration: 5000,
      });
    } catch { toast.error('Erro ao excluir item'); }
  };

  const handleAddSubitem = () => {
    if (!newSubName.trim()) return;
    createSubitem.mutate({ boardId, groupId: item.groupId, parentItemId: item.id, name: newSubName.trim() });
    setNewSubName('');
    setAddingSubitem(false);
  };

  const handleCheckboxChange = (e: React.MouseEvent<HTMLInputElement>) => {
    if (e.shiftKey && lastSelectedId && lastSelectedId !== item.id) {
      selectRange(allItemIds, lastSelectedId, item.id);
    } else {
      toggleItem(item.id);
    }
    setLastSelectedId(item.id);
  };

  const hasSubitems = subitems.length > 0;

  const rowColorStyle = useMemo(() => {
    if (!colorRules || colorRules.length === 0) return null;
    return evaluateColorRules(colorRules, item.columnValues, columns);
  }, [colorRules, item.columnValues, columns]);

  return (
    <SortableItem id={item.id}>
      {({ attributes, listeners, setNodeRef, isDragging, style }) => (
        <>
          <div
            ref={setNodeRef}
            style={{ ...style, ...(rowColorStyle || {}) }}
            role="row"
            className={`flex items-stretch border-b border-cell-border hover:bg-muted/40 transition-colors group/row density-row ${selected ? 'bg-primary/10 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'} ${isDragging ? 'bg-primary/10 border-primary/30' : ''}`}
            {...attributes}
          >
            <div role="gridcell" className={`sticky left-0 z-10 ${selected ? 'bg-primary/5' : 'bg-cell'} group-hover/row:bg-muted/40 transition-colors flex items-center min-w-[320px] w-[320px] border-r border-cell-border`}>
              <div
                className="w-5 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                {...listeners}
              >
                <GripVertical className="w-3 h-3 text-muted-foreground" />
              </div>
              <button onClick={() => setExpanded(!expanded)} className="w-5 flex-shrink-0 flex items-center justify-center" aria-label={expanded ? 'Recolher subitens' : 'Expandir subitens'}>
                {hasSubitems && (expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />)}
              </button>
              <input
                type="checkbox"
                checked={selected}
                onClick={handleCheckboxChange}
                readOnly
                className="w-4 h-4 rounded-[3px] border-muted-foreground/30 mr-2 cursor-pointer"
              />
              {editingName ? (
                <input value={tempName} onChange={(e) => setTempName(e.target.value)} autoFocus
                  onBlur={() => { updateItemName(item.id, tempName); setEditingName(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { updateItemName(item.id, tempName); setEditingName(false); } if (e.key === 'Escape') { setTempName(item.name); setEditingName(false); } }}
                  className="flex-1 bg-transparent font-density-item text-foreground outline-none border-b-2 border-primary" />
              ) : (
                <button
                  onClick={() => {
                    if (clickTimerRef.current) return;
                    clickTimerRef.current = setTimeout(() => { clickTimerRef.current = null; setSelectedItem(item); }, 250);
                  }}
                  onDoubleClick={() => {
                    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
                    setTempName(item.name); setEditingName(true);
                  }}
                  className="flex-1 text-left font-density-item text-foreground hover:text-primary truncate transition-colors flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{item.name}</span>
                  {isBlocked && (
                    <span
                      className="flex-shrink-0 inline-flex items-center"
                      title={blockedByNames && blockedByNames.length > 0
                        ? `Este item depende de: ${blockedByNames.join(', ')}`
                        : 'Este item esta bloqueado por dependencia nao concluida'}
                    >
                      <Lock className="w-3 h-3 text-amber-500" />
                    </span>
                  )}
                  {hasSubitems && !expanded && <span className="ml-0.5 font-density-badge text-muted-foreground bg-muted px-1 py-0.5 rounded flex-shrink-0">{subitems.length} sub</span>}
                </button>
              )}
              <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity ml-1">
                <button className="p-0.5 rounded hover:bg-muted text-muted-foreground" title="Favorito" onClick={(e) => e.stopPropagation()}>
                  <Star className="w-3 h-3" />
                </button>
                <button className="p-0.5 rounded hover:bg-muted text-muted-foreground" title="Notificações" onClick={(e) => e.stopPropagation()}>
                  <Bell className="w-3 h-3" />
                </button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-0.5 rounded hover:bg-muted text-muted-foreground opacity-0 group-hover/row:opacity-100 transition-opacity duration-[70ms] mr-1" aria-label="Acoes do item">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setAddingSubitem(true)}>
                    <Plus className="w-3.5 h-3.5 mr-2" /> Subitem
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicateItem.mutate(item.id)}>
                    <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar
                  </DropdownMenuItem>
                  {groups.length > 1 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger><ArrowRight className="w-3.5 h-3.5 mr-2" /> Mover para</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {groups.filter(g => g.id !== item.groupId).map(g => (
                          <DropdownMenuItem
                            key={g.id}
                            onClick={async () => {
                              try {
                                await moveItem.mutateAsync({ itemId: item.id, groupId: g.id });
                                toast.success(`Item movido para "${g.title}"`);
                              } catch {
                                toast.error('Erro ao mover item. Tente novamente.');
                              }
                            }}
                          >
                            <span className="w-2 h-2 rounded-sm mr-2 flex-shrink-0" style={{ backgroundColor: g.color }} />
                            {g.title}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {columns.map(col => {
              const cv = item.columnValues[col.id];
              const val = cv?.value;
              const cellOpts: any = {};
              if (col.type === 'status' && onEditColumn) {
                cellOpts.onEditLabels = () => onEditColumn(col);
              }
              if (col.type === 'dropdown') {
                cellOpts.onAddOption = (opt: string) => {
                  const currentOpts = col.settings.options || [];
                  if (!currentOpts.includes(opt)) {
                    updateColumnMut.mutate({ id: col.id, title: col.title, settings: { ...col.settings, options: [...currentOpts, opt] } });
                  }
                };
              }
              if (col.type === 'formula') {
                cellOpts.columnValues = item.columnValues;
                cellOpts.columns = columns;
                cellOpts.onUpdateSettings = (settings: any) => {
                  updateColumnMut.mutate({ id: col.id, title: col.title, settings });
                };
              }
              if (col.type === 'file') {
                cellOpts.itemId = item.id;
                cellOpts.onFilePreview = onFilePreview;
              }
              if (col.type === 'connect_boards' || col.type === 'mirror') {
                cellOpts.itemId = item.id;
              }
              const w = getColumnWidth(col);
              const isBatchEligible = selected && hasMultiSelection && !NON_BATCH_TYPES.has(col.type);
              return (
                <div
                  key={col.id}
                  role="gridcell"
                  className="border-r border-cell-border flex items-center justify-center px-1 relative"
                  style={{ minWidth: w, width: w }}
                  onFocus={() => isBatchEligible && setActiveBatchCol(col.id)}
                  onBlur={() => setActiveBatchCol(null)}
                >
                  {/* Badge "Editando N itens" */}
                  {isBatchEligible && activeBatchCol === col.id && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded shadow-md pointer-events-none">
                      Editando {selectedItems.size} itens
                    </div>
                  )}
                  <ErrorBoundary fallback={<CellErrorFallback />}>
                    {renderCellByType(col, val, (v) => handleBatchChange(col, v), cellOpts)}
                  </ErrorBoundary>
                </div>
              );
            })}
            <div className="min-w-[40px]" />
          </div>
          {expanded && (
            <>
              <SortableSubitems subitems={subitems} columns={columns} getColumnWidth={getColumnWidth} parentItem={item} allItemIds={allItemIds} />
              <div className="flex items-center border-b border-cell-border density-row-sub bg-muted/20">
                <div className="sticky left-0 z-20 bg-card min-w-[320px] w-[320px] border-r border-cell-border flex items-center pl-14">
                  {addingSubitem ? (
                    <input value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Nome do subitem" autoFocus
                      onBlur={() => { if (newSubName.trim()) handleAddSubitem(); else setAddingSubitem(false); }}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddSubitem(); if (e.key === 'Escape') { setNewSubName(''); setAddingSubitem(false); } }}
                      className="flex-1 bg-transparent font-density-cell text-foreground outline-none placeholder:text-muted-foreground/40 py-1" />
                  ) : (
                    <button onClick={() => setAddingSubitem(true)} className="flex items-center gap-1 font-density-cell text-muted-foreground/60 hover:text-foreground transition-colors py-1">
                      <Plus className="w-3 h-3" /> Adicionar subitem
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
          {!expanded && addingSubitem && (
            <div className="flex items-center border-b border-cell-border density-row-sub bg-muted/20">
              <div className="sticky left-0 z-10 min-w-[320px] w-[320px] border-r border-cell-border flex items-center pl-14">
                <input value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Nome do subitem" autoFocus
                  onBlur={() => { if (newSubName.trim()) handleAddSubitem(); else setAddingSubitem(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddSubitem(); if (e.key === 'Escape') { setNewSubName(''); setAddingSubitem(false); } }}
                  className="flex-1 bg-transparent font-density-cell text-foreground outline-none placeholder:text-muted-foreground/40 py-1" />
              </div>
            </div>
          )}
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir item?</AlertDialogTitle>
                <AlertDialogDescription>O item "{item.name}" sera excluido permanentemente.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </SortableItem>
  );
});
