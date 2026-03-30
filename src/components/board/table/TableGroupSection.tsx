import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, GripVertical, MoreHorizontal, Trash2, Pencil, Palette } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useSelection } from '@/context/SelectionContext';
import { Group, Column } from '@/types/board';
import { useDeleteGroup, useUpdateGroup } from '@/hooks/useCrudMutations';
import GroupFooter from '../GroupFooter';
import QuickColumnFilter from '../QuickColumnFilter';
import CreateColumnModal from '@/components/modals/CreateColumnModal';
import EditColumnModal from '@/components/modals/EditColumnModal';
import SortableItem from '@/components/dnd/SortableItem';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { type ColorRule } from '../ConditionalColorRules';
import { type ItemFile } from '@/hooks/useFileUpload';
import { useColumnResize } from './useColumnResize';
import { SortableItemRow } from './TableItemRow';
import { renderCellByType } from './renderCellByType';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

/** Droppable group container */
export const DroppableGroup: React.FC<{ groupId: string; children: React.ReactNode }> = ({ groupId, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `group-${groupId}` });
  return (
    <div ref={setNodeRef} className={`transition-colors ${isOver ? 'bg-primary/5 ring-1 ring-primary/20 rounded' : ''}`}>
      {children}
    </div>
  );
};

export const GROUP_COLORS = ['#579BFC', '#00C875', '#FDAB3D', '#E2445C', '#A25DDC', '#037F4C', '#FF158A', '#CAB641', '#9AADBD', '#5F3FFF'];

