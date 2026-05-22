import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildItemsQuery, ITEMS_PAGE_SIZE } from '@/utils/filterToPostgrest';
import type { BoardSort } from '@/context/AppContext';
import { UndoRedoContext } from '@/context/UndoRedoContext';
import { executeAutomations } from './useAutomationEngine';
import type { PageTreeNode, SyncedBlock } from '@/types/page';

// ---- Profiles ----
export const useProfiles = () =>
  useQuery({
    queryKey: ['profiles'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, name, email, avatar_url');
      if (error) throw error;
      return data;
    },
  });

export const useProfile = (userId: string | undefined) =>
  useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, name, email, avatar_url, onboarding_completed, preferences').eq('id', userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

// ---- Workspaces ----
export const useWorkspaces = () =>
  useQuery({
    queryKey: ['workspaces'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('workspaces').select('id, name, icon, color, description, created_at').order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });

// ---- Boards ----
export const useBoards = (workspaceId?: string) =>
  useQuery({
    queryKey: ['boards', workspaceId],
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('boards').select('id, name, state, workspace_id, icon, color, folder_id, position, page_id, created_at, updated_at').eq('workspace_id', workspaceId!).eq('state', 'active').order('position').order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAllBoards = () =>
  useQuery({
    queryKey: ['all-boards'],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('boards').select('id, name, state, workspace_id, icon, color, folder_id, position, page_id, created_at, updated_at').eq('state', 'active').order('position').order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });

// ---- Pages ----
export const usePages = (workspaceId?: string) =>
  useQuery({
    queryKey: ['pages', workspaceId],
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('id, workspace_id, folder_id, title, state, icon, cover_url, position, parent_id, sort_order, created_by, created_at, updated_at')
        .eq('workspace_id', workspaceId!)
        .eq('state', 'active')
        .order('position')
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAllPages = () =>
  useQuery({
    queryKey: ['all-pages'],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('id, workspace_id, folder_id, title, state, icon, cover_url, position, parent_id, sort_order, created_by, created_at, updated_at')
        .eq('state', 'active')
        .order('position')
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });

/**
 * Query para uma page individual (rota /page/:pageId).
 * Retorna single (nao array). Consumidor pode cast content para PartialBlock[].
 */
export const usePage = (pageId?: string | null) =>
  useQuery({
    queryKey: ['page', pageId],
    enabled: !!pageId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('id, workspace_id, folder_id, title, content, state, icon, cover_url, position, parent_id, sort_order, created_by, created_at, updated_at')
        .eq('id', pageId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

/**
 * Retorna entries mesclados (boards + pages) ordenados por position.
 * Consumido pelo AppSidebar para listar tudo do workspace junto.
 */
export const useWorkspaceEntries = (workspaceId?: string) => {
  const boards = useBoards(workspaceId);
  const pages = usePages(workspaceId);
  const isLoading = boards.isLoading || pages.isLoading;
  const data: import('@/types/page').WorkspaceEntry[] = [
    ...(boards.data ?? []).map((b) => ({
      kind: 'board' as const,
      id: b.id,
      name: b.name,
      icon: b.icon,
      color: b.color,
      folder_id: b.folder_id,
      position: b.position ?? 0,
      workspace_id: b.workspace_id!,
      page_id: b.page_id ?? null,
    })),
    ...(pages.data ?? []).map((p) => ({
      kind: 'page' as const,
      id: p.id,
      title: p.title,
      icon: p.icon,
      folder_id: p.folder_id,
      position: p.position ?? 0,
      workspace_id: p.workspace_id!,
      parent_id: p.parent_id ?? null,
      sort_order: p.sort_order ?? 'a0',
    })),
  ].sort((a, b) => a.position - b.position);
  return { data, isLoading };
};

// ---- Pages Tree (Fase 02) ----

/**
 * Retorna filhos diretos de um no da arvore de pages (pages com parent_id = parentId).
 * Quando parentId e null, retorna pages raiz do workspace (parent_id IS NULL).
 *
 * Carrega `child_count` por agregacao em memoria (subpages + databases ancoradas),
 * permitindo renderizar chevron expand/collapse sem fetch redundante de filhos.
 *
 * Ordenacao por sort_order (lexorank ASC).
 *
 * Lazy: a query so executa quando `enabled = true`. O consumer (PageTreeItem) controla
 * isso via estado expandido pra evitar carregar a arvore inteira de uma vez.
 */
export const usePagesTree = (
  workspaceId: string | null | undefined,
  parentId: string | null,
  enabled: boolean = true,
) =>
  useQuery({
    queryKey: ['pages-tree', workspaceId, parentId],
    enabled: !!workspaceId && enabled,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<PageTreeNode[]> => {
      // Query principal: pages filhos diretos do parentId no workspace
      let q = supabase
        .from('pages')
        .select('id, workspace_id, parent_id, title, icon, sort_order')
        .eq('workspace_id', workspaceId!)
        .eq('state', 'active');
      q = parentId === null ? q.is('parent_id', null) : q.eq('parent_id', parentId);
      const { data: pages, error } = await q.order('sort_order');
      if (error) throw error;
      if (!pages || pages.length === 0) return [];

      const pageIds = pages.map((p) => p.id);

      // Subquery 1: subpages por parent_id (pra contar filhos pages)
      const { data: subpageRows } = await supabase
        .from('pages')
        .select('parent_id')
        .in('parent_id', pageIds)
        .eq('state', 'active');

      // Subquery 2: databases (boards com page_id) por page_id (pra contar filhos databases)
      const { data: databaseRows } = await supabase
        .from('boards')
        .select('page_id')
        .in('page_id', pageIds)
        .eq('state', 'active');

      // Agrega contagens em memoria (datasets pequenos por nivel)
      const childCount: Record<string, number> = {};
      for (const row of subpageRows ?? []) {
        const pid = (row as { parent_id: string | null }).parent_id;
        if (pid) childCount[pid] = (childCount[pid] ?? 0) + 1;
      }
      for (const row of databaseRows ?? []) {
        const pid = (row as { page_id: string | null }).page_id;
        if (pid) childCount[pid] = (childCount[pid] ?? 0) + 1;
      }

      return pages.map<PageTreeNode>((p) => ({
        id: p.id,
        workspace_id: p.workspace_id!,
        parent_id: p.parent_id ?? null,
        title: p.title,
        icon: p.icon,
        sort_order: p.sort_order ?? 'a0',
        child_count: childCount[p.id] ?? 0,
      }));
    },
  });

/**
 * Retorna boards que sao databases inline ancoradas em uma page (boards.page_id = pageId).
 * Usado pelo PageTreeItem pra listar databases como filhos da page no sidebar.
 *
 * Lazy: idem `usePagesTree`. Habilitado quando o no esta expandido.
 */
export const useDatabasesForPage = (
  pageId: string | null | undefined,
  enabled: boolean = true,
) =>
  useQuery({
    queryKey: ['databases-for-page', pageId],
    enabled: !!pageId && enabled,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('id, name, icon, color, page_id, workspace_id, position, created_at')
        .eq('page_id', pageId!)
        .eq('state', 'active')
        .order('position')
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });

// ---- Groups ----
export const useGroups = (boardId?: string | null) =>
  useQuery({
    queryKey: ['groups', boardId],
    enabled: !!boardId,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('id, board_id, title, color, position, is_collapsed').eq('board_id', boardId!).order('position');
      if (error) throw error;
      return data ?? [];
    },
  });

// ---- Columns ----
export const useColumns = (boardId?: string | null) =>
  useQuery({
    queryKey: ['columns', boardId],
    enabled: !!boardId,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.from('columns').select('id, board_id, column_type, title, settings, position, width, edit_permission').eq('board_id', boardId!).order('position');
      if (error) throw error;
      return data ?? [];
    },
  });

// ---- Items ----
export const useItems = (boardId?: string | null) =>
  useQuery({
    queryKey: ['items', boardId],
    enabled: !!boardId,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.from('items').select('id, name, board_id, group_id, position, state, parent_item_id, created_at, updated_at').eq('board_id', boardId!).is('parent_item_id', null).neq('state', 'deleted').order('position');
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSubitems = (parentItemId?: string | null) =>
  useQuery({
    queryKey: ['subitems', parentItemId],
    enabled: !!parentItemId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('items').select('id, name, board_id, group_id, position, state, parent_item_id, created_at, updated_at').eq('parent_item_id', parentItemId!).order('position');
      if (error) throw error;
      return data ?? [];
    },
  });

/**
 * useItemsInfinite — paginação server-side com React Query v5 useInfiniteQuery.
 * Carrega 100 itens por página com infinite scroll.
 * searchQuery e sort são aplicados no servidor; filtros EAV permanecem no cliente.
 */
export const useItemsInfinite = (
  boardId?: string | null,
  searchQuery?: string,
  sort?: BoardSort | null,
) =>
  useInfiniteQuery({
    queryKey: ['items-infinite', boardId, searchQuery, sort],
    enabled: !!boardId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const query = buildItemsQuery(boardId!, searchQuery ?? '', sort ?? null, pageParam as number);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === ITEMS_PAGE_SIZE ? allPages.length : undefined,
  });

/**
 * useGroupAggregations — query paralela para totais de grupo (COUNT e SUM/AVG numérico).
 * Roda em paralelo com a query paginada principal, não bloqueia renderização.
 * Suporta v1: COUNT (todos os tipos), SUM/AVG (colunas numéricas via column_values).
 */
export const useGroupAggregations = (boardId?: string | null, columnIds?: string[]) =>
  useQuery({
    queryKey: ['group-aggregations', boardId, columnIds],
    enabled: !!boardId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      // COUNT por grupo (todos os itens, ignorando paginação)
      const { data: items, error } = await supabase
        .from('items')
        .select('id, group_id')
        .eq('board_id', boardId!)
        .is('parent_item_id', null)
        .neq('state', 'deleted');
      if (error) throw error;

      const countByGroup: Record<string, number> = {};
      for (const item of items ?? []) {
        if (item.group_id) {
          countByGroup[item.group_id] = (countByGroup[item.group_id] ?? 0) + 1;
        }
      }

      return { countByGroup };
    },
  });

export const useAllSubitems = (boardId?: string | null) =>
  useQuery({
    queryKey: ['all-subitems', boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase.from('items').select('id, name, board_id, group_id, position, state, parent_item_id, created_at, updated_at').eq('board_id', boardId!).not('parent_item_id', 'is', null).order('position');
      if (error) throw error;
      return data ?? [];
    },
  });

/** Carrega um item completo (com columnValues computados) — usado para subitems no detail panel */
export const useItemFull = (itemId?: string | null) =>
  useQuery({
    queryKey: ['item-full', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const [{ data: item, error: e1 }, { data: cvs, error: e2 }] = await Promise.all([
        supabase.from('items').select('id, name, board_id, group_id, position, state, parent_item_id, created_at, updated_at').eq('id', itemId!).single(),
        supabase.from('column_values').select('id, item_id, column_id, value, text_representation').eq('item_id', itemId!),
      ]);
      if (e1 || e2 || !item) return null;
      const columnValues = (cvs ?? []).reduce((acc: Record<string, { value: any }>, cv: any) => {
        acc[cv.column_id] = { value: cv.value };
        return acc;
      }, {});
      return {
        id: item.id,
        boardId: item.board_id,
        groupId: item.group_id,
        name: item.name,
        position: item.position,
        columnValues,
        parent_item_id: item.parent_item_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    },
  });

/**
 * useAllItemsForMention - busca cross-board de items para inserir @mention em PageEditor.
 *
 * RLS do Supabase ja restringe a items que o usuario pode acessar (can_access_item via policies).
 * Retorna ate 20 resultados, prioridade pelos mais recentemente atualizados.
 *
 * @param query Texto digitado pelo usuario. Quando >= 2 chars aplica ilike no nome.
 *              Vazio retorna os 20 items mais recentes (lista padrao do picker).
 */
export const useAllItemsForMention = (query: string) =>
  useQuery({
    queryKey: ['all-items-for-mention', query.trim()],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const q = query.trim();
      let builder = supabase
        .from('items')
        .select('id, name, board_id, updated_at, boards!inner(name)')
        .neq('state', 'deleted')
        .is('parent_item_id', null)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (q.length >= 2) {
        builder = builder.ilike('name', `%${q}%`);
      }
      const { data, error } = await builder;
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id as string,
        name: row.name as string,
        board_id: row.board_id as string,
        board_name: (row.boards?.name as string) ?? '',
      }));
    },
  });

// ---- Column Values ----
export const useColumnValues = (boardId?: string | null) =>
  useQuery({
    queryKey: ['column_values', boardId],
    enabled: !!boardId,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      // Fetch only non-deleted items to avoid inflating the IN() clause
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id')
        .eq('board_id', boardId!)
        .neq('state', 'deleted');
      if (itemsError) throw itemsError;
      if (!items?.length) return [];

      // Chunk item IDs into batches of 100 to stay within PostgREST URL limits
      // (1355 UUIDs = ~50KB URL, which exceeds the ~8KB limit)
      const CHUNK_SIZE = 100;
      const itemIds = items.map(i => i.id);
      const chunks: string[][] = [];
      for (let i = 0; i < itemIds.length; i += CHUNK_SIZE) {
        chunks.push(itemIds.slice(i, i + CHUNK_SIZE));
      }

      const results = await Promise.all(
        chunks.map(chunk =>
          supabase.from('column_values').select('id, item_id, column_id, value, text_representation').in('item_id', chunk)
        )
      );

      for (const { error } of results) {
        if (error) throw error;
      }

      return results.flatMap(r => r.data ?? []);
    },
  });

// ---- Batch Column Value Update ----
export interface BatchColumnUpdate {
  itemId: string;
  columnId: string;
  value: unknown;
  text?: string;
  oldValue?: unknown;
}

export const useBatchUpdateColumnValue = () => {
  const qc = useQueryClient();
  const undoRedo = useContext(UndoRedoContext);

  return useMutation({
    mutationFn: async (updates: BatchColumnUpdate[]) => {
      const results = await Promise.all(
        updates.map(async ({ itemId, columnId, value, text }) => {
          const { error } = await supabase.from('column_values').upsert(
            { item_id: itemId, column_id: columnId, value, text_representation: text },
            { onConflict: 'item_id,column_id' }
          );
          return { itemId, error };
        })
      );
      const failed = results.filter(r => r.error).length;
      if (failed > 0) {
        console.error('Batch update errors:', results.filter(r => r.error).map(r => ({ itemId: r.itemId, error: r.error })));
      }
      return { total: updates.length, failed };
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ['column_values'] });
      const previousData = qc.getQueriesData({ queryKey: ['column_values'] });

      // Aplicar optimistic update: atualizar existentes + adicionar novos
      qc.setQueriesData({ queryKey: ['column_values'] }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        const map = new Map(updates.map(u => [`${u.itemId}|${u.columnId}`, u]));
        const updated = new Set<string>();
        const result = old.map((cv: any) => {
          const key = `${cv.item_id}|${cv.column_id}`;
          const u = map.get(key);
          if (u) { updated.add(key); return { ...cv, value: u.value, text_representation: u.text }; }
          return cv;
        });
        // Adicionar entries que não existiam (subitems sem valor prévio)
        for (const u of updates) {
          const key = `${u.itemId}|${u.columnId}`;
          if (!updated.has(key)) {
            result.push({ id: `temp-${key}`, item_id: u.itemId, column_id: u.columnId, value: u.value, text_representation: u.text });
          }
        }
        return result;
      });

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: ({ total, failed }, updates) => {
      // Registrar uma única ação de undo para todo o batch
      if (undoRedo && updates.length > 0) {
        undoRedo.pushAction({
          type: 'batch_value_change',
          entityId: updates[0].itemId,
          entityType: 'column_value',
          oldValue: null,
          newValue: null,
          batchChanges: updates.map(u => ({
            itemId: u.itemId,
            columnId: u.columnId,
            oldValue: u.oldValue ?? null,
            newValue: u.value,
          })),
        });
      }

      if (failed > 0) {
        const succeeded = total - failed;
        if (succeeded > 0) {
          return { partial: true, succeeded, failed };
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['column_values'] });
    },
  });
};

