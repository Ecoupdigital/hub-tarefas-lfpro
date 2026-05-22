import React, { useMemo } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Layout } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MAX_ITEMS = 20;
const MAX_COLUMNS = 4;

interface EmbedColumn {
  id: string;
  title: string;
  type: string;
  settings: unknown;
}

interface EmbedItem {
  id: string;
  name: string;
  group_id: string | null;
}

interface EmbedGroup {
  id: string;
  title: string;
  color: string | null;
}

interface EmbedColumnValue {
  item_id: string;
  column_id: string;
  value: unknown;
}

interface EmbedData {
  id: string;
  name: string;
  totalItems: number;
  totalColumns: number;
  items: EmbedItem[];
  columns: EmbedColumn[];
  groups: EmbedGroup[];
  values: EmbedColumnValue[];
}

/**
 * Carrega snapshot read-only de um board para o bloco embed.
 *
 * Estrategia: 1 query por entidade (board, columns, groups, items, values) com
 * limites severos (20 items, 4 colunas) para nao puxar boards inteiros.
 * RLS do Supabase filtra acesso; se board nao for visivel queryFn retorna null
 * e o componente mostra estado "sem acesso".
 */
function useEmbedBoardData(boardId: string) {
  return useQuery<EmbedData | null>({
    queryKey: ['embed-board-data', boardId],
    enabled: !!boardId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: board, error: boardErr } = await supabase
        .from('boards')
        .select('id, name, state')
        .eq('id', boardId)
        .maybeSingle();

      if (boardErr || !board || board.state !== 'active') return null;

      // Total de items do board (para mostrar "X items, mostrando 20")
      const { count: totalItems } = await supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('board_id', boardId)
        .is('parent_item_id', null)
        .neq('state', 'deleted');

      // Colunas do board (todas, vamos cortar pras primeiras MAX_COLUMNS)
      const { data: columnsRaw } = await supabase
        .from('columns')
        .select('id, title, column_type, settings, position')
        .eq('board_id', boardId)
        .order('position');

      const allColumns = (columnsRaw ?? []) as Array<{
        id: string;
        title: string;
        column_type: string;
        settings: unknown;
        position: number | null;
      }>;
      const columns: EmbedColumn[] = allColumns
        .slice(0, MAX_COLUMNS)
        .map((c) => ({
          id: c.id,
          title: c.title,
          type: c.column_type,
          settings: c.settings,
        }));

      // Groups do board
      const { data: groupsRaw } = await supabase
        .from('groups')
        .select('id, title, color, position')
        .eq('board_id', boardId)
        .order('position');

      const groups: EmbedGroup[] = (groupsRaw ?? []).map((g) => ({
        id: g.id as string,
        title: (g.title as string) ?? '',
        color: (g.color as string | null) ?? null,
      }));

      // Items (top MAX_ITEMS, somente top-level)
      const { data: itemsRaw } = await supabase
        .from('items')
        .select('id, name, group_id, position')
        .eq('board_id', boardId)
        .is('parent_item_id', null)
        .neq('state', 'deleted')
        .order('position')
        .limit(MAX_ITEMS);

      const items: EmbedItem[] = (itemsRaw ?? []).map((i) => ({
        id: i.id as string,
        name: (i.name as string) ?? '',
        group_id: (i.group_id as string | null) ?? null,
      }));

      // Column values so para os items + colunas que vamos exibir
      let values: EmbedColumnValue[] = [];
      if (items.length > 0 && columns.length > 0) {
        const itemIds = items.map((i) => i.id);
        const columnIds = columns.map((c) => c.id);
        const { data: valuesRaw } = await supabase
          .from('column_values')
          .select('item_id, column_id, value')
          .in('item_id', itemIds)
          .in('column_id', columnIds);
        values = (valuesRaw ?? []).map((v) => ({
          item_id: v.item_id as string,
          column_id: v.column_id as string,
          value: v.value,
        }));
      }

      return {
        id: board.id as string,
        name: board.name as string,
        totalItems: totalItems ?? items.length,
        totalColumns: allColumns.length,
        items,
        columns,
        groups,
        values,
      };
    },
  });
}

/**
 * Renderiza o valor de uma celula no embed (read-only, simplificado).
 * NAO interativo - apenas exibicao textual/visual minima.
 */