export const GroupSection: React.FC<{ group: Group; columns: Column[]; boardId: string; allSubitems: any[]; allGroups: Group[]; allItemIds: string[]; colorRules?: ColorRule[]; onFilePreview?: (file: ItemFile) => void; blockedItemMap?: Map<string, string[]> }> = ({ group, columns, boardId, allSubitems, allGroups, allItemIds, colorRules, onFilePreview, blockedItemMap }) => {
  const { toggleGroupCollapse, addItemToGroup } = useApp();
  const { selectAll, isSelected } = useSelection();
  const [newItemName, setNewItemName] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [showCreateColumn, setShowCreateColumn] = useState(false);
  const [editColumn, setEditColumn] = useState<{ id: string; title: string; type: string; settings: any; boardId?: string } | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(group.title);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const deleteGroup = useDeleteGroup();
  const updateGroup = useUpdateGroup();
  const { getColumnWidth, startResize } = useColumnResize();

  const handleDeleteGroup = async () => {
    try { await deleteGroup.mutateAsync(group.id); toast.success('Grupo excluido'); } catch { toast.error('Erro ao excluir grupo'); }
  };

  const handleRenameGroup = () => {
    const trimmed = tempTitle.trim();
    if (trimmed && trimmed !== group.title) {
      updateGroup.mutate({ id: group.id, title: trimmed });
    }
    setEditingTitle(false);
  };

  const handleColorChange = (color: string) => {
    updateGroup.mutate({ id: group.id, color });
    setShowColorPicker(false);
  };

  // Include subitem IDs in group selection
  const groupItemIds = group.items.flatMap(item => {
    const subs = allSubitems.filter((s: any) => s.parent_item_id === item.id);
    return [item.id, ...subs.map((s: any) => s.id)];
  });
  const allGroupSelected = groupItemIds.length > 0 && groupItemIds.every(id => isSelected(id));
  const someGroupSelected = groupItemIds.some(id => isSelected(id));

  const handleSelectAll = () => {
    selectAll(groupItemIds);
  };

  // Progress bar
  const statusCol = columns.find(c => c.type === 'status');
  const doneCount = group.items.filter(item => {
    if (!statusCol) return false;
    const val = item.columnValues[statusCol.id]?.value;
    const label = statusCol.settings.labels?.[val];
    return label?.isDone;
  }).length;
  const total = group.items.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="mb-8 relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l" style={{ backgroundColor: group.color }} />
      <div
        className="flex items-center gap-1.5 py-2.5 px-2 pl-4 group/header rounded-t"
        style={{ backgroundColor: `${group.color}18` }}
      >
        <button onClick={() => toggleGroupCollapse(group.id)} aria-label={group.isCollapsed ? `Expandir grupo ${group.title}` : `Recolher grupo ${group.title}`}>
          {group.isCollapsed ? <ChevronRight className="w-4 h-4" style={{ color: group.color }} /> : <ChevronDown className="w-4 h-4" style={{ color: group.color }} />}
        </button>
        {editingTitle ? (
          <input
            value={tempTitle}
            onChange={e => setTempTitle(e.target.value)}
            autoFocus
            onBlur={handleRenameGroup}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameGroup(); if (e.key === 'Escape') { setTempTitle(group.title); setEditingTitle(false); } }}
            className="text-sm font-bold uppercase tracking-wide bg-transparent outline-none border-b-2"
            style={{ color: group.color, borderColor: group.color }}
          />
        ) : (
          <h3
            className="text-sm font-bold truncate uppercase tracking-wide cursor-pointer hover:opacity-80"
            style={{ color: group.color }}
            onDoubleClick={() => { setTempTitle(group.title); setEditingTitle(true); }}
          >
            {group.title}
          </h3>
        )}
        <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
          {group.isCollapsed && group.items.length > 0
            ? `${group.items.length} item${group.items.length === 1 ? '' : 's'} oculto${group.items.length === 1 ? '' : 's'}`
            : `${group.items.length} ${group.items.length === 1 ? 'Projeto' : 'Projetos'}`
          }
        </span>
        <span className="font-density-tiny text-muted-foreground ml-1">
          {doneCount > 0 && `${doneCount} concluidos`}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover/header:opacity-100 p-1 rounded hover:bg-muted transition-opacity duration-[70ms]" aria-label="Acoes do grupo">
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => { setTempTitle(group.title); setEditingTitle(true); }}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Renomear grupo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowColorPicker(v => !v)}>
              <Palette className="w-3.5 h-3.5 mr-2" /> Mudar cor
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowDeleteGroup(true)} className="text-destructive focus:text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir grupo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {showColorPicker && (
        <div className="flex gap-2 px-4 py-2 bg-muted/30 border-b border-cell-border flex-wrap">
          {GROUP_COLORS.map(c => (
            <button
              key={c}
              onClick={() => handleColorChange(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${group.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              aria-label={`Cor ${c}`}
              title={c}
            />
          ))}
        </div>
      )}

      {!group.isCollapsed && (
        <DroppableGroup groupId={group.id}>
          <>
            <div className="flex border-b-2 border-t density-row" style={{ borderColor: group.color }} role="row">
              <div role="columnheader" className="sticky left-0 z-10 bg-board-header min-w-[320px] w-[320px] border-r border-cell-border flex items-center">
                <div className="w-5 flex-shrink-0" />
                <span className="w-5 flex-shrink-0" />
                <input
                  type="checkbox"
                  checked={allGroupSelected}
                  ref={(el) => { if (el) el.indeterminate = someGroupSelected && !allGroupSelected; }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded-[3px] border-muted-foreground/30 mr-2 cursor-pointer"
                />
                <span className="font-density-header font-medium text-muted-foreground">Item</span>
              </div>
              <SortableContext items={columns.map(c => `col-${c.id}`)} strategy={horizontalListSortingStrategy}>
                {columns.map(col => (
                  <SortableItem key={col.id} id={`col-${col.id}`}>
                    {({ attributes, listeners, setNodeRef, isDragging, style }) => (
                      <div
                        ref={setNodeRef}
                        role="columnheader"
                        className={`relative flex items-center justify-center py-1.5 border-r border-cell-border bg-board-header hover:bg-muted/50 transition-colors group/colheader ${isDragging ? 'opacity-50 ring-1 ring-primary/30' : ''}`}
                        style={{ ...style, minWidth: getColumnWidth(col), width: getColumnWidth(col) }}
                        onClick={() => setEditColumn({ id: col.id, title: col.title, type: col.type, settings: col.settings, boardId })}
                      >
                        <div
                          className="flex items-center cursor-grab active:cursor-grabbing opacity-0 group-hover/colheader:opacity-60 mr-0.5 flex-shrink-0"
                          {...attributes}
                          {...listeners}
                          onClick={e => e.stopPropagation()}
                          title="Arrastar coluna"
                        >
                          <GripVertical className="w-3 h-3 text-muted-foreground rotate-90" />
                        </div>
                        <span className="font-density-header font-semibold text-muted-foreground truncate px-1 uppercase tracking-wider cursor-pointer">{col.title}</span>
                        <span className="opacity-0 group-hover/colheader:opacity-100 transition-opacity">
                          <QuickColumnFilter column={col} />
                        </span>
                        {/* Resize handle */}
                        <div
                          className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-10 opacity-0 group-hover/colheader:opacity-100 hover:opacity-100 flex items-center justify-center transition-opacity"
                          onMouseDown={e => {
                            e.stopPropagation();
                            e.preventDefault();
                            startResize(col.id, getColumnWidth(col), e.clientX);
                          }}
                          onClick={e => e.stopPropagation()}
                          title="Redimensionar coluna"
                        >
                          <div className="w-0.5 h-4 bg-primary/60 rounded-full" />
                        </div>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </SortableContext>
              <div className="min-w-[40px] bg-board-header flex items-center justify-center">
                <button onClick={() => setShowCreateColumn(true)} aria-label="Adicionar coluna">
                  <Plus className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-foreground cursor-pointer transition-colors" />
                </button>
              </div>
            </div>

            <SortableContext items={groupItemIds} strategy={verticalListSortingStrategy}>
              {group.items.map(item => {
                const subs = allSubitems.filter(s => s.parent_item_id === item.id);
                const blockerNames = blockedItemMap?.get(item.id);
                return <SortableItemRow key={item.id} item={item} columns={columns} boardId={boardId} subitems={subs} groups={allGroups}
                  onEditColumn={(col) => setEditColumn({ id: col.id, title: col.title, type: col.type, settings: col.settings, boardId })}
                  getColumnWidth={getColumnWidth}
                  allItemIds={allItemIds}
                  colorRules={colorRules}
                  onFilePreview={onFilePreview}
                  isBlocked={!!blockerNames && blockerNames.length > 0}
                  blockedByNames={blockerNames} />;
              })}
            </SortableContext>

            <div className="flex items-stretch border-b border-cell-border density-row">
              <div className="sticky left-0 z-10 bg-cell min-w-[320px] w-[320px] border-r border-cell-border flex items-center pl-[62px] pr-2">
                {addingItem ? (
                  <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Nome do item" autoFocus
                    onBlur={() => { if (newItemName.trim()) addItemToGroup(group.id, newItemName); setNewItemName(''); setAddingItem(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && newItemName.trim()) { addItemToGroup(group.id, newItemName); setNewItemName(''); } if (e.key === 'Escape') { setNewItemName(''); setAddingItem(false); } }}
                    className="flex-1 bg-transparent font-density-item text-foreground outline-none placeholder:text-muted-foreground/40" />
                ) : (
                  <button onClick={() => setAddingItem(true)} className="flex items-center gap-1 font-density-cell text-muted-foreground/60 hover:text-foreground transition-colors">
                    <Plus className="w-3 h-3" /> <span>Adicionar item</span>
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {total > 0 && statusCol && (
              <div className="flex items-center gap-2 px-10 py-1.5">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[200px]">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-density-tiny text-muted-foreground">{doneCount}/{total} concluidos</span>
              </div>
            )}

            {/* GroupFooter — agregacoes por coluna (AC4) */}
            <GroupFooter columns={columns} items={group.items} />
          </>
        </DroppableGroup>
      )}

      <CreateColumnModal open={showCreateColumn} onOpenChange={setShowCreateColumn} boardId={boardId} />
      <EditColumnModal open={!!editColumn} onOpenChange={(o) => { if (!o) setEditColumn(null); }} column={editColumn} />
      <AlertDialog open={showDeleteGroup} onOpenChange={setShowDeleteGroup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao excluir o grupo &quot;{group.title}&quot;, todos os {group.items.length} itens dentro dele serao excluidos permanentemente. Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
