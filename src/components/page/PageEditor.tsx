import React, { useEffect, useMemo, useState } from 'react';
import {
  useCreateBlockNote,
  SuggestionMenuController,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { filterSuggestionItems, type PartialBlock } from '@blocknote/core';
import { pt as ptDictionary } from '@blocknote/core/locales';
import { useTheme } from 'next-themes';

import { lfproBlockNoteLightTheme, lfproBlockNoteDarkTheme } from './blocknote-theme';
import { lfproBlockNoteSchema } from './blocknote-schema';
import { getCustomSlashMenuItems } from './slash-menu';
import ItemPickerPopover from './blocks/ItemPickerPopover';
import BoardPickerPopover from './blocks/BoardPickerPopover';

// Imports de CSS obrigatorios do BlockNote.
// Nao remover. Os overrides finos vivem em src/styles/blocknote-overrides.css.
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

// Tipo do array de blocos usado nas props publicas (mantemos generico para nao
// vazar genericos pesados do BlockNote pros consumidores).
export type PageEditorBlocks = PartialBlock[];

export interface PageEditorProps {
  /** Conteudo inicial em formato BlockNote. Lido apenas na montagem. */
  initialContent?: PageEditorBlocks;
  /** Callback disparado a cada mudanca (debounce e responsabilidade do consumidor). */
  onChange?: (blocks: PageEditorBlocks) => void;
  /** Bloqueia edicao (leitura apenas). Default true. */
  editable?: boolean;
  /** className do container externo. */
  className?: string;
  /**
   * Ref opcional que recebe a instancia do editor BlockNote. Usado por features
   * externas que precisam manipular o documento (ex: restore de versao chama
   * editor.replaceBlocks). Sem ref, o editor permanece encapsulado.
   */
  editorRef?: React.MutableRefObject<unknown>;
}

/**
 * PageEditor - editor BlockNote tematizado para LFPro.
 *
 * Componente uncontrolled (segue API do BlockNote): `initialContent` so e lido na
 * primeira renderizacao. Para atualizar externamente use `editor.replaceBlocks`.
 *
 * Tema acompanha o tema global (light/dark) via next-themes.
 *
 * Extensoes registradas:
 *  - schema custom (mention-item inline content; embed-board planejado em 01-05b)
 *  - slash menu pt-BR (dictionary pt + items LFPro adicionais)
 *  - ItemPickerPopover acionado a partir do slash "Mencionar item"
 */
const PageEditor: React.FC<PageEditorProps> = ({
  initialContent,
  onChange,
  editable = true,
  className,
  editorRef,
}) => {
  const { resolvedTheme } = useTheme();
  const [mentionOpen, setMentionOpen] = useState(false);
  const [embedBoardOpen, setEmbedBoardOpen] = useState(false);

  const editor = useCreateBlockNote({
    schema: lfproBlockNoteSchema,
    dictionary: ptDictionary,
    initialContent:
      initialContent && initialContent.length > 0
        ? (initialContent as unknown as PartialBlock[])
        : undefined,
  });

  const theme = useMemo(
    () => (resolvedTheme === 'dark' ? lfproBlockNoteDarkTheme : lfproBlockNoteLightTheme),
    [resolvedTheme],
  );

  // Atualiza editable dinamicamente.
  useEffect(() => {
    editor.isEditable = editable;
  }, [editor, editable]);

  // Expoe a instancia do editor via ref para features externas (ex: restore de versao).
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
    return () => {
      if (editorRef && editorRef.current === editor) {
        editorRef.current = null;
      }
    };
  }, [editor, editorRef]);

  return (
    <div className={className ?? 'w-full max-w-3xl mx-auto px-4'}>
      <BlockNoteView
        editor={editor}
        theme={theme}
        editable={editable}
        slashMenu={false}
        onChange={() => {
          if (onChange) {
            // editor.document e tipado com o schema custom; cast para PageEditorBlocks
            // mantem a API publica do componente estavel.
            onChange(editor.document as unknown as PageEditorBlocks);
          }
        }}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              getCustomSlashMenuItems(editor, {
                onTriggerMention: () => setMentionOpen(true),
                onTriggerEmbedBoard: () => setEmbedBoardOpen(true),
              }),
              query,
            )
          }
        />
      </BlockNoteView>

      <ItemPickerPopover
        open={mentionOpen}
        onOpenChange={setMentionOpen}
        onSelect={(item) => {
          editor.insertInlineContent([
            {
              type: 'mention-item',
              props: { itemId: item.id, snapshotName: item.name },
            },
            ' ',
          ]);
        }}
      />

      <BoardPickerPopover
        open={embedBoardOpen}
        onOpenChange={setEmbedBoardOpen}
        onSelect={(board) => {
          const cursor = editor.getTextCursorPosition();
          // Cast generico: o type 'embed-board' vem do schema custom mas o
          // insertBlocks com generics estritos pediria propagar tipos pesados
          // do BlockNote pra consumidores externos. Mantemos seguro via schema.
          editor.insertBlocks(
            [
              {
                type: 'embed-board',
                props: { boardId: board.id, snapshotName: board.name },
              },
            ] as unknown as PartialBlock[],
            cursor.block,
            'after',
          );
        }}
      />
    </div>
  );
};

export default PageEditor;
