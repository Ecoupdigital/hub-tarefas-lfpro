import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect, useRef } from 'react';
import { useWorkspaces, useAllBoards, useGroups, useColumns, useItems, useColumnValues, useUpdateColumnValue, useUpdateItem, useCreateItem, useToggleGroupCollapse, useCollapseAllGroups, useProfiles } from '@/hooks/useSupabaseData';
import { useFavorites, useCreateWorkspace, useCreateBoard, useCreateGroup, useCreateColumn } from '@/hooks/useCrudMutations';
import { useRealtimeSync, useRealtimeFavorites } from '@/hooks/useRealtimeSync';
import { usePreloadTabs } from '@/hooks/usePreloadTabs';
import { useAuth } from '@/hooks/useAuth';
import { useUI } from '@/context/UIContext';
import { useFilter } from '@/context/FilterContext';
import type { Board, Column, Group, ColumnValue } from '@/types/board';
import { evaluateFilterGroup } from '@/components/board/FilterBuilder';

interface BoardContextType {
  workspaces: any[];
  boards: any[];
  activeBoard: Board | null;
  setActiveBoard: (board: Board | null) => void;
  activeWorkspace: any | null;
  users: any[];
  groups: Group[];
  columns: Column[];
  items: any[];
  columnValues: any[];
  toggleGroupCollapse: (groupId: string) => void;
  collapseAllGroups: (collapsed: boolean) => void;
  updateItemColumnValue: (itemId: string, columnId: string, value: ColumnValue) => void;
  updateItemName: (itemId: string, name: string) => void;
  addItemToGroup: (groupId: string, name: string) => void;
  loading: boolean;
  favorites: any[];
  isFavorite: (boardId: string) => boolean;
}

const BoardContext = createContext<BoardContextType | null>(null);

export const useBoard = () => {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used inside BoardProvider');
  return ctx;
};

