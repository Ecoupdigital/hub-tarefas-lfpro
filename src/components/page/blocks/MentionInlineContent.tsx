import React from 'react';
import { createReactInlineContentSpec } from '@blocknote/react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MentionStatus {
  name: string;
  color: string;
}

interface MentionData {
  id: string;
  name: string;
  boardId: string;
  status: MentionStatus | null;
}

/**
 * Resolve dados do item no momento do render do chip:
 *  - nome atual
 *  - board_id (para navegacao)
 *  - status (primeira coluna do tipo `status` do board) com label resolvido em settings.labels
 *
 * Usa staleTime de 30s para nao spammar requests durante scroll/render.
 */
function useMentionData(itemId: string) {
  return useQuery<MentionData | null>({
    queryKey: ['mention-data', itemId],
    enabled: !!itemId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data: item, error } = await supabase
        .from('items')
        .select('id, name, board_id, state')
        .eq('id', itemId)
        .maybeSingle();
      if (error || !item || item.state === 'deleted' || !item.board_id) return null;

      // Primeira coluna status do board (por posicao)
      const { data: statusCol } = await supabase
        .from('columns')
        .select('id, settings')
        .eq('board_id', item.board_id as string)
        .eq('column_type', 'status')
        .order('position')
        .limit(1)
        .maybeSingle();

      let status: MentionStatus | null = null;
      if (statusCol) {
        const { data: cv } = await supabase
          .from('column_values')
          .select('value')
          .eq('item_id', item.id)
          .eq('column_id', statusCol.id)
          .maybeSingle();
        // column_values.value para status e a chave (ex: "key1"); resolvemos via settings.labels
        const key = typeof cv?.value === 'string' ? cv.value : null;
        const labels = (statusCol.settings as { labels?: Record<string, { name: string; color: string }> })?.labels ?? {};
        if (key && labels[key]) {
          status = { name: labels[key].name, color: labels[key].color };
        }
      }

      return {
        id: item.id,
        name: item.name as string,
        boardId: item.board_id as string,
        status,
      };
    },
  });
}

/**
 * Chip clicavel renderizado inline na pagina.
 * Click navega para o board com query param ?item=<id> para o board abrir o ItemDetailPanel.
 */
const MentionChip: React.FC<{ itemId: string; snapshotName?: string }> = ({ itemId, snapshotName }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useMentionData(itemId);

  if (isLoading) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-sm align-baseline"
        contentEditable={false}
      >
        @{snapshotName ?? 'carregando...'}
      </span>
    );
  }

  if (!data) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-sm align-baseline"
        contentEditable={false}
        title="Item indisponivel ou sem permissao"
      >
        @{snapshotName ?? 'item indisponivel'}
      </span>
    );
  }

  return (
    <span
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/board/${data.boardId}?item=${data.id}`);
      }}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/board/${data.boardId}?item=${data.id}`);
        }
      }}
      contentEditable={false}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer hover:brightness-95 dark:hover:brightness-110 text-sm font-medium align-baseline transition-all"
      style={{
        backgroundColor: 'hsl(29 45% 71% / 0.22)',
        color: 'hsl(29 60% 28%)',
      }}
      title={`Abrir item em ${data.name}`}
    >
      <span>@{data.name}</span>
      {data.status && (
        <span
          className="ml-0.5 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: data.status.color }}
          title={data.status.name}
          aria-label={`Status: ${data.status.name}`}
        />
      )}
    </span>
  );
};

/**
 * Inline content spec do BlockNote para chip @mencao.
 * Props serializados no JSON do documento:
 *  - itemId: id do item referenciado
 *  - snapshotName: nome do item no momento da insercao (fallback se item for deletado)
 */
export const MentionInlineContent = createReactInlineContentSpec(
  {
    type: 'mention-item' as const,
    propSchema: {
      itemId: { default: '' as string },
      snapshotName: { default: '' as string },
    },
    content: 'none',
  },
  {
    render: (props) => (
      <MentionChip
        itemId={props.inlineContent.props.itemId as string}
        snapshotName={props.inlineContent.props.snapshotName as string}
      />
    ),
  },
);
