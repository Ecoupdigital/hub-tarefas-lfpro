import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Home, Search, Star, X, Clock,
  Plus, LayoutDashboard, PanelLeftClose, PanelLeft, LogOut, MoreHorizontal,
  Trash2, Copy, Pencil, Menu, Paintbrush, User, Settings, FolderOpen,
  Briefcase, ChevronsDownUp, ChevronsUpDown, GripVertical, Users
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useProfiles } from '@/hooks/useSupabaseData';
import { prefetchMyWorkItems } from '@/hooks/useMyWorkItems';
import {
  useDeleteBoard, useToggleFavorite, useRenameBoard, useDuplicateBoard,
  useRenameWorkspace, useDeleteWorkspace, useUpdateWorkspaceAppearance,
  useUpdateBoardAppearance, useFavorites, useMoveBoardToWorkspace,
} from '@/hooks/useCrudMutations';
import { useRecentBoards } from '@/hooks/useRecentBoards';
import { useBoardItemCounts } from '@/hooks/useBoardItemCounts';
import { EmojiColorPicker } from '@/components/shared/EmojiColorPicker';
import CreateWorkspaceModal from './modals/CreateWorkspaceModal';
import CreateBoardModal from './modals/CreateBoardModal';
import ThemeToggle from './ThemeToggle';
import ThemeCustomizer from '@/components/settings/ThemeCustomizer';
import UserProfile from '@/components/auth/UserProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import TrashDrawer from '@/components/workspace/TrashDrawer';
import WorkspaceSettings from '@/components/workspace/WorkspaceSettings';
import { useTrashItems } from '@/hooks/useTrash';
import WorkspaceFolders from '@/components/workspace/WorkspaceFolders';
import PermissionGate from '@/components/shared/PermissionGate';

interface WorkspaceItemProps {
  workspace: any;
  sidebarSearch: string;
  activeBoardId: string | null;
  itemCounts?: Record<string, number>;
  presenceData?: Record<string, string[]>;
  profiles?: Array<{ id: string; name: string; avatar_url?: string | null }>;
  favorites?: any[];
  onToggleFavorite?: (boardId: string) => void;
  onUpdateAppearance?: (boardId: string, icon: string | null, color: string | null) => void;
  searchQuery?: string;
  otherWorkspaces?: Array<{ id: string; name: string }>;
  onMoveBoardToWorkspace?: (boardId: string, workspaceId: string) => void;
}