// ---- Updates ----
export const useUpdates = (itemId?: string | null) =>
  useQuery({
    queryKey: ['updates', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase.from('updates').select('id, item_id, author_id, body, parent_update_id, is_pinned, created_at, updated_at').eq('item_id', itemId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

// ---- Mutations ----
export const useUpdateColumnValue = () => {
  const qc = useQueryClient();
  const undoRedo = useContext(UndoRedoContext);
  return useMutation({
    mutationFn: async ({
      itemId, columnId, value, text, boardId, oldValue, triggeredByAutomation,
      columnType, itemName, workspaceId,
    }: {
      itemId: string;
      columnId: string;
      value: unknown;
      text?: string;
      boardId?: string;
      oldValue?: unknown;
      triggeredByAutomation?: boolean;
      columnType?: string;
      itemName?: string;
      workspaceId?: string;
    }) => {
      const { error } = await supabase.from('column_values').upsert(
        { item_id: itemId, column_id: columnId, value, text_representation: text },
        { onConflict: 'item_id,column_id' }
      );
      if (error) throw error;
      return { itemId, columnId, value, boardId, oldValue, triggeredByAutomation, columnType, itemName, workspaceId };
    },
    onMutate: async ({ itemId, columnId, value, text }) => {
      await qc.cancelQueries({ queryKey: ['column_values'] });
      const queries = qc.getQueriesData({ queryKey: ['column_values'] });
      const previousData: any[] = [];
      queries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          previousData.push({ queryKey, data });
          const updated = data.map((cv: any) =>
            cv.item_id === itemId && cv.column_id === columnId
              ? { ...cv, value, text_representation: text }
              : cv
          );
          if (!data.some((cv: any) => cv.item_id === itemId && cv.column_id === columnId)) {
            updated.push({ item_id: itemId, column_id: columnId, value, text_representation: text, id: 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) });
          }
          qc.setQueryData(queryKey, updated);
        }
      });
      return { previousData };
    },
    onError: (_err, _vars, context: any) => {
      context?.previousData?.forEach(({ queryKey, data }: any) => {
        qc.setQueryData(queryKey, data);
      });
      window.dispatchEvent(new Event('mutation-error'));
    },
    onSuccess: (result) => {
      if (!result?.boardId) return;
      const { itemId, columnId, value, boardId, oldValue, triggeredByAutomation, columnType, itemName } = result;

      // Fire-and-forget: registro no activity_log nao bloqueia a mutation
      supabase.auth.getUser().then(({ data: userData }) => {
        const userId = userData.user?.id;
        if (!userId) return;
        supabase.from('activity_log').insert({
          board_id: boardId,
          user_id: userId,
          action: 'column_value_changed',
          entity_type: 'column_value',
          entity_id: columnId,
          item_id: itemId,
          old_value: oldValue ?? null,
          new_value: value ?? null,
          metadata: {
            triggered_by: triggeredByAutomation ? 'automation' : 'user',
          },
        }).then(() => {
          qc.invalidateQueries({ queryKey: ['activity_log_item', itemId] });
          qc.invalidateQueries({ queryKey: ['activity_log', boardId] });
        }).catch((err) => {
          console.error('Falha ao registrar atividade (column_value_changed):', err);
        });
      }).catch((err) => {
        console.error('Falha ao obter usuario para activity_log:', err);
      });

      // Registrar no undo stack (fire-and-forget, nao bloqueia — apenas operacoes de usuario)
      if (undoRedo && !triggeredByAutomation && itemId && columnId !== undefined) {
        undoRedo.pushAction({
          type: 'value_change',
          entityId: itemId,
          entityType: 'column_value',
          oldValue: oldValue ?? null,
          newValue: value ?? null,
          metadata: { columnId },
        });
      }

      // Fire-and-forget: engine de automacoes — dispara triggers column_change / status_change
      // CRITICO: Nao dispara se a mutation foi originada por uma automacao (anti-loop)
      if (!triggeredByAutomation && boardId && itemId && columnId) {
        const triggerType = columnType === 'status' ? 'status_change' : 'column_change';
        executeAutomations({
          type: triggerType,
          boardId,
          itemId,
          columnId,
          oldValue,
          newValue: value,
        }).catch((err) => {
          console.error('[AutomationEngine] Uncaught error in executeAutomations:', err);
        });
      }

      // Fire-and-forget: notificacao Slack para mudanca de status (AC 2, 6)
      // CRITICO: Nao bloqueia a mutation principal. Nao dispara se originado por automacao.
      if (columnType === 'status' && !triggeredByAutomation && boardId) {
        const oldStatusStr = typeof oldValue === 'string' ? oldValue : (oldValue ? String(oldValue) : '');
        const newStatusStr = typeof value === 'string' ? value : (value ? String(value) : '');
        supabase.functions.invoke('send-slack-notification', {
          body: {
            boardId,
            itemId,
            itemName: itemName ?? itemId,
            columnId,
            oldStatus: oldStatusStr,
            newStatus: newStatusStr,
            triggeredByAutomation: false,
          },
        }).catch((err: unknown) => {
          // Falha na integracao NAO bloqueia o board — apenas log no console
          console.error('Integracao Slack: falha ao enviar notificacao (nao bloqueia):', err);
        });
      }
    },
    onSettled: (_result, _error, variables) => {
      qc.invalidateQueries({ queryKey: ['column_values'] });
      // Garante que o painel de detalhes de subitems reflete os dados atualizados
      qc.invalidateQueries({ queryKey: ['item-full', variables.itemId] });
    },
  });
};