function CellRender({ column, value }: { column: EmbedColumn; value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground/60">-</span>;
  }

  switch (column.type) {
    case 'status':
    case 'dropdown': {
      const key = typeof value === 'string' ? value : null;
      const labels =
        (column.settings as { labels?: Record<string, { name: string; color: string }> })?.labels ??
        {};
      if (key && labels[key]) {
        return (
          <span
            className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: `${labels[key].color}22`,
              color: labels[key].color,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: labels[key].color }}
            />
            {labels[key].name}
          </span>
        );
      }
      return <span className="text-xs">{String(value)}</span>;
    }

    case 'date': {
      const dateStr = typeof value === 'string' ? value : null;
      if (!dateStr) return <span className="text-muted-foreground/60">-</span>;
      try {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return <span>{dateStr}</span>;
        return <span className="text-xs">{format(d, 'dd MMM', { locale: ptBR })}</span>;
      } catch {
        return <span>{dateStr}</span>;
      }
    }

    case 'people': {
      // value pode ser array de user ids ou objeto; mostramos contagem
      if (Array.isArray(value)) {
        if (value.length === 0) return <span className="text-muted-foreground/60">-</span>;
        return (
          <span className="text-xs text-muted-foreground">
            {value.length} pessoa{value.length === 1 ? '' : 's'}
          </span>
        );
      }
      return <span className="text-xs text-muted-foreground">1 pessoa</span>;
    }

    case 'checkbox': {
      const checked = value === true || value === 'true';
      return (
        <span className="text-xs">
          {checked ? (
            <span className="text-emerald-600 dark:text-emerald-400">Sim</span>
          ) : (
            <span className="text-muted-foreground">Nao</span>
          )}
        </span>
      );
    }

    case 'number':
    case 'rating':
    case 'progress':
    case 'auto_number': {
      const n = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(n)) return <span className="text-muted-foreground/60">-</span>;
      return <span className="text-xs tabular-nums">{n}</span>;
    }

    case 'tags': {
      if (Array.isArray(value)) {
        return <span className="text-xs text-muted-foreground">{value.length} tag(s)</span>;
      }
      return <span className="text-xs">{String(value)}</span>;
    }

    case 'link': {
      const link =
        typeof value === 'object' && value !== null
          ? ((value as { url?: string }).url ?? '')
          : String(value);
      if (!link) return <span className="text-muted-foreground/60">-</span>;
      return (
        <span className="text-xs text-primary truncate max-w-[140px] inline-block align-middle">
          {link}
        </span>
      );
    }

    default: {
      const str =
        typeof value === 'string'
          ? value
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
      return (
        <span className="text-xs truncate max-w-[160px] inline-block align-middle">{str}</span>
      );
    }
  }
}

/**
 * View principal do embed: cabecalho (board nome + meta + CTA) +
 * mini-tabela agrupada por grupo do board (primeiras MAX_COLUMNS colunas).
 *
 * `contentEditable={false}` no wrapper externo impede que o ProseMirror
 * trate texto interno como conteudo do documento.
 */
