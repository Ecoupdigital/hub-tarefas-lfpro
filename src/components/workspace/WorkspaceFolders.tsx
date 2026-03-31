import React, { useState } from 'react';
import {
  FolderOpen, FolderPlus, ChevronDown, ChevronRight,
  Pencil, Trash2, MoreHorizontal, Copy, Star, GripVertical, ArrowRightLeft, Layers,
} from 'lucide-react';
import { useTab } from '@/context/TabContext';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useWorkspaceFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useMoveBoard,
} from '@/hooks/useWorkspaceFolders';
import { useDeleteBoard, useRenameBoard, useDuplicateBoard, useReorderBoard, useMoveBoardToWorkspace } from '@/hooks/useCrudMutations';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuTrigger, ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { EmojiColorPicker } from '@/components/shared/EmojiColorPicker';
import { HighlightText } from '@/components/shared/HighlightText';

type BoardData = { id: string; name: string; folder_id?: string | null; icon?: string; color?: string; position?: number };
type WorkspaceOption = { id: string; name: string };

interface WorkspaceFoldersProps {
  workspaceId: string;
  boards: Array<BoardData>;
  activeBoardId: string | null;
  onBoardClick: (boardId: string) => void;
  renderBoardItem?: (board: any) => React.ReactNode;
  itemCounts?: Record<string, number>;
  profiles?: Array<{ id: string; name: string; avatar_url?: string | null }>;
  favorites?: any[];
  onToggleFavorite?: (boardId: string) => void;
  onUpdateAppearance?: (boardId: string, icon: string | null, color: string | null) => void;
  searchQuery?: string;
  otherWorkspaces?: WorkspaceOption[];
  onMoveBoardToWorkspace?: (boardId: string, workspaceId: string) => void;
}

interface BoardItemProps {
  board: BoardData;
  activeBoardId: string | null;
  onBoardClick: (boardId: string) => void;
  onDeleteBoard: (boardId: string) => void;
  onRenameBoard: (boardId: string, name: string) => void;
  onDuplicateBoard: (boardId: string) => void;
  onMoveBoard: (boardId: string, folderId: string | null) => void;
  folders: Array<{ id: string; name: string }>;
  itemCount?: number;
  profiles?: Array<{ id: string; name: string; avatar_url?: string | null }>;
  isFavorite?: boolean;
  onToggleFavorite?: (boardId: string) => void;
  onUpdateAppearance?: (boardId: string, icon: string | null, color: string | null) => void;
  searchQuery?: string;
  dragHandleProps?: any;
  otherWorkspaces?: WorkspaceOption[];
  onMoveBoardToWorkspace?: (boardId: string, workspaceId: string) => void;
}