// Cached user session — avoids HTTP roundtrip on every mutation
let _cachedUserId: string | null = null;
async function getCachedUserId(): Promise<string | null> {
  if (_cachedUserId) return _cachedUserId;
  const { data } = await supabase.auth.getUser();
  _cachedUserId = data.user?.id ?? null;
  return _cachedUserId;
}
// Clear cache on auth state change
supabase.auth.onAuthStateChange(() => { _cachedUserId = null; });

export const useCreateItem = () => {
  const qc = useQueryClient();
  const undoRedo = useContext(UndoRedoContext);
  return useMutation({
    mutationFn: async ({ boardId, groupId, name, position }: { boardId: string; groupId: string; name: string; position?: number }) => {
      const userId = await getCachedUserId();
      const { data, error } = await supabase.from('items').insert({
        board_id: boardId,
        group_id: groupId,
        name,
        position: position ?? Date.now(),
        created_by: userId,
      }).select().single();
      if (error) throw error;
      return data;
    },
    // Optimistic update: item appears instantly in the table
    onMutate: async ({ boardId, groupId, name, position }) => {
      await qc.cancelQueries({ queryKey: ['items', boardId] });
      const prev = qc.getQueryData<any[]>(['items', boardId]);
      const optimisticItem = {
        id: `temp-${Date.now()}`,
        board_id: boardId,
        group_id: groupId,
        name,
        position: position ?? Date.now(),
        state: 'active',
        parent_item_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (prev) {
        qc.setQueryData(['items', boardId], [...prev, optimisticItem]);
      }
      return { prev, boardId };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.prev) {
        qc.setQueryData(['items', context.boardId], context.prev);
      }
    },
    onSuccess: (data, _vars, context: any) => {
      // Replace optimistic item with real data
      qc.invalidateQueries({ queryKey: ['items', context?.boardId] });
      if (!data?.id || !data?.board_id) return;

      if (undoRedo) {
        undoRedo.pushAction({
          type: 'item_create',
          entityId: data.id,
          entityType: 'item',
          oldValue: null,
          newValue: { name: data.name, groupId: data.group_id, boardId: data.board_id },
        });
      }

      // Fire-and-forget: automations + activity log (non-blocking)
      executeAutomations({
        type: 'item_created',
        boardId: data.board_id,
        itemId: data.id,
        groupId: data.group_id,
      }).catch(() => {});

      getCachedUserId().then(userId => {
        if (!userId) return;
        supabase.from('activity_log' as any).insert({
          board_id: data.board_id,
          user_id: userId,
          action: 'item_created',
          entity_type: 'item',
          entity_id: data.id,
          item_id: data.id,
          new_value: { name: data.name },
          metadata: { triggered_by: 'user', item_name: data.name },
        }).then(() => {
          qc.invalidateQueries({ queryKey: ['activity_log', data.board_id] });
        });
      }).catch(() => {});
    },
  });
};