const SortableWorkspaceItem = (props: WorkspaceItemProps & { id: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <WorkspaceItem {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
};

const WorkspaceItem = React.memo(({ workspace, sidebarSearch, activeBoardId, itemCounts, presenceData, profiles, favorites, onToggleFavorite, onUpdateAppearance, searchQuery, dragHandleProps, otherWorkspaces, onMoveBoardToWorkspace }: WorkspaceItemProps & { dragHandleProps?: any }) => {
  const storageKey = `lfpro-ws-expanded-${workspace.id}`;

  const [expanded, setExpandedState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return stored === 'true';
    } catch {}
    return workspace.boards?.length > 0;
  });

  const setExpanded = (value: boolean) => {
    setExpandedState(value);
    try { localStorage.setItem(storageKey, String(value)); } catch {}
  };

  useEffect(() => {
    const handler = (e: Event) => setExpanded(!(e as CustomEvent).detail.collapsed);
    window.addEventListener('lfpro-collapse-workspaces', handler);
    return () => window.removeEventListener('lfpro-collapse-workspaces', handler);
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = useNavigate();
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamingWs, setRenamingWs] = useState(false);
  const [wsRenameValue, setWsRenameValue] = useState('');
  const [showDeleteWs, setShowDeleteWs] = useState(false);
  const [showWsSettings, setShowWsSettings] = useState(false);
  const deleteBoard = useDeleteBoard();
  const renameBoard = useRenameBoard();
  const duplicateBoard = useDuplicateBoard();
  const renameWorkspace = useRenameWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  const updateWsAppearance = useUpdateWorkspaceAppearance();

  const filteredBoards = sidebarSearch
    ? workspace.boards?.filter((b: any) => b.name.toLowerCase().includes(sidebarSearch.toLowerCase()))
    : workspace.boards;

  const showWs = !sidebarSearch || filteredBoards?.length > 0 ||
    workspace.name.toLowerCase().includes(sidebarSearch.toLowerCase());

  if (!showWs) return null;

  const handleDeleteBoard = async () => {
    if (!boardToDelete) return;
    try { await deleteBoard.mutateAsync(boardToDelete); toast.success('Board excluido'); setBoardToDelete(null); } catch { toast.error('Erro ao excluir board'); }
  };

  const handleRename = async (boardId: string) => {
    if (!renameValue.trim()) { setRenamingBoardId(null); return; }
    try { await renameBoard.mutateAsync({ id: boardId, name: renameValue.trim() }); toast.success('Board renomeado'); } catch { toast.error('Erro ao renomear'); }
    setRenamingBoardId(null);
  };

  const handleDuplicate = async (boardId: string) => {
    try { await duplicateBoard.mutateAsync(boardId); toast.success('Board duplicado'); } catch { toast.error('Erro ao duplicar'); }
  };

  const handleRenameWs = async () => {
    if (!wsRenameValue.trim()) { setRenamingWs(false); return; }
    try { await renameWorkspace.mutateAsync({ id: workspace.id, name: wsRenameValue.trim() }); toast.success('Workspace renomeado'); } catch { toast.error('Erro ao renomear'); }
    setRenamingWs(false);
  };

  const handleDeleteWs = async () => {
    try { await deleteWorkspace.mutateAsync(workspace.id); toast.success('Workspace excluido'); setShowDeleteWs(false); } catch { toast.error('Erro ao excluir workspace'); }
  };

  return (
    <div className="density-space-y">
      <div className="flex items-center group/ws">
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="p-0.5 rounded text-muted-foreground opacity-0 group-hover/ws:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
          >
            <GripVertical className="w-3 h-3" />
          </button>
        )}
        {renamingWs ? (
          <input value={wsRenameValue} onChange={e => setWsRenameValue(e.target.value)}
            ref={(el) => el?.focus({ preventScroll: true })}
            onBlur={handleRenameWs}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameWs(); if (e.key === 'Escape') setRenamingWs(false); }}
            className="flex-1 min-w-0 density-px density-py text-xs bg-muted rounded-md outline-none border border-primary mx-1" />
        ) : (
          <button onClick={() => setExpanded(!expanded)}
            onDoubleClick={() => navigate(`/workspace/${workspace.id}`)}
            className="flex items-center flex-1 density-px density-py-item text-sm rounded-md hover:bg-sidebar-accent transition-colors duration-[70ms]">
            {expanded ? <ChevronDown className="w-3 h-3 mr-1 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 mr-1 text-muted-foreground" />}
            <span className="monday-text2 truncate text-sidebar-foreground font-medium font-density-cell">{workspace.name}</span>
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground opacity-0 group-hover/ws:opacity-100 transition-all mr-0.5">
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => navigate(`/workspace/${workspace.id}`)}>
              <LayoutDashboard className="w-3.5 h-3.5 mr-2" /> Ver workspace
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowCreateBoard(true)}>
              <Plus className="w-3.5 h-3.5 mr-2" /> Novo board
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setWsRenameValue(workspace.name); setRenamingWs(true); }}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowWsSettings(true)}>
              <Settings className="w-3.5 h-3.5 mr-2" /> Configuracoes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowDeleteWs(true)} className="text-destructive focus:text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button onClick={() => setShowCreateBoard(true)}
          className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground opacity-0 group-hover/ws:opacity-100 transition-all mr-1" title="Novo board">
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Animated expand/collapse */}
      <div
        className="overflow-hidden transition-[grid-template-rows] duration-150 ease-out"
        style={{
          display: 'grid',
          gridTemplateRows: expanded && filteredBoards?.length > 0 ? '1fr' : '0fr'
        }}
      >
        <div className="min-h-0">
          <div className="density-indent density-space-y">
            <WorkspaceFolders
              workspaceId={workspace.id}
              boards={filteredBoards}
              activeBoardId={activeBoardId}
              onBoardClick={(boardId) => navigate(`/board/${boardId}`)}
              itemCounts={itemCounts}
              presenceData={presenceData}
              profiles={profiles}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              onUpdateAppearance={onUpdateAppearance}
              searchQuery={searchQuery || sidebarSearch}
              otherWorkspaces={otherWorkspaces}
              onMoveBoardToWorkspace={onMoveBoardToWorkspace}
            />
          </div>
        </div>
      </div>

      <CreateBoardModal open={showCreateBoard} onOpenChange={setShowCreateBoard} workspaceId={workspace.id} />
      <WorkspaceSettings open={showWsSettings} onOpenChange={setShowWsSettings} workspace={workspace} />
      <AlertDialog open={!!boardToDelete} onOpenChange={() => setBoardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir board?</AlertDialogTitle><AlertDialogDescription>O board sera movido para a lixeira.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBoard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showDeleteWs} onOpenChange={setShowDeleteWs}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir workspace?</AlertDialogTitle><AlertDialogDescription>Ao excluir o workspace &quot;{workspace.name}&quot;, {workspace.boards?.length ?? 0} board{(workspace.boards?.length ?? 0) === 1 ? '' : 's'} e todos os seus itens serao excluidos permanentemente. Esta acao nao pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWs} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