const EmbedBoardView: React.FC<{ boardId: string }> = ({ boardId }) => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useEmbedBoardData(boardId);

  // Indexa values por item para lookup O(1) no render
  const valuesByItem = useMemo(() => {
    const map = new Map<string, Map<string, unknown>>();
    if (!data) return map;
    for (const v of data.values) {
      if (!map.has(v.item_id)) map.set(v.item_id, new Map());
      map.get(v.item_id)!.set(v.column_id, v.value);
    }
    return map;
  }, [data]);

  // Agrupa items por group_id na ordem dos groups; items sem group ficam num "Sem grupo"
  const itemsByGroup = useMemo(() => {
    if (!data) return [] as Array<{ group: EmbedGroup | null; items: EmbedItem[] }>;
    const buckets = new Map<string, EmbedItem[]>();
    const ungrouped: EmbedItem[] = [];
    for (const it of data.items) {
      if (!it.group_id) {
        ungrouped.push(it);
        continue;
      }
      if (!buckets.has(it.group_id)) buckets.set(it.group_id, []);
      buckets.get(it.group_id)!.push(it);
    }
    const result: Array<{ group: EmbedGroup | null; items: EmbedItem[] }> = [];
    for (const g of data.groups) {
      const list = buckets.get(g.id);
      if (list && list.length > 0) result.push({ group: g, items: list });
    }
    if (ungrouped.length > 0) result.push({ group: null, items: ungrouped });
    return result;
  }, [data]);

  if (!boardId) {
    return (
      <div
        className="my-3 p-4 border border-border rounded-lg bg-muted/30"
        contentEditable={false}
      >
        <p className="text-sm text-muted-foreground">Embed sem board selecionado.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="my-3 p-4 border border-border rounded-lg bg-muted/30"
        contentEditable={false}
      >
        <p className="text-sm text-muted-foreground">Carregando board embedado...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        className="my-3 p-4 border border-destructive/30 rounded-lg bg-destructive/5"
        contentEditable={false}
      >
        <p className="text-sm text-destructive">
          Sem acesso a este board ou board nao encontrado.
        </p>
      </div>
    );
  }

  const hiddenItems = Math.max(0, data.totalItems - data.items.length);
  const hiddenColumns = Math.max(0, data.totalColumns - data.columns.length);

  return (
    <div
      className="my-3 border border-border rounded-lg overflow-hidden bg-card not-prose"
      contentEditable={false}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Layout className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <button
            type="button"
            onClick={() => navigate(`/board/${data.id}`)}
            className="text-sm font-medium hover:underline truncate text-foreground"
          >
            {data.name}
          </button>
          <span className="text-xs text-muted-foreground shrink-0">
            {data.totalItems} item{data.totalItems === 1 ? '' : 's'} · {data.totalColumns} coluna
            {data.totalColumns === 1 ? '' : 's'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/board/${data.id}`)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0"
        >
          Abrir board <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Tabela */}
      {data.items.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground text-center">
          Este board nao tem items.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-[40%]">
                  Item
                </th>
                {data.columns.map((col) => (
                  <th
                    key={col.id}
                    className="text-left px-3 py-2 text-xs font-medium text-muted-foreground"
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itemsByGroup.map(({ group, items }) => (
                <React.Fragment key={group?.id ?? '__ungrouped'}>
                  <tr className="border-b border-border/60">
                    <td
                      colSpan={1 + data.columns.length}
                      className="px-3 py-1.5 bg-muted/5"
                    >
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        {group?.color && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                        )}
                        {group?.title ?? 'Sem grupo'}
                      </span>
                    </td>
                  </tr>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/40 hover:bg-accent/20 cursor-pointer"
                      onClick={() => navigate(`/board/${data.id}?item=${item.id}`)}
                    >
                      <td className="px-3 py-2 truncate max-w-[260px] text-foreground">
                        {item.name || <span className="text-muted-foreground/60">Sem nome</span>}
                      </td>
                      {data.columns.map((col) => {
                        const cellValue = valuesByItem.get(item.id)?.get(col.id);
                        return (
                          <td key={col.id} className="px-3 py-2 align-middle">
                            <CellRender column={col} value={cellValue} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer com CTA quando ha mais items/colunas escondidos */}
      {(hiddenItems > 0 || hiddenColumns > 0) && (
        <div className="px-4 py-2 border-t border-border bg-muted/10 text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {hiddenItems > 0 && `+${hiddenItems} item${hiddenItems === 1 ? '' : 's'}`}
            {hiddenItems > 0 && hiddenColumns > 0 && ' · '}
            {hiddenColumns > 0 &&
              `+${hiddenColumns} coluna${hiddenColumns === 1 ? '' : 's'}`}
          </span>
          <button
            type="button"
            onClick={() => navigate(`/board/${data.id}`)}
            className="hover:text-foreground flex items-center gap-1"
          >
            Ver completo no board <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Block spec do BlockNote para embed read-only de board.
 *
 * Props serializadas no JSON do documento:
 *  - boardId: id do board referenciado
 *  - snapshotName: nome do board no momento da insercao (fallback de label).
 *
 * content: 'none' garante que o bloco e atomico (sem filhos editaveis).
 */
export const EmbedBoardBlock = createReactBlockSpec(
  {
    type: 'embed-board' as const,
    propSchema: {
      boardId: { default: '' as string },
      snapshotName: { default: '' as string },
    },
    content: 'none',
  },
  {
    render: (props) => (
      <EmbedBoardView boardId={props.block.props.boardId as string} />
    ),
  },
);
