import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DependencyType = 'blocks' | 'depends_on' | 'related' | 'blocked_by';

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export interface ItemDependency {
  id: string;
  source_item_id: string;
  target_item_id: string;
  type: string;
  created_at: string;
}

export interface DependencyWithItem extends ItemDependency {
  item_name: string;
  item_id: string;
  direction: 'source' | 'target';
}

/**
 * Circular dependency detection using BFS.
 * Returns true if adding a dependency from `fromItemId` → `toItemId` would create a cycle.
 */
function checkCircularDependency(
  fromItemId: string,
  toItemId: string,
  existingDeps: ItemDependency[]
): boolean {
  // If they are the same item, it's circular
  if (fromItemId === toItemId) return true;

  // BFS: starting from toItemId, follow source→target edges to see if we reach fromItemId
  const visited = new Set<string>();
  const queue: string[] = [toItemId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === fromItemId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    // Follow all outgoing dependency edges from current
    const outgoing = existingDeps.filter(
      d =>
        d.source_item_id === current &&
        (d.type === 'blocks' || d.type === 'depends_on')
    );
    queue.push(...outgoing.map(d => d.target_item_id));
  }

  return false;
}

export const useDependencies = (itemId: string | null | undefined) =>
  useQuery({
    queryKey: ['item_dependencies', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      // Fetch dependencies where this item is the source
      const { data: asSource, error: err1 } = await supabase
        .from('item_dependencies')
        .select('*')
        .eq('source_item_id', itemId!);
      if (err1) throw err1;

      // Fetch dependencies where this item is the target
      const { data: asTarget, error: err2 } = await supabase
        .from('item_dependencies')
        .select('*')
        .eq('target_item_id', itemId!);
      if (err2) throw err2;

      // Collect all related item IDs to fetch their names
      const relatedIds = new Set<string>();
      (asSource ?? []).forEach(d => relatedIds.add(d.target_item_id));
      (asTarget ?? []).forEach(d => relatedIds.add(d.source_item_id));

      let itemNames: Record<string, string> = {};
      if (relatedIds.size > 0) {
        const { data: items } = await supabase
          .from('items')
          .select('id, name')
          .in('id', Array.from(relatedIds));
        if (items) {
          itemNames = Object.fromEntries(items.map(i => [i.id, i.name]));
        }
      }

      // Build categorized dependencies
      const blocking: DependencyWithItem[] = [];
      const blockedBy: DependencyWithItem[] = [];
      const related: DependencyWithItem[] = [];

      // Source entries: this item blocks or depends_on others, or is related
      for (const dep of (asSource ?? [])) {
        const entry: DependencyWithItem = {
          ...dep,
          item_name: itemNames[dep.target_item_id] || 'Item desconhecido',
          item_id: dep.target_item_id,
          direction: 'source',
        };
        if (dep.type === 'blocks') {
          blocking.push(entry);
        } else if (dep.type === 'depends_on') {
          // "This item depends on target" means target blocks this item
          blockedBy.push(entry);
        } else if (dep.type === 'related') {
          related.push(entry);
        }
      }

      // Target entries: other items block or depend_on this item, or are related
      for (const dep of (asTarget ?? [])) {
        const entry: DependencyWithItem = {
          ...dep,
          item_name: itemNames[dep.source_item_id] || 'Item desconhecido',
          item_id: dep.source_item_id,
          direction: 'target',
        };
        if (dep.type === 'blocks') {
          // Another item blocks this item
          blockedBy.push(entry);
        } else if (dep.type === 'depends_on') {
          // Another item depends_on this item → this item is blocking that one
          blocking.push(entry);
        } else if (dep.type === 'related') {
          related.push(entry);
        }
      }

      return { blocking, blockedBy, related, all: [...(asSource ?? []), ...(asTarget ?? [])] };
    },
  });

export const useBoardDependencies = (boardId: string | null | undefined) =>
  useQuery({
    queryKey: ['board_dependencies', boardId],
    enabled: !!boardId,
    queryFn: async () => {
      // Get all items in the board
      const { data: items, error: itemsErr } = await supabase
        .from('items')
        .select('id')
        .eq('board_id', boardId!);
      if (itemsErr) throw itemsErr;
      if (!items?.length) return [];

      const itemIds = items.map(i => i.id);

      // Chunk IDs to avoid URL length limits (each UUID = 36 chars; 50 per chunk is safe)
      const chunks = chunkArray(itemIds, 50);
      const results = await Promise.all(
        chunks.map(chunk =>
          supabase
            .from('item_dependencies')
            .select('*')
            .or(`source_item_id.in.(${chunk.join(',')}),target_item_id.in.(${chunk.join(',')})`)
        )
      );

      const allDeps: ItemDependency[] = [];
      for (const result of results) {
        if (result.error) throw result.error;
        allDeps.push(...(result.data ?? []));
      }

      // Deduplicate by id (a dep can appear in multiple chunks if both items are in the board)
      const seen = new Set<string>();
      return allDeps.filter(d => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      });
    },
  });

/**
 * Hook to get all dependencies for a list of item IDs (batch query to avoid N+1).
 * Returns raw ItemDependency rows where source_item_id is in the provided list.
 */
export const useItemsDependencies = (itemIds: string[]) =>
  useQuery({
    queryKey: ['items_dependencies_batch', itemIds],
    enabled: itemIds.length > 0,
    queryFn: async () => {
      if (itemIds.length === 0) return [];
      const { data, error } = await supabase
        .from('item_dependencies')
        .select('*')
        .in('source_item_id', itemIds);
      if (error) throw error;
      return (data ?? []) as ItemDependency[];
    },
  });

export const useCreateDependency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sourceItemId,
      targetItemId,
      type,
    }: {
      sourceItemId: string;
      targetItemId: string;
      type: DependencyType;
    }) => {
      // Only check circular dependencies for directional types
      if (type === 'blocks' || type === 'depends_on') {
        // Fetch all existing dependencies for circular check
        const { data: allDeps, error: fetchErr } = await supabase
          .from('item_dependencies')
          .select('*');
        if (fetchErr) throw fetchErr;

        const existingDeps = (allDeps ?? []) as ItemDependency[];
        const isCircular = checkCircularDependency(sourceItemId, targetItemId, existingDeps);

        if (isCircular) {
          throw new Error(
            'Dependencia circular detectada — nao e possivel criar esta relacao'
          );
        }
      }

      // Map 'blocked_by' UI type to actual DB storage (source blocks target)
      const dbType = type === 'blocked_by' ? 'blocks' : type;

      const { data, error } = await supabase
        .from('item_dependencies')
        .insert({
          source_item_id: sourceItemId,
          target_item_id: targetItemId,
          type: dbType,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item_dependencies'] });
      qc.invalidateQueries({ queryKey: ['board_dependencies'] });
      qc.invalidateQueries({ queryKey: ['items_dependencies_batch'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao adicionar dependencia');
    },
  });
};

export const useDeleteDependency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('item_dependencies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item_dependencies'] });
      qc.invalidateQueries({ queryKey: ['board_dependencies'] });
      qc.invalidateQueries({ queryKey: ['items_dependencies_batch'] });
    },
  });
};