const SidebarContent = () => {
  const { workspaces, sidebarCollapsed, setSidebarCollapsed, favorites, boards, activeBoardId, loading } = useApp();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isMyWorkPage = location.pathname === '/my-work';
  const isTeamWorkPage = location.pathname === '/team-work';
  const displayActiveBoardId = (isMyWorkPage || isTeamWorkPage) ? null : activeBoardId;
  const { data: profile } = useProfile(user?.id);
  const { data: allProfiles = [] } = useProfiles();
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const sidebarSearchRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [allWsCollapsed, setAllWsCollapsed] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const { data: trashItems = [] } = useTrashItems();

  // Recent boards
  const { recentBoardIds, trackBoardAccess } = useRecentBoards();
  const recentBoards = recentBoardIds
    .map(id => boards.find((b: any) => b.id === id))
    .filter(Boolean)
    .slice(0, 5);

  useEffect(() => {
    if (activeBoardId) trackBoardAccess(activeBoardId);
  }, [activeBoardId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preserve sidebar scroll position across re-renders
  const scrollTopRef = useRef(0);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => { scrollTopRef.current = el.scrollTop; };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && scrollTopRef.current > 0) {
      requestAnimationFrame(() => { el.scrollTop = scrollTopRef.current; });
    }
  });

  // Item counts
  const allBoardIds = boards.map((b: any) => b.id);
  const { data: itemCounts = {} } = useBoardItemCounts(allBoardIds);

  // Favorites from DB
  const { data: dbFavorites = [] } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const updateBoardAppearance = useUpdateBoardAppearance();
  const moveBoardToWorkspace = useMoveBoardToWorkspace();

  // Drag & drop workspace order
  const [workspaceOrder, setWorkspaceOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('lfpro-workspace-order');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // Keep order in sync when workspaces change
  useEffect(() => {
    if (workspaces.length === 0) return;
    setWorkspaceOrder(prev => {
      const wsIds = workspaces.map((ws: any) => ws.id);
      const existingOrder = prev.filter(id => wsIds.includes(id));
      const newIds = wsIds.filter(id => !existingOrder.includes(id));
      return [...existingOrder, ...newIds];
    });
  }, [workspaces]);

  const sortedWorkspaces = workspaceOrder
    .map(id => workspaces.find((ws: any) => ws.id === id))
    .filter(Boolean)
    .concat(workspaces.filter((ws: any) => !workspaceOrder.includes(ws.id)));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWorkspaceOrder(prev => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const newOrder = arrayMove(prev, oldIndex, newIndex);
      localStorage.setItem('lfpro-workspace-order', JSON.stringify(newOrder));
      return newOrder;
    });
  };

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuario';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  // Search empty state check
  const searchHasNoResults = sidebarSearch && workspaces.every((ws: any) =>
    !ws.name.toLowerCase().includes(sidebarSearch.toLowerCase()) &&
    !(ws.boards?.some((b: any) => b.name.toLowerCase().includes(sidebarSearch.toLowerCase())))
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">L</span>
          </div>
          <span className="font-bold font-density-item text-sidebar-foreground">LFPro Tasks</span>
        </div>
        <div className="flex items-center density-gap">
          <ThemeToggle />
          <button onClick={() => setSidebarCollapsed(true)} className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground transition-colors duration-[70ms]" aria-label="Recolher sidebar">
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="density-px py-2">
        <div className="flex items-center density-gap bg-muted rounded-md density-px density-py">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input ref={sidebarSearchRef} value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setSidebarSearch(''); }}
            placeholder="Buscar boards..." className="flex-1 bg-transparent font-density-cell text-foreground outline-none placeholder:text-muted-foreground/50" />
          {sidebarSearch && (
            <button onClick={() => setSidebarSearch('')} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="px-2 density-space-y">
        <button onClick={() => navigate('/')} className="flex items-center w-full density-px density-py-item text-sm rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors duration-[70ms]">
          <Home className="w-4 h-4 mr-2.5" /> <span className="font-density-cell font-medium">Home</span>
        </button>
        <button
          onClick={() => navigate('/my-work')}
          onMouseEnter={() => prefetchMyWorkItems(queryClient, user?.id)}
          className={`flex items-center w-full density-px density-py-item text-sm rounded-md transition-colors duration-[70ms] ${isMyWorkPage ? 'bg-primary/15 text-primary font-semibold' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
        >
          <Briefcase className="w-4 h-4 mr-2.5" /> <span className="font-density-cell font-medium">Meu trabalho</span>
        </button>
        <PermissionGate requiredRole="admin">
          <button onClick={() => navigate('/team-work')} className={`flex items-center w-full density-px density-py-item text-sm rounded-md transition-colors duration-[70ms] ${isTeamWorkPage ? 'bg-primary/15 text-primary font-semibold' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
            <Users className="w-4 h-4 mr-2.5" /> <span className="font-density-cell font-medium">Trabalho da equipe</span>
          </button>
        </PermissionGate>
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative flex items-center w-full density-px density-py-item text-sm rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors duration-[70ms]">
              <Clock className="w-4 h-4 mr-2.5" />
              <span className="font-density-cell font-medium">Recentes</span>
              {recentBoards.length > 0 && (
                <span className="ml-auto font-density-badge bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center text-[10px]">
                  {recentBoards.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-64 p-2">
            <p className="font-density-tiny font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1.5">Recentes</p>
            {recentBoards.length === 0 ? (
              <p className="font-density-cell text-muted-foreground/60 px-2 py-2 text-xs">Nenhum board acessado ainda.</p>
            ) : (
              <div className="space-y-0.5">
                {recentBoards.map((board: any) => (
                  <button
                    key={board.id}
                    onClick={() => navigate(`/board/${board.id}`)}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors ${
                      displayActiveBoardId === board.id
                        ? 'bg-primary/15 text-primary font-semibold'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {board.color && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: board.color }} />
                    )}
                    <span className="truncate font-density-cell">{board.name}</span>
                    <span className="ml-auto font-density-tiny text-muted-foreground/60 flex-shrink-0 truncate max-w-[80px]">
                      {board.workspace_id ? '' : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
        <button className="flex items-center w-full density-px density-py-item text-sm rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors duration-[70ms]">
          <MoreHorizontal className="w-4 h-4 mr-2.5" /> <span className="font-density-cell font-medium">Mais</span>
        </button>
      </div>

      <div className="mx-3 my-1.5 border-t border-sidebar-border" />

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin px-2 py-2">
        {loading ? (
          <div className="space-y-2 px-3">
            <Skeleton className="h-6 w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-5 w-2/3" />
          </div>
        ) : (
          <>
            {/* Favorites */}
            {dbFavorites.length > 0 && !sidebarSearch && (
              <div className="density-section-gap">
                <div className="flex items-center density-px density-section-gap">
                  <span className="monday-h5 font-density-tiny font-semibold uppercase tracking-wider text-muted-foreground">Favoritos</span>
                </div>
                <div className="density-space-y">
                {dbFavorites.map((fav: any) => {
                  const board = boards.find((b: any) => b.id === fav.board_id);
                  if (!board) return null;
                  return (
                    <button key={fav.id} onClick={() => navigate(`/board/${board.id}`)}
                      className={`flex items-center w-full density-px density-py-item font-density-cell rounded-md transition-colors duration-[70ms] ${
                        displayActiveBoardId === board.id ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      }`}>
                      <Star className="w-3 h-3 mr-2 text-yellow-500" fill="currentColor" />
                      <span className="truncate">{board.name}</span>
                    </button>
                  );
                })}
                </div>
              </div>
            )}

            {/* Workspaces header */}
            <div className="flex items-center justify-between density-px density-section-gap">
              <span className="monday-h5 font-density-tiny font-semibold uppercase tracking-wider text-muted-foreground">Workspaces</span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    const next = !allWsCollapsed;
                    setAllWsCollapsed(next);
                    window.dispatchEvent(new CustomEvent('lfpro-collapse-workspaces', { detail: { collapsed: next } }));
                  }}
                  className="p-0.5 rounded hover:bg-sidebar-accent text-muted-foreground"
                  title={allWsCollapsed ? 'Expandir todos os workspaces' : 'Colapsar todos os workspaces'}
                >
                  {allWsCollapsed
                    ? <ChevronsUpDown className="w-3 h-3" />
                    : <ChevronsDownUp className="w-3 h-3" />
                  }
                </button>
                <button
                  onClick={() => { sidebarSearchRef.current?.focus(); }}
                  className="p-0.5 rounded hover:bg-sidebar-accent text-muted-foreground"
                  title="Buscar boards"
                >
                  <Search className="w-3 h-3" />
                </button>
                <button onClick={() => setShowCreateWorkspace(true)} className="p-0.5 rounded hover:bg-sidebar-accent text-muted-foreground" title="Novo workspace">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Workspace list with drag & drop */}
            {workspaces.length === 0 ? (
              <p className="density-px font-density-cell text-muted-foreground/60">Nenhum workspace encontrado</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedWorkspaces.map((ws: any) => ws.id)} strategy={verticalListSortingStrategy}>
                  {sortedWorkspaces.map((ws: any) => (
                    <SortableWorkspaceItem
                      key={ws.id}
                      id={ws.id}
                      workspace={ws}
                      sidebarSearch={sidebarSearch}
                      activeBoardId={displayActiveBoardId}
                      itemCounts={itemCounts}
                      profiles={allProfiles}
                      favorites={dbFavorites}
                      onToggleFavorite={(boardId) => toggleFavorite.mutate(boardId)}
                      onUpdateAppearance={(boardId, icon, color) => updateBoardAppearance.mutate({ id: boardId, icon, color })}
                      searchQuery={sidebarSearch}
                      otherWorkspaces={sortedWorkspaces.filter((w: any) => w.id !== ws.id).map((w: any) => ({ id: w.id, name: w.name }))}
                      onMoveBoardToWorkspace={(boardId, targetWsId) => {
                        const targetWs = workspaces.find((w: any) => w.id === targetWsId);
                        moveBoardToWorkspace.mutate({ boardId, workspaceId: targetWsId }, {
                          onSuccess: () => toast.success(`Board movido para ${targetWs?.name || 'outro workspace'}`),
                          onError: () => toast.error('Erro ao mover board'),
                        });
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}

            {/* Search empty state */}
            {searchHasNoResults && (
              <div className="px-3 py-4 text-center">
                <Search className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="font-density-cell text-muted-foreground/60 text-xs">
                  Nenhum board encontrado
                </p>
                <button onClick={() => setSidebarSearch('')} className="mt-1 text-xs text-primary hover:underline">
                  Limpar busca
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-2 density-py border-t border-sidebar-border density-space-y">
        <button
          onClick={() => setShowTrash(true)}
          className="flex items-center w-full density-px density-py-item text-sm rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors duration-[70ms]"
        >
          <Trash2 className="w-4 h-4 mr-2.5" />
          <span className="font-density-cell font-medium">Lixeira</span>
          {trashItems.length > 0 && (
            <span className="ml-auto font-density-badge bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {trashItems.length}
            </span>
          )}
        </button>
      </div>

      <div className="density-px py-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center density-gap w-full rounded-md hover:bg-sidebar-accent density-px density-py-item transition-colors duration-[70ms] group">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">{initials}</div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-density-cell font-medium text-sidebar-foreground truncate">{displayName}</p>
                <p className="font-density-tiny text-muted-foreground truncate">{user?.email}</p>
              </div>
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52 mb-1">
            <DropdownMenuItem onClick={() => setShowUserProfile(true)}>
              <User className="w-3.5 h-3.5 mr-2" /> Meu perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="w-3.5 h-3.5 mr-2" /> Configuracoes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowThemeCustomizer(true)}>
              <Paintbrush className="w-3.5 h-3.5 mr-2" /> Personalizar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-3.5 h-3.5 mr-2" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreateWorkspaceModal open={showCreateWorkspace} onOpenChange={setShowCreateWorkspace} />
      <TrashDrawer open={showTrash} onOpenChange={setShowTrash} />
      <ThemeCustomizer open={showThemeCustomizer} onOpenChange={setShowThemeCustomizer} />
    </div>
  );
};

const SIDEBAR_WIDTH_KEY = 'lfpro-sidebar-width';
const SIDEBAR_MIN_W = 200;
const SIDEBAR_MAX_W = 480;
const SIDEBAR_DEFAULT_W = 260;

const AppSidebar = () => {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      if (stored) {
        const w = parseInt(stored, 10);
        if (w >= SIDEBAR_MIN_W && w <= SIDEBAR_MAX_W) return w;
      }
    } catch {}
    return SIDEBAR_DEFAULT_W;
  });
  const isResizing = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const autoCollapse = localStorage.getItem('lfpro-sidebar-collapse') === 'true';
    if (!autoCollapse) return;
    const mql = window.matchMedia('(max-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setSidebarCollapsed(true);
    };
    handler(mql);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(SIDEBAR_MAX_W, Math.max(SIDEBAR_MIN_W, ev.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Persist on release
      setSidebarWidth(w => {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w));
        return w;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Double-click on handle resets to default width
  const handleDoubleClick = useCallback(() => {
    setSidebarWidth(SIDEBAR_DEFAULT_W);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(SIDEBAR_DEFAULT_W));
  }, []);

  if (isMobile) {
    return (
      <>
        <button onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 p-2 rounded-md bg-card border border-border shadow-md hover:bg-muted transition-colors duration-[70ms]">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[280px]"><SidebarContent /></SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div className="relative flex-shrink-0 h-full" style={{ width: sidebarCollapsed ? 48 : sidebarWidth }}>
      <div
        ref={sidebarRef}
        className={`h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden ${sidebarCollapsed ? '' : ''}`}
        style={{ width: sidebarCollapsed ? 48 : sidebarWidth }}
      >
        <div
          className={`flex flex-col items-center py-3 gap-2 transition-opacity duration-150 ${sidebarCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none absolute'}`}
        >
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-2 rounded-md hover:bg-sidebar-accent text-muted-foreground transition-colors duration-[70ms]"
            aria-label="Expandir sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <div className="space-y-2">
            <button className="p-2 rounded-md hover:bg-sidebar-accent text-muted-foreground" aria-label="Inicio" title="Inicio"><Home className="w-4 h-4" /></button>
            <button className="p-2 rounded-md hover:bg-sidebar-accent text-muted-foreground" aria-label="Buscar" title="Buscar"><Search className="w-4 h-4" /></button>
            <button className="p-2 rounded-md hover:bg-sidebar-accent text-muted-foreground" aria-label="Favoritos" title="Favoritos"><Star className="w-4 h-4" /></button>
          </div>
        </div>

        <div
          className={`flex-1 flex flex-col min-h-0 min-w-0 transition-opacity duration-100 ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
        >
          <SidebarContent />
        </div>
      </div>

      {/* Resize handle */}
      {!sidebarCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-10 group hover:bg-primary/30 active:bg-primary/50 transition-colors"
          title="Arraste para redimensionar (duplo-clique para resetar)"
        >
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1 h-8 rounded-full bg-transparent group-hover:bg-primary/50 transition-colors" />
        </div>
      )}
    </div>
  );
};

export default AppSidebar;