export const useUpdateItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; group_id?: string; position?: number }) => {
      const { error } = await supabase.from('items').update(updates).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ['items'] });
      const queries = qc.getQueriesData({ queryKey: ['items'] });
      const previousData: any[] = [];
      queries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          previousData.push({ queryKey, data });
          const updated = data.map((item: any) =>
            item.id === id ? { ...item, ...updates } : item
          );
          qc.setQueryData(queryKey, updated);
        }
      });
      return { previousData };
    },
    onError: (_err, _vars, context: any) => {
      context?.previousData?.forEach(({ queryKey, data }: any) => {
        qc.setQueryData(queryKey, data);
      });
      window.dispatchEvent(new Event('mutation-error'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

export const useToggleGroupCollapse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_collapsed }: { id: string; is_collapsed: boolean }) => {
      const { error } = await supabase.from('groups').update({ is_collapsed }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useCollapseAllGroups = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, collapsed }: { boardId: string; collapsed: boolean }) => {
      const { error } = await supabase.from('groups').update({ is_collapsed: collapsed }).eq('board_id', boardId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useCreateUpdate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, body, parentUpdateId }: { itemId: string; body: string; parentUpdateId?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const insert: any = {
        item_id: itemId,
        author_id: user.user?.id,
        body,
      };
      if (parentUpdateId) {
        insert.parent_update_id = parentUpdateId;
      }
      const { data, error } = await supabase.from('updates').insert(insert).select('id').single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['updates', vars.itemId] });
    },
  });
};