export const BoardProvider = ({ children }: { children: ReactNode }) => {
  const {
    activeBoardId, setActiveBoardId, activeWorkspaceId, setActiveWorkspaceId, setSelectedItem,
  } = useUI();
  const {
    searchQuery, advancedFilter, sort, hiddenColumns, resetAll,
  } = useFilter();

  const { data: dbWorkspaces = [], isLoading: wsLoading } = useWorkspaces();
  const { data: dbBoards = [], isLoading: boardsLoading } = useAllBoards();
  const { data: dbGroups = [], isLoading: groupsLoading } = useGroups(activeBoardId);
  const { data: dbColumns = [], isLoading: colsLoading } = useColumns(activeBoardId);
  const { data: dbItems = [], isLoading: itemsLoading } = useItems(activeBoardId);
  const { data: dbColumnValues = [] } = useColumnValues(activeBoardId);
  const { data: dbProfiles = [] } = useProfiles();
  const { data: dbFavorites = [] } = useFavorites();

  const { user } = useAuth();

  const updateColVal = useUpdateColumnValue();
  const updateItemMut = useUpdateItem();
  const createItemMut = useCreateItem();
  const createWsMut = useCreateWorkspace();
  const createBoardMut = useCreateBoard();
  const createGroupMut = useCreateGroup();
  const createColMut = useCreateColumn();
  const toggleGroupMut = useToggleGroupCollapse();
  const collapseAllMut = useCollapseAllGroups();

  // Realtime sync — workspace-level (all boards, not just active)
  useRealtimeSync();
  // Realtime sync — favorites (AC 6: sincronizacao entre abas)
  useRealtimeFavorites();
  // Prefetch data for all open tabs (instant switching)
  usePreloadTabs();

  // Onboarding: auto-create workspace + board + columns for new users.
  // Guard conditions:
  //   1. onboardingDone.current — prevents re-running within the same session
  //   2. wsLoading / boardsLoading — wait until data is fetched before deciding
  //   3. !user — only run for authenticated users
  // Two scenarios handled:
  //   A. No workspace exists → create workspace, board, group, columns (full onboarding)
  //   B. Workspace exists (e.g. created by DB trigger handle_new_user) but no boards →
  //      create board, group, columns only (partial onboarding recovery)
  const onboardingDone = useRef(false);
  useEffect(() => {
    if (onboardingDone.current || wsLoading || boardsLoading || !user) return;
    // Scenario A: no workspace at all — full onboarding
    if (dbWorkspaces.length === 0) {
      (async () => {
        try {
          const ws = await createWsMut.mutateAsync({ name: 'Meu Workspace', icon: '🚀', color: '#6161FF' });
          const board = await createBoardMut.mutateAsync({ workspaceId: ws.id, name: 'Primeiros passos', description: 'Seu primeiro board!' });
          await createGroupMut.mutateAsync({ boardId: board.id, title: 'Tarefas', color: '#579BFC' });
          await createColMut.mutateAsync({
            boardId: board.id, title: 'Status', columnType: 'status',
            settings: { labels: { '1': { name: 'A Fazer', color: '#579BFC' }, '2': { name: 'Trabalhando', color: '#FDAB3D' }, '3': { name: 'Concluído', color: '#00C875', isDone: true } } }
          });
          await createColMut.mutateAsync({ boardId: board.id, title: 'Pessoa', columnType: 'people' });
          await createColMut.mutateAsync({ boardId: board.id, title: 'Data', columnType: 'date' });
          setActiveBoardId(board.id);
          onboardingDone.current = true;
        } catch (e) { console.error('Onboarding error (new workspace):', e); }
      })();
      return;
    }
    // Scenario B: workspace exists but no boards — create default board + columns only
    if (dbWorkspaces.length > 0 && dbBoards.length === 0) {
      (async () => {
        try {
          const ws = dbWorkspaces[0];
          const board = await createBoardMut.mutateAsync({ workspaceId: ws.id, name: 'Primeiros passos', description: 'Seu primeiro board!' });
          await createGroupMut.mutateAsync({ boardId: board.id, title: 'Tarefas', color: '#579BFC' });
          await createColMut.mutateAsync({
            boardId: board.id, title: 'Status', columnType: 'status',
            settings: { labels: { '1': { name: 'A Fazer', color: '#579BFC' }, '2': { name: 'Trabalhando', color: '#FDAB3D' }, '3': { name: 'Concluído', color: '#00C875', isDone: true } } }
          });
          await createColMut.mutateAsync({ boardId: board.id, title: 'Pessoa', columnType: 'people' });
          await createColMut.mutateAsync({ boardId: board.id, title: 'Data', columnType: 'date' });
          setActiveBoardId(board.id);
          onboardingDone.current = true;
        } catch (e) { console.error('Onboarding error (existing workspace, no boards):', e); }
      })();
    }
  }, [wsLoading, boardsLoading, user, dbWorkspaces.length, dbBoards.length]);

  // Sync workspace when board changes
  useEffect(() => {
    if (!activeBoardId) return;
    const board = dbBoards.find(b => b.id === activeBoardId);
    if (board && board.workspace_id !== activeWorkspaceId) {
      setActiveWorkspaceId(board.workspace_id);
    }
  }, [activeBoardId, dbBoards, activeWorkspaceId]);

  const workspaces = useMemo(() =>
    dbWorkspaces.map(ws => ({
      ...ws,
      boards: dbBoards.filter(b => b.workspace_id === ws.id),
    })),
    [dbWorkspaces, dbBoards]
  );

  const activeWorkspace = useMemo(() =>
    workspaces.find(ws => ws.id === activeWorkspaceId) || workspaces[0] || null,
    [workspaces, activeWorkspaceId]
  );

  const cvMap = useMemo(() => {
    const map: Record<string, Record<string, ColumnValue>> = {};
    for (const cv of dbColumnValues) {
      if (!map[cv.item_id]) map[cv.item_id] = {};
      map[cv.item_id][cv.column_id] = { value: cv.value };
    }
    return map;
  }, [dbColumnValues]);

  const visibleColumns = useMemo(() => {
    return dbColumns
      .filter(c => !hiddenColumns.includes(c.id))
      .map(c => ({
        id: c.id,
        boardId: c.board_id,
        title: c.title,
        type: c.column_type as any,
        width: c.width || 150,
        position: c.position,
        settings: (c.settings as any) || {},
      })) as Column[];
  }, [dbColumns, hiddenColumns]);

  const activeBoard = useMemo(() => {
    if (!activeBoardId) return null;
    const board = dbBoards.find(b => b.id === activeBoardId);
    if (!board) return null;

    const matchesSearch = (item: any) => {
      if (!searchQuery.trim()) return true;
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    };

    const matchesFilters = (item: any) => {
      if (advancedFilter.rules.length > 0) {
        return evaluateFilterGroup(advancedFilter, cvMap[item.id] || {}, visibleColumns);
      }
      return true;
    };

    const sortItems = (items: any[]) => {
      if (!sort) {
        // Ordenacao padrao: por posicao (drag & drop manual)
        return [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      }
      return [...items].sort((a, b) => {
        let aVal: any, bVal: any;
        if (sort.columnId === 'name') {
          aVal = a.name; bVal = b.name;
        } else {
          aVal = cvMap[a.id]?.[sort.columnId]?.value ?? '';
          bVal = cvMap[b.id]?.[sort.columnId]?.value ?? '';
        }
        const cmp = String(aVal).localeCompare(String(bVal));
        return sort.direction === 'asc' ? cmp : -cmp;
      });
    };

    const groups: Group[] = dbGroups.map(g => ({
      id: g.id,
      boardId: g.board_id,
      title: g.title,
      color: g.color || '#579BFC',
      isCollapsed: g.is_collapsed || false,
      position: g.position,
      items: sortItems(
        dbItems
          .filter(i => i.group_id === g.id)
          .filter(matchesSearch)
          .filter(matchesFilters)
          .map(i => ({
            id: i.id,
            boardId: i.board_id,
            groupId: i.group_id || '',
            name: i.name,
            position: i.position,
            columnValues: cvMap[i.id] || {},
            createdAt: i.created_at,
          }))
      ),
    }));

    return {
      id: board.id,
      workspaceId: board.workspace_id,
      name: board.name,
      description: board.description || undefined,
      groups,
      columns: visibleColumns,
    } as Board;
  }, [activeBoardId, dbBoards, dbGroups, dbItems, cvMap, visibleColumns, searchQuery, advancedFilter, sort]);

  const setActiveBoard = useCallback((board: Board | null) => {
    setActiveBoardId(board?.id ?? null);
    setSelectedItem(null);
    // Note: filter/view state is managed by TabBridge when tabs are in use.
    // resetAll() is no longer called here to preserve per-tab state.
  }, [setActiveBoardId, setSelectedItem]);

  const toggleGroupCollapse = useCallback((groupId: string) => {
    const group = dbGroups.find(g => g.id === groupId);
    if (group) {
      toggleGroupMut.mutate({ id: groupId, is_collapsed: !group.is_collapsed });
    }
  }, [dbGroups, toggleGroupMut]);

  const collapseAllGroups = useCallback((collapsed: boolean) => {
    if (!activeBoardId) return;
    collapseAllMut.mutate({ boardId: activeBoardId, collapsed });
  }, [activeBoardId, collapseAllMut]);

  const updateItemColumnValue = useCallback((itemId: string, columnId: string, value: ColumnValue) => {
    updateColVal.mutate({ itemId, columnId, value: value.value, text: value.text });
  }, [updateColVal]);

  const updateItemName = useCallback((itemId: string, name: string) => {
    updateItemMut.mutate({ id: itemId, name });
  }, [updateItemMut]);

  const addItemToGroup = useCallback((groupId: string, name: string) => {
    if (!activeBoardId || !name.trim()) return;
    createItemMut.mutate({ boardId: activeBoardId, groupId, name: name.trim() });
  }, [activeBoardId, createItemMut]);

  const users = useMemo(() =>
    dbProfiles.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      avatarUrl: p.avatar_url,
      role: 'member' as const,
    })),
    [dbProfiles]
  );

  const isFavorite = useCallback((boardId: string) => {
    return dbFavorites.some((f: any) => f.board_id === boardId);
  }, [dbFavorites]);

  const loading = wsLoading || boardsLoading || groupsLoading || colsLoading || itemsLoading;

  return (
    <BoardContext.Provider value={{
      workspaces, boards: dbBoards, activeBoard, setActiveBoard, activeWorkspace,
      users, groups: dbGroups as any, columns: dbColumns as any, items: dbItems,
      columnValues: dbColumnValues, toggleGroupCollapse, collapseAllGroups,
      updateItemColumnValue, updateItemName, addItemToGroup,
      loading, favorites: dbFavorites, isFavorite,
    }}>
      {children}
    </BoardContext.Provider>
  );
};

export default BoardContext;
