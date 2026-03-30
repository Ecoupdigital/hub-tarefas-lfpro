import React, { useState } from 'react';
import { Trash2, Move, Copy, ChevronDown, X, Pencil } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useApp } from '@/context/AppContext';
import { useDeleteItem, useDuplicateItem, useMoveItem } from '@/hooks/useCrudMutations';
import { useBatchUpdateColumnValue } from '@/hooks/useSupabaseData';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useProfiles } from '@/hooks/useSupabaseData';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

const BatchActionsBar: React.FC = () => {
  const { selectedItems, clearSelection } = useSelection();
  const { activeBoard } = useApp();
  const deleteItem = useDeleteItem();
  const duplicateItem = useDuplicateItem();
  const moveItem = useMoveItem();
  const batchUpdate = useBatchUpdateColumnValue();
  const { pushAction, undo } = useUndoRedo();
  const { data: profiles = [] } = useProfiles();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const count = selectedItems.size;
  if (count === 0) return null;

  const groups = activeBoard?.groups ?? [];
  const columns = activeBoard?.columns ?? [];
  const ids = Array.from(selectedItems);

  // Check if selection contains subitems (they can't be moved to groups)
  const allGroupItemIds = new Set(groups.flatMap(g => g.items.map(i => i.id)));
  const hasSubitems = ids.some(id => !allGroupItemIds.has(id));
  const statusColumns = columns.filter(c => c.type === 'status');
  const peopleColumns = columns.filter(c => c.type === 'people');
  const dateColumns = columns.filter(c => c.type === 'date');
  const dropdownColumns = columns.filter(c => c.type === 'dropdown' && (c.settings?.options?.length ?? 0) > 0);
  const checkboxColumns = columns.filter(c => c.type === 'checkbox');
  const numberColumns = columns.filter(c => c.type === 'number');
  const progressColumns = columns.filter(c => c.type === 'progress');
  const ratingColumns = columns.filter(c => c.type === 'rating');
  const tagsColumns = columns.filter(c => c.type === 'tags' && (c.settings?.options?.length ?? 0) > 0);

  const runBatch = async (
    columnId: string,
    value: unknown,
    label: string,
  ) => {
    const updates = ids.map(itemId => ({ itemId, columnId, value }));
    batchUpdate.mutate(updates, {
      onSuccess: () => {
        toast.success(`${label} atualizado para ${count} itens`, {
          action: { label: 'Desfazer', onClick: undo },
          duration: 5000,
        });
      },
      onError: () => toast.error(`Erro ao atualizar ${label}`),
    });
  };

  const handleDeleteAll = async () => {
    try {
      await Promise.all(ids.map(id => deleteItem.mutateAsync(id)));
      ids.forEach(id => {
        pushAction({
          type: 'item_delete',
          entityId: id,
          entityType: 'item',
          oldValue: 'active',
          newValue: 'deleted',
        });
      });
      toast.success(`${ids.length} itens movidos para a lixeira`, {
        action: { label: 'Desfazer', onClick: undo },
        duration: 5000,
      });
      clearSelection();
    } catch {
      toast.error('Erro ao excluir itens');
    }
    setShowDeleteConfirm(false);
  };

  const handleDuplicateAll = async () => {
    try {
      await Promise.all(ids.map(id => duplicateItem.mutateAsync(id)));
      toast.success(`${ids.length} itens duplicados`);
      clearSelection();
    } catch {
      toast.error('Erro ao duplicar itens');
    }
  };

  const handleMoveAll = async (groupId: string) => {
    try {
      await Promise.all(ids.map(id => moveItem.mutateAsync({ itemId: id, groupId })));
      toast.success(`${ids.length} itens movidos`, {
        action: { label: 'Desfazer', onClick: undo },
        duration: 5000,
      });
      clearSelection();
    } catch {
      toast.error('Erro ao mover itens');
    }
  };

  // Datas dos próximos 7 dias para seleção rápida
  const quickDates = [
    { label: 'Hoje', value: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Amanhã', value: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd') },
    { label: 'Em 7 dias', value: format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd') },
    { label: 'Em 30 dias', value: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd') },
    { label: 'Limpar data', value: null },
  ];

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-card border border-border rounded-lg shadow-lg px-3 py-2 animate-in slide-in-from-bottom-4 duration-200">
        {/* Contador */}
        <span className="text-sm font-medium text-foreground mr-1">
          {count} {count === 1 ? 'item selecionado' : 'itens selecionados'}
        </span>

        <div className="h-5 w-px bg-border mx-0.5" />

        {/* Excluir */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          title="Excluir selecionados"
        >
          <Trash2 className="w-4 h-4" />
          Excluir
        </button>

        {/* Mover para grupo (desabilitado se há subitems na seleção) */}
        {groups.length > 0 && !hasSubitems && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-foreground hover:bg-muted rounded-md transition-colors">
                <Move className="w-4 h-4" />
                Mover
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44">
              {groups.map(g => (
                <DropdownMenuItem key={g.id} onClick={() => handleMoveAll(g.id)}>
                  <span className="w-2 h-2 rounded-sm mr-2 flex-shrink-0" style={{ backgroundColor: g.color }} />
                  {g.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Duplicar */}
        <button
          onClick={handleDuplicateAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
        >
          <Copy className="w-4 h-4" />
          Duplicar
        </button>

        <div className="h-5 w-px bg-border mx-0.5" />

        {/* Editar campos — dropdown principal com submenus por tipo */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-foreground hover:bg-muted rounded-md transition-colors">
              <Pencil className="w-4 h-4" />
              Editar campo
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-52">

            {/* Status */}
            {statusColumns.map(col => (
              <DropdownMenuSub key={col.id}>
                <DropdownMenuSubTrigger>
                  <span className="w-2 h-2 rounded-sm bg-muted-foreground mr-2" />
                  {col.title}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  {Object.entries(col.settings?.labels ?? {}).map(([key, label]: [string, any]) => (
                    <DropdownMenuItem key={key} onClick={() => runBatch(col.id, key, col.title)}>
                      <span className="w-2.5 h-2.5 rounded-sm mr-2 flex-shrink-0" style={{ backgroundColor: label.color }} />
                      {label.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}

            {/* Pessoas */}
            {peopleColumns.map(col => (
              <DropdownMenuSub key={col.id}>
                <DropdownMenuSubTrigger>{col.title}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48 max-h-60 overflow-y-auto">
                  {profiles.map(p => (
                    <DropdownMenuItem key={p.id} onClick={() => runBatch(col.id, [p.id], col.title)}>
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold mr-2 flex-shrink-0">
                        {p.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      {p.name ?? p.email}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => runBatch(col.id, [], col.title)}>
                    Limpar pessoas
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}

            {/* Data */}
            {dateColumns.map(col => (
              <DropdownMenuSub key={col.id}>
                <DropdownMenuSubTrigger>{col.title}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  {quickDates.map(d => (
                    <DropdownMenuItem key={d.label} onClick={() => runBatch(col.id, d.value, col.title)}>
                      {d.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}

            {/* Dropdown */}
            {dropdownColumns.map(col => (
              <DropdownMenuSub key={col.id}>
                <DropdownMenuSubTrigger>{col.title}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  {(col.settings?.options ?? []).map((opt: string) => (
                    <DropdownMenuItem key={opt} onClick={() => runBatch(col.id, opt, col.title)}>
                      {opt}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => runBatch(col.id, null, col.title)}>
                    Limpar
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}

            {/* Tags */}
            {tagsColumns.map(col => (
              <DropdownMenuSub key={col.id}>
                <DropdownMenuSubTrigger>{col.title}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  {(col.settings?.options ?? []).map((opt: string) => (
                    <DropdownMenuItem key={opt} onClick={() => runBatch(col.id, [opt], col.title)}>
                      {opt}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => runBatch(col.id, [], col.title)}>
                    Limpar tags
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}

            {/* Checkbox */}
            {checkboxColumns.map(col => (
              <DropdownMenuSub key={col.id}>
                <DropdownMenuSubTrigger>{col.title}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-36">
                  <DropdownMenuItem onClick={() => runBatch(col.id, true, col.title)}>Marcar todos</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => runBatch(col.id, false, col.title)}>Desmarcar todos</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}

            {/* Progresso */}
            {progressColumns.map(col => (
              <DropdownMenuSub key={col.id}>
                <DropdownMenuSubTrigger>{col.title}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-36">
                  {[0, 25, 50, 75, 100].map(v => (
                    <DropdownMenuItem key={v} onClick={() => runBatch(col.id, v, col.title)}>
                      {v}%
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}

            {/* Avaliação (Rating) */}
            {ratingColumns.map(col => (
              <DropdownMenuSub key={col.id}>
                <DropdownMenuSubTrigger>{col.title}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-36">
                  {[1, 2, 3, 4, 5].map(v => (
                    <DropdownMenuItem key={v} onClick={() => runBatch(col.id, v, col.title)}>
                      {'★'.repeat(v)}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => runBatch(col.id, 0, col.title)}>Limpar</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}

            {/* Number */}
            {numberColumns.map(col => (
              <DropdownMenuSub key={col.id}>
                <DropdownMenuSubTrigger>{col.title}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-36">
                  <DropdownMenuItem onClick={() => runBatch(col.id, 0, col.title)}>Zerar (0)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => runBatch(col.id, null, col.title)}>Limpar</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}

          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-5 w-px bg-border mx-0.5" />

        {/* Limpar seleção */}
        <button
          onClick={clearSelection}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          title="Limpar seleção (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {count} itens?</AlertDialogTitle>
            <AlertDialogDescription>
              {count} {count === 1 ? 'item será excluído' : 'itens serão excluídos'} e movidos para a lixeira.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BatchActionsBar;
