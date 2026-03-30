import React, { useState } from 'react';
import { Trash2, RotateCcw, Search, AlertTriangle, LayoutDashboard, Archive } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTrashItems, useRestoreItem, usePermanentDeleteItem, useEmptyTrash, useTrashBoards, useArchivedBoards, useRestoreBoard, usePermanentDeleteBoard } from '@/hooks/useTrash';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrashDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ActiveTab = 'items' | 'boards' | 'archived';

const TrashDrawer: React.FC<TrashDrawerProps> = ({ open, onOpenChange }) => {
  const { data: trashItems = [], isLoading } = useTrashItems();
  const { data: trashBoards = [], isLoading: boardsLoading } = useTrashBoards();
  const { data: archivedBoards = [], isLoading: archivedLoading } = useArchivedBoards();
  const restoreItem = useRestoreItem();
  const permanentDelete = usePermanentDeleteItem();
  const emptyTrash = useEmptyTrash();
  const restoreBoard = useRestoreBoard();
  const permanentDeleteBoard = usePermanentDeleteBoard();

  const [search, setSearch] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('items');

  const filtered = search.trim()
    ? trashItems.filter((item: any) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      )
    : trashItems;

  const filteredBoards = search.trim()
    ? trashBoards.filter((b: any) =>
        b.name.toLowerCase().includes(search.toLowerCase())
      )
    : trashBoards;

  const filteredArchived = search.trim()
    ? archivedBoards.filter((b: any) =>
        b.name.toLowerCase().includes(search.toLowerCase())
      )
    : archivedBoards;

  const handleRestore = async (id: string) => {
    try {
      await restoreItem.mutateAsync(id);
      toast.success('Item restaurado');
    } catch {
      toast.error('Erro ao restaurar item');
    }
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return;
    try {
      await permanentDelete.mutateAsync(itemToDelete);
      toast.success('Item excluido permanentemente');
      setItemToDelete(null);
    } catch {
      toast.error('Erro ao excluir item');
    }
  };

  const handleRestoreBoard = async (id: string) => {
    try {
      await restoreBoard.mutateAsync(id);
      toast.success('Board restaurado');
    } catch {
      toast.error('Erro ao restaurar board');
    }
  };

  const handlePermanentDeleteBoard = async () => {
    if (!boardToDelete) return;
    try {
      await permanentDeleteBoard.mutateAsync(boardToDelete);
      toast.success('Board excluido permanentemente');
      setBoardToDelete(null);
    } catch {
      toast.error('Erro ao excluir board');
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await emptyTrash.mutateAsync();
      toast.success('Lixeira esvaziada');
      setShowEmptyConfirm(false);
    } catch {
      toast.error('Erro ao esvaziar lixeira');
    }
  };

  const tabLoadingState = activeTab === 'items' ? isLoading : activeTab === 'boards' ? boardsLoading : archivedLoading;
  const currentList = activeTab === 'items' ? filtered : activeTab === 'boards' ? filteredBoards : filteredArchived;
  const emptyLabel = activeTab === 'items' ? 'A lixeira esta vazia' : activeTab === 'boards' ? 'Nenhum board na lixeira' : 'Nenhum board arquivado';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[400px] sm:w-[450px] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Trash2 className="w-4 h-4" />
                Lixeira
              </SheetTitle>
              {activeTab === 'items' && trashItems.length > 0 && (
                <button
                  onClick={() => setShowEmptyConfirm(true)}
                  className="font-density-cell text-destructive hover:text-destructive/80 transition-colors font-medium"
                >
                  Esvaziar lixeira
                </button>
              )}
            </div>
          </SheetHeader>

          {/* Abas: Itens / Boards / Arquivados */}
          <div className="flex border-b border-border">
            {([
              { key: 'items', label: 'Itens', icon: Trash2, count: trashItems.length },
              { key: 'boards', label: 'Boards', icon: LayoutDashboard, count: trashBoards.length },
              { key: 'archived', label: 'Arquivados', icon: Archive, count: archivedBoards.length },
            ] as const).map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {count > 0 && (
                  <span className="ml-0.5 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="px-4 py-2 border-b border-border">
            <div className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="flex-1 bg-transparent font-density-cell text-foreground outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {activeTab === 'items' && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-1.5 font-density-tiny text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>Itens na lixeira serao excluidos permanentemente apos 30 dias.</span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-1">
            {tabLoadingState ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Trash2 className="w-8 h-8 mb-2 opacity-30" />
                <p className="font-density-cell">
                  {search.trim() ? 'Nenhum resultado encontrado' : emptyLabel}
                </p>
              </div>
            ) : activeTab === 'items' ? (
              <div className="space-y-1">
                {filtered.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-density-cell font-medium text-foreground truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-density-tiny text-muted-foreground truncate">
                          {(item as any).boards?.name || 'Board'}
                        </span>
                        <span className="font-density-tiny text-muted-foreground">
                          {item.updated_at
                            ? formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: ptBR })
                            : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRestore(item.id)}
                        className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors"
                        title="Restaurar"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setItemToDelete(item.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                        title="Excluir permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Boards deletados ou arquivados */
              <div className="space-y-1">
                {currentList.map((board: any) => (
                  <div
                    key={board.id}
                    className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-density-cell font-medium text-foreground truncate">{board.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-density-tiny text-muted-foreground truncate">
                          {(board as any).workspaces?.name || 'Workspace'}
                        </span>
                        <span className="font-density-tiny text-muted-foreground">
                          {board.updated_at
                            ? formatDistanceToNow(new Date(board.updated_at), { addSuffix: true, locale: ptBR })
                            : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRestoreBoard(board.id)}
                        className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors"
                        title="Restaurar board"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      {activeTab === 'boards' && (
                        <button
                          onClick={() => setBoardToDelete(board.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                          title="Excluir permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Este item sera excluido permanentemente e nao podera ser recuperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!boardToDelete} onOpenChange={() => setBoardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir board permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Este board e todos os seus dados serao excluidos permanentemente e nao poderao ser recuperados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDeleteBoard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showEmptyConfirm} onOpenChange={setShowEmptyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esvaziar lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os {trashItems.length} itens serao excluidos permanentemente. Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Esvaziar lixeira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TrashDrawer;
