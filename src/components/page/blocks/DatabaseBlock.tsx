import React from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DatabaseViewTabs from '@/components/database/DatabaseViewTabs';
import DatabaseViewRenderer from '@/components/database/DatabaseViewRenderer';

/**
 * Bloco custom BlockNote 'database' - database inline ancorada na page.
 *
 * Render (MVP / stub):
 *  - Header com icone Database + nome do board (snapshotName) + clique abre
 *    em tela cheia via navigate(/board/:id)
 *  - DatabaseViewTabs (stub - implementacao em 02-08)
 *  - DatabaseViewRenderer (stub - implementacao em 02-06/07)
 *
 * Props serializadas no JSON do documento BlockNote:
 *  - boardId: id do board (boards.page_id IS NOT NULL) referenciado por este bloco
 *  - snapshotName: nome do board no momento do insert (fallback caso o board seja
 *    deletado ou inacessivel; tambem evita query extra so pra header)
 *
 * content: 'none' garante que o bloco e atomico (sem texto editavel dentro).
 * contentEditable={false} no wrapper impede ProseMirror de tratar o DOM interno
 * como conteudo do documento.
 *
 * IMPORTANTE: createReactBlockSpec retorna uma factory na API v0.51 do BlockNote.
 * Para usar no schema, invocar como `DatabaseBlock()` (ver blocknote-schema.ts).
 */
export const DatabaseBlock = createReactBlockSpec(
  {
    type: 'database' as const,
    propSchema: {
      boardId: { default: '' as string },
      snapshotName: { default: '' as string },
    },
    content: 'none',
  },
  {
    render: (props) => (
      <DatabaseBlockView
        boardId={props.block.props.boardId as string}
        snapshotName={props.block.props.snapshotName as string}
      />
    ),
  },
);

const DatabaseBlockView: React.FC<{ boardId: string; snapshotName: string }> = ({
  boardId,
  snapshotName,
}) => {
  const navigate = useNavigate();

  if (!boardId) {
    return (
      <div
        contentEditable={false}
        className="my-3 border border-destructive/30 rounded-md p-4 bg-destructive/5 text-sm text-destructive not-prose"
      >
        Database invalida (boardId ausente).
      </div>
    );
  }

  return (
    <div
      contentEditable={false}
      className="my-3 border border-border rounded-md bg-card overflow-hidden not-prose"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <Database className="w-4 h-4 text-primary shrink-0" />
        <button
          type="button"
          onClick={() => navigate(`/board/${boardId}`)}
          className="font-semibold text-sm text-foreground hover:underline truncate"
          title="Abrir database em tela cheia"
        >
          {snapshotName || 'Database'}
        </button>
      </div>
      <DatabaseViewTabs boardId={boardId} />
      <DatabaseViewRenderer boardId={boardId} />
    </div>
  );
};