const BoardItem: React.FC<BoardItemProps> = ({
  board, activeBoardId, onBoardClick, onDeleteBoard, onRenameBoard, onDuplicateBoard, onMoveBoard, folders,
  itemCount, profiles, isFavorite, onToggleFavorite, onUpdateAppearance, searchQuery, dragHandleProps,
  otherWorkspaces, onMoveBoardToWorkspace,
}) => {
  const { openTab, tabs } = useTab();
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(board.name);

  const handleRename = () => {
    if (renameValue.trim() && renameValue.trim() !== board.name) {
      onRenameBoard(board.id, renameValue.trim());
    }
    setRenaming(false);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="flex items-center group/board"
        >
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              className="p-0.5 rounded text-muted-foreground opacity-0 group-hover/board:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing transition-opacity flex-shrink-0"
            >
              <GripVertical className="w-3 h-3" />
            </button>
          )}
          {renaming ? (
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setRenaming(false);
              }}
              className="flex-1 density-px density-py text-xs bg-muted rounded-md outline-none border border-primary mx-1"
            />
          ) : (
            <button
              onClick={(e) => {
                if ((e.ctrlKey || e.metaKey) && tabs.length < 8) {
                  openTab(board.id);
                } else {
                  onBoardClick(board.id);
                }
              }}
              className={`flex items-center gap-1.5 flex-1 density-px density-py-item font-density-cell rounded-md transition-colors ${
                activeBoardId === board.id
                  ? 'bg-primary/15 text-primary font-semibold border-l-2 border-primary'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              {board.color && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: board.color }} />
              )}
              <HighlightText text={board.name} query={searchQuery ?? ''} className="truncate" />
            </button>
          )}

          {(isFavorite || true) && onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(board.id); }}
              className={`p-0.5 rounded flex-shrink-0 transition-opacity ${isFavorite ? 'opacity-100' : 'opacity-0 group-hover/board:opacity-60 hover:!opacity-100'}`}
              title={isFavorite ? 'Desfavoritar' : 'Favoritar'}
            >
              <Star className={`w-3 h-3 ${isFavorite ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`} />
            </button>
          )}

          {itemCount !== undefined && itemCount > 0 && (
            <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 font-mono tabular-nums">
              {itemCount}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground opacity-0 group-hover/board:opacity-100 transition-all mr-0.5">
                <MoreHorizontal className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => { setRenameValue(board.name); setRenaming(true); }}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicateBoard(board.id)}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar
              </DropdownMenuItem>
              {onUpdateAppearance && (
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                  <EmojiColorPicker
                    emoji={board.icon}
                    color={board.color}
                    onEmojiChange={(emoji) => onUpdateAppearance(board.id, emoji, board.color ?? null)}
                    onColorChange={(color) => onUpdateAppearance(board.id, board.icon ?? null, color)}
                    size="sm"
                  />
                </DropdownMenuItem>
              )}
              {folders.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {board.id && folders.map(f => (
                    <DropdownMenuItem key={f.id} onClick={() => onMoveBoard(board.id, f.id)}>
                      Mover para {f.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => onMoveBoard(board.id, null)}>
                    Remover da pasta
                  </DropdownMenuItem>
                </>
              )}
              {otherWorkspaces && otherWorkspaces.length > 0 && onMoveBoardToWorkspace && (
                <>
                  <DropdownMenuSeparator />
                  {otherWorkspaces.map(ws => (
                    <DropdownMenuItem key={ws.id} onClick={() => onMoveBoardToWorkspace(board.id, ws.id)}>
                      <ArrowRightLeft className="w-3.5 h-3.5 mr-2" /> {ws.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteBoard(board.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-44">
        <ContextMenuItem
          onClick={() => {
            if (tabs.length >= 8) {
              toast.error('Maximo de 8 abas atingido');
              return;
            }
            openTab(board.id);
          }}
        >
          <Layers className="w-3.5 h-3.5 mr-2" /> Abrir em nova aba
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => { setRenameValue(board.name); setRenaming(true); }}>
          <Pencil className="w-3.5 h-3.5 mr-2" /> Renomear
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDuplicateBoard(board.id)}>
          <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar
        </ContextMenuItem>
        {folders.length > 0 && (
          <>
            <ContextMenuSeparator />
            {board.id && folders.map(f => (
              <ContextMenuItem key={f.id} onClick={() => onMoveBoard(board.id, f.id)}>
                Mover para {f.name}
              </ContextMenuItem>
            ))}
            {board.folder_id && (
              <ContextMenuItem onClick={() => onMoveBoard(board.id, null)}>
                Remover da pasta
              </ContextMenuItem>
            )}
          </>
        )}
        {otherWorkspaces && otherWorkspaces.length > 0 && onMoveBoardToWorkspace && (
          <>
            <ContextMenuSeparator />
            {otherWorkspaces.map(ws => (
              <ContextMenuItem key={ws.id} onClick={() => onMoveBoardToWorkspace(board.id, ws.id)}>
                <ArrowRightLeft className="w-3.5 h-3.5 mr-2" /> {ws.name}
              </ContextMenuItem>
            ))}
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onDeleteBoard(board.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

/** Sortable wrapper for BoardItem */
const SortableBoardItem = (props: BoardItemProps & { id: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BoardItem {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
};

/** Calculate a new position between two neighbors */
function calcMidPosition(prevPos: number | undefined, nextPos: number | undefined): number {
  const prev = prevPos ?? 0;
  const next = nextPos ?? prev + 2000;
  return (prev + next) / 2;
}

interface SortableBoardListProps {
  boards: BoardData[];
  activeBoardId: string | null;
  onBoardClick: (boardId: string) => void;
  onDeleteBoard: (boardId: string) => void;
  onRenameBoard: (boardId: string, name: string) => void;
  onDuplicateBoard: (boardId: string) => void;
  onMoveBoard: (boardId: string, folderId: string | null) => void;
  folders: Array<{ id: string; name: string }>;
  itemCounts?: Record<string, number>;
  profiles?: Array<{ id: string; name: string; avatar_url?: string | null }>;
  favorites?: any[];
  onToggleFavorite?: (boardId: string) => void;
  onUpdateAppearance?: (boardId: string, icon: string | null, color: string | null) => void;
  searchQuery?: string;
  onReorderBoard: (boardId: string, position: number) => void;
  otherWorkspaces?: WorkspaceOption[];
  onMoveBoardToWorkspace?: (boardId: string, workspaceId: string) => void;
}

const SortableBoardList: React.FC<SortableBoardListProps> = ({
  boards, activeBoardId, onBoardClick, onDeleteBoard, onRenameBoard,
  onDuplicateBoard, onMoveBoard, folders, itemCounts, profiles, favorites,
  onToggleFavorite, onUpdateAppearance, searchQuery, onReorderBoard,
  otherWorkspaces, onMoveBoardToWorkspace,
}) => {
  if (boards.length === 0) return null;

  return (
    <SortableContext items={boards.map(b => b.id)} strategy={verticalListSortingStrategy}>
      {boards.map((board) => (
        <SortableBoardItem
          key={board.id}
          id={board.id}
          board={board}
          activeBoardId={activeBoardId}
          onBoardClick={onBoardClick}
          onDeleteBoard={onDeleteBoard}
          onRenameBoard={onRenameBoard}
          onDuplicateBoard={onDuplicateBoard}
          onMoveBoard={onMoveBoard}
          folders={folders}
          itemCount={itemCounts?.[board.id]}
          profiles={profiles}
          isFavorite={favorites?.some((f: any) => f.board_id === board.id)}
          onToggleFavorite={onToggleFavorite}
          onUpdateAppearance={onUpdateAppearance}
          searchQuery={searchQuery}
          otherWorkspaces={otherWorkspaces}
          onMoveBoardToWorkspace={onMoveBoardToWorkspace}
        />
      ))}
    </SortableContext>
  );
};

interface FolderNodeProps {
  folder: { id: string; name: string; parent_id: string | null; position: number };
  boards: Array<BoardData>;
  childFolders: Array<{ id: string; name: string; parent_id: string | null; position: number }>;
  allFolders: Array<{ id: string; name: string; parent_id: string | null; position: number }>;
  activeBoardId: string | null;
  onBoardClick: (boardId: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onMoveBoard: (boardId: string, folderId: string | null) => void;
  onDeleteBoard: (boardId: string) => void;
  onRenameBoard: (boardId: string, name: string) => void;
  onDuplicateBoard: (boardId: string) => void;
  allFoldersFlat: Array<{ id: string; name: string }>;
  itemCounts?: Record<string, number>;
  profiles?: Array<{ id: string; name: string; avatar_url?: string | null }>;
  favorites?: any[];
  onToggleFavorite?: (boardId: string) => void;
  onUpdateAppearance?: (boardId: string, icon: string | null, color: string | null) => void;
  searchQuery?: string;
  onReorderBoard: (boardId: string, position: number) => void;
  otherWorkspaces?: WorkspaceOption[];
  onMoveBoardToWorkspace?: (boardId: string, workspaceId: string) => void;
}

const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  boards,
  childFolders,
  allFolders,
  activeBoardId,
  onBoardClick,
  onDeleteFolder,
  onRenameFolder,
  onMoveBoard,
  onDeleteBoard,
  onRenameBoard,
  onDuplicateBoard,
  allFoldersFlat,
  itemCounts,
  profiles,
  favorites,
  onToggleFavorite,
  onUpdateAppearance,
  searchQuery,
  onReorderBoard,
  otherWorkspaces,
  onMoveBoardToWorkspace,
}) => {
  const storageFolderKey = `lfpro-folder-expanded-${folder.id}`;
  const [expanded, setExpandedState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(storageFolderKey);
      if (stored !== null) return stored === 'true';
    } catch {}
    return true;
  });
  const setExpanded = (value: boolean) => {
    setExpandedState(value);
    try { localStorage.setItem(storageFolderKey, String(value)); } catch {}
  };

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);

  const folderBoards = boards.filter((b) => b.folder_id === folder.id);
  const nestedFolders = allFolders.filter((f) => f.parent_id === folder.id);

  const handleRename = () => {
    if (renameValue.trim() && renameValue.trim() !== folder.name) {
      onRenameFolder(folder.id, renameValue.trim());
    }
    setRenaming(false);
  };

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
  });

  return (
    <div className="density-space-y">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={setDroppableRef}
            className={`flex items-center group/folder rounded-md transition-colors ${
              isOver ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}
          >
            {renaming ? (
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setRenaming(false);
                }}
                className="flex-1 density-px density-py text-xs bg-muted rounded-md outline-none border border-primary mx-1"
              />
            ) : (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center flex-1 density-px density-py-item text-sm rounded-md hover:bg-sidebar-accent transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 mr-2 text-yellow-500 flex-shrink-0" />
                {expanded ? (
                  <ChevronDown className="w-3 h-3 mr-1 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3 h-3 mr-1 text-muted-foreground" />
                )}
                <span className="truncate text-sidebar-foreground font-medium font-density-cell">
                  {folder.name}
                </span>
                <span className="ml-1 text-muted-foreground/50 font-density-tiny">
                  ({folderBoards.length})
                </span>
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground opacity-0 group-hover/folder:opacity-100 transition-all mr-0.5">
                  <MoreHorizontal className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => {
                    setRenameValue(folder.name);
                    setRenaming(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Renomear
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteFolder(folder.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-40">
          <ContextMenuItem
            onClick={() => {
              setRenameValue(folder.name);
              setRenaming(true);
            }}
          >
            <Pencil className="w-3.5 h-3.5 mr-2" /> Renomear
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDeleteFolder(folder.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {expanded && (
        <div className="ml-4 pl-2 border-l-2 border-sidebar-border/30 density-space-y">
          {nestedFolders.map((childFolder) => (
            <FolderNode
              key={childFolder.id}
              folder={childFolder}
              boards={boards}
              childFolders={allFolders.filter((f) => f.parent_id === childFolder.id)}
              allFolders={allFolders}
              activeBoardId={activeBoardId}
              onBoardClick={onBoardClick}
              onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder}
              onMoveBoard={onMoveBoard}
              onDeleteBoard={onDeleteBoard}
              onRenameBoard={onRenameBoard}
              onDuplicateBoard={onDuplicateBoard}
              allFoldersFlat={allFoldersFlat}
              itemCounts={itemCounts}
              profiles={profiles}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              onUpdateAppearance={onUpdateAppearance}
              searchQuery={searchQuery}
              onReorderBoard={onReorderBoard}
              otherWorkspaces={otherWorkspaces}
              onMoveBoardToWorkspace={onMoveBoardToWorkspace}
            />
          ))}
          <SortableBoardList
            boards={folderBoards}
            activeBoardId={activeBoardId}
            onBoardClick={onBoardClick}
            onDeleteBoard={onDeleteBoard}
            onRenameBoard={onRenameBoard}
            onDuplicateBoard={onDuplicateBoard}
            onMoveBoard={onMoveBoard}
            folders={allFoldersFlat}
            itemCounts={itemCounts}
            profiles={profiles}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            onUpdateAppearance={onUpdateAppearance}
            searchQuery={searchQuery}
            onReorderBoard={onReorderBoard}
            otherWorkspaces={otherWorkspaces}
            onMoveBoardToWorkspace={onMoveBoardToWorkspace}
          />
        </div>
      )}
    </div>
  );
};

const WorkspaceFolders: React.FC<WorkspaceFoldersProps> = ({
  workspaceId,
  boards,
  activeBoardId,
  onBoardClick,
  itemCounts,
  profiles,
  favorites,
  onToggleFavorite,
  onUpdateAppearance,
  searchQuery,
  otherWorkspaces,
  onMoveBoardToWorkspace,
}) => {
  const { data: folders = [] } = useWorkspaceFolders(workspaceId);
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const moveBoard = useMoveBoard();
  const deleteBoardMut = useDeleteBoard();
  const renameBoardMut = useRenameBoard();
  const duplicateBoardMut = useDuplicateBoard();
  const reorderBoardMut = useReorderBoard();

  const [showCreate, setShowCreate] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);

  const rootFolders = folders.filter((f) => !f.parent_id);
  const rootBoards = boards.filter(
    (b) => !b.folder_id || !folders.some((f) => f.id === b.folder_id)
  );

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setShowCreate(false);
      return;
    }
    try {
      await createFolder.mutateAsync({
        workspaceId,
        name: newFolderName.trim(),
      });
      toast.success('Pasta criada');
      setNewFolderName('');
      setShowCreate(false);
    } catch {
      toast.error('Erro ao criar pasta');
    }
  };

  const handleRenameFolder = async (id: string, name: string) => {
    try {
      await updateFolder.mutateAsync({ id, name });
      toast.success('Pasta renomeada');
    } catch {
      toast.error('Erro ao renomear pasta');
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderId) return;
    try {
      await deleteFolder.mutateAsync(deleteFolderId);
      toast.success('Pasta excluida. Boards movidos para raiz.');
      setDeleteFolderId(null);
    } catch {
      toast.error('Erro ao excluir pasta');
    }
  };

  const handleMoveBoard = async (boardId: string, folderId: string | null) => {
    try {
      await moveBoard.mutateAsync({ boardId, folderId });
      toast.success('Board movido');
    } catch {
      toast.error('Erro ao mover board');
    }
  };

  const handleDeleteBoard = async () => {
    if (!boardToDelete) return;
    try {
      await deleteBoardMut.mutateAsync(boardToDelete);
      toast.success('Board excluido');
      setBoardToDelete(null);
    } catch {
      toast.error('Erro ao excluir board');
    }
  };

  const handleRenameBoard = async (boardId: string, name: string) => {
    try {
      await renameBoardMut.mutateAsync({ id: boardId, name });
      toast.success('Board renomeado');
    } catch {
      toast.error('Erro ao renomear board');
    }
  };

  const handleDuplicateBoard = async (boardId: string) => {
    try {
      await duplicateBoardMut.mutateAsync(boardId);
      toast.success('Board duplicado');
    } catch {
      toast.error('Erro ao duplicar board');
    }
  };

  const handleUpdateAppearance = (boardId: string, icon: string | null, color: string | null) => {
    if (onUpdateAppearance) {
      onUpdateAppearance(boardId, icon, color);
    }
  };

  const handleReorderBoard = async (boardId: string, position: number) => {
    try {
      await reorderBoardMut.mutateAsync({ boardId, position });
    } catch {
      toast.error('Erro ao reordenar board');
    }
  };

  const foldersFlat = folders.map(f => ({ id: f.id, name: f.name }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const overId = over.id as string;

    // Dropped on a folder droppable
    if (overId.startsWith('folder-')) {
      const folderId = overId.replace('folder-', '');
      handleMoveBoard(active.id as string, folderId);
      return;
    }

    // Reorder within root boards
    const oldIndex = rootBoards.findIndex(b => b.id === active.id);
    const newIndex = rootBoards.findIndex(b => b.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(rootBoards, oldIndex, newIndex);
    const prevBoard = newIndex > 0 ? reordered[newIndex - 1] : undefined;
    const nextBoard = newIndex < reordered.length - 1 ? reordered[newIndex + 1] : undefined;
    const newPosition = calcMidPosition(prevBoard?.position, nextBoard?.position);

    handleReorderBoard(active.id as string, newPosition);
  };

  return (
    <div className="density-space-y">
      {/* Create folder button */}
      {showCreate ? (
        <div className="flex items-center gap-1 px-1">
          <FolderOpen className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            autoFocus
            placeholder="Nome da pasta..."
            onBlur={handleCreateFolder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') {
                setShowCreate(false);
                setNewFolderName('');
              }
            }}
            className="flex-1 density-px density-py text-xs bg-muted rounded-md outline-none border border-primary"
          />
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center w-full density-px density-py-item text-sm rounded-md hover:bg-sidebar-accent text-muted-foreground transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5 mr-2" />
          <span className="font-density-cell">Nova pasta</span>
        </button>
      )}

      {/* Unified DndContext for drag-to-folder and board reordering */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* Folder tree */}
        {rootFolders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            boards={boards as any}
            childFolders={folders.filter((f) => f.parent_id === folder.id)}
            allFolders={folders}
            activeBoardId={activeBoardId}
            onBoardClick={onBoardClick}
            onDeleteFolder={(id) => setDeleteFolderId(id)}
            onRenameFolder={handleRenameFolder}
            onMoveBoard={handleMoveBoard}
            onDeleteBoard={(id) => setBoardToDelete(id)}
            onRenameBoard={handleRenameBoard}
            onDuplicateBoard={handleDuplicateBoard}
            allFoldersFlat={foldersFlat}
            itemCounts={itemCounts}
            profiles={profiles}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            onUpdateAppearance={handleUpdateAppearance}
            searchQuery={searchQuery}
            onReorderBoard={handleReorderBoard}
            otherWorkspaces={otherWorkspaces}
            onMoveBoardToWorkspace={onMoveBoardToWorkspace}
          />
        ))}

        {/* Spacing between folders and root boards */}
        {rootFolders.length > 0 && rootBoards.length > 0 && (
          <div className="h-2" />
        )}

        {/* Root-level boards (sortable) */}
        <SortableBoardList
          boards={rootBoards}
          activeBoardId={activeBoardId}
          onBoardClick={onBoardClick}
          onDeleteBoard={(id) => setBoardToDelete(id)}
          onRenameBoard={handleRenameBoard}
          onDuplicateBoard={handleDuplicateBoard}
          onMoveBoard={handleMoveBoard}
          folders={foldersFlat}
          itemCounts={itemCounts}
          profiles={profiles}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onUpdateAppearance={handleUpdateAppearance}
          searchQuery={searchQuery}
          onReorderBoard={handleReorderBoard}
          otherWorkspaces={otherWorkspaces}
          onMoveBoardToWorkspace={onMoveBoardToWorkspace}
        />
      </DndContext>

      <AlertDialog open={!!boardToDelete} onOpenChange={() => setBoardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir board?</AlertDialogTitle>
            <AlertDialogDescription>O board sera movido para a lixeira.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBoard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteFolderId} onOpenChange={() => setDeleteFolderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
            <AlertDialogDescription>
              A pasta sera excluida e os boards dentro dela serao movidos para o nivel raiz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkspaceFolders;