export const useToggleUpdatePin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ updateId, isPinned }: { updateId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('updates')
        .update({ is_pinned: isPinned })
        .eq('id', updateId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['updates'] });
    },
  });
};

export const useEditUpdate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ updateId, body, itemId }: { updateId: string; body: string; itemId: string }) => {
      const { error } = await supabase
        .from('updates')
        .update({ body, updated_at: new Date().toISOString() })
        .eq('id', updateId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['updates', vars.itemId] });
    },
  });
};

export const useDeleteUpdate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ updateId, itemId }: { updateId: string; itemId: string }) => {
      const { error } = await supabase
        .from('updates')
        .delete()
        .eq('id', updateId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['updates', vars.itemId] });
    },
  });
};

export const useDuplicateUpdate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ update }: { update: { item_id: string; body: string } }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('updates').insert({
        item_id: update.item_id,
        body: update.body,
        author_id: userData.user?.id,
        parent_update_id: null,
        is_pinned: false,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['updates', vars.update.item_id] });
    },
  });
};

// ---- Synced Blocks (Fase 02-10) ----

/**
 * Query individual de synced_block.
 *
 * `staleTime: 0` garante refetch imediato apos invalidacao via realtime
 * (edicao em outra page reflete neste editor sem cache atrasado).
 *
 * RLS via `is_workspace_member` (migration 20260523100000):
 * usuario fora do workspace recebe nenhum row -> retornamos null pra que
 * o componente renderize placeholder "Bloco nao acessivel" em vez de erro.
 *
 * `maybeSingle()` ja diferencia "sem row" (ok, retorna null) de "erro real"
 * (lanca; mas como RLS apenas filtra rows, o caminho normal e null).
 */
