import { supabase } from '@/integrations/supabase/client';
import type { BoardSort } from '@/context/AppContext';
import type { FilterGroup } from '@/components/board/FilterBuilder';

const PAGE_SIZE = 100;

/**
 * Constrói uma query PostgREST paginada para buscar itens de um board.
 *
 * Filtros aplicados no servidor:
 *   - board_id (sempre)
 *   - searchQuery: ilike no campo name (items.name)
 *   - sort: order() na coluna indicada (apenas colunas nativas de items: name, position)
 *   - range: paginação de PAGE_SIZE itens por página
 *
 * Filtros EAV (column_values) são computacionalmente complexos em PostgREST puro
 * e permanecem no cliente via BoardContext para v1.
 * Uma RPC dedicada será adicionada em v2 (Task future).
 */
export function buildItemsQuery(
  boardId: string,
  searchQuery: string,
  sort: BoardSort | null,
  page: number,
) {
  let query = supabase
    .from('items')
    .select('*', { count: 'exact' })
    .eq('board_id', boardId)
    .is('parent_item_id', null)
    .neq('state', 'deleted');

  // Server-side name search
  if (searchQuery.trim()) {
    query = query.ilike('name', `%${searchQuery.trim()}%`);
  }

  // Server-side sort (only for native item columns in v1)
  if (sort && sort.columnId === 'name') {
    query = query.order('name', { ascending: sort.direction === 'asc' });
  } else {
    query = query.order('position', { ascending: true });
  }

  // Pagination
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  return query;
}

/** Tamanho de página padrão para paginação */
export const ITEMS_PAGE_SIZE = PAGE_SIZE;