export const useSyncedBlock = (id: string | null | undefined) =>
  useQuery({
    queryKey: ['synced-block', id],
    enabled: !!id,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('synced_blocks')
        .select('id, workspace_id, content, created_by, created_at, updated_at')
        .eq('id', id!)
        .maybeSingle();
      if (error) {
        // RLS apenas filtra; erro aqui significa problema real (rede/permissao).
        // Retornamos null pra UI nao quebrar e usuario ver placeholder amigavel.
        console.error('useSyncedBlock erro:', error);
        return null;
      }
      return (data as unknown as SyncedBlock | null) ?? null;
    },
  });

/**
 * Lista synced_blocks de um workspace pro picker dialog.
 *
 * `enabled` permite suspender a query enquanto o dialog esta fechado
 * (evita fetch desnecessario na montagem do PageEditor).
 *
 * Ordenado por `updated_at desc` pra mostrar mais recentes primeiro,
 * facilitando re-uso de blocos sincronizados em uso ativo.
 */
export const useSyncedBlocksByWorkspace = (
  workspaceId: string | null | undefined,
  enabled: boolean = true,
) =>
  useQuery({
    queryKey: ['synced-blocks-workspace', workspaceId],
    enabled: !!workspaceId && enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('synced_blocks')
        .select('id, workspace_id, content, created_at, updated_at')
        .eq('workspace_id', workspaceId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<
        Pick<SyncedBlock, 'id' | 'workspace_id' | 'content' | 'created_at' | 'updated_at'>
      >;
    },
  });
