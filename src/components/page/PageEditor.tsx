import React, { useEffect, useMemo, useState } from 'react';
import {
  useCreateBlockNote,
  SuggestionMenuController,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { filterSuggestionItems, type PartialBlock } from '@blocknote/core';
import { pt as ptDictionary } from '@blocknote/core/locales';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

import { lfproBlockNoteLightTheme, lfproBlockNoteDarkTheme } from './blocknote-theme';
import { lfproBlockNoteSchema } from './blocknote-schema';
import { getCustomSlashMenuItems } from './slash-menu';
import ItemPickerPopover from './blocks/ItemPickerPopover';
import BoardPickerPopover from './blocks/BoardPickerPopover';
import CreateDatabaseDialog from './CreateDatabaseDialog';
import UrlPromptDialog from './blocks/UrlPromptDialog';
import SyncedBlockPickerDialog from './blocks/SyncedBlockPickerDialog';
import { usePageImageUpload } from './usePageImageUpload';
import { usePage } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';

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
  /**
   * Id da pagina, usado pelo upload de imagem para compor o path no bucket
   * `attachments`. Quando omitido, upload de imagem fica desabilitado (BlockNote
   * mostra mensagem padrao orientando a colar URL).
   */
  pageId?: string;
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
  pageId,
}) => {
  const { resolvedTheme } = useTheme();
  const [mentionOpen, setMentionOpen] = useState(false);
  const [embedBoardOpen, setEmbedBoardOpen] = useState(false);
  const [databaseDialogOpen, setDatabaseDialogOpen] = useState(false);
  const [bookmarkPromptOpen, setBookmarkPromptOpen] = useState(false);
  const [syncedDialogOpen, setSyncedDialogOpen] = useState(false);

  // Lookup do workspace via pageId pra passar pro CreateDatabaseDialog.
  // Quando pageId esta ausente (preview/uso fora da rota /page/:id), o item
  // 'Database' do slash menu nao e exposto.
  const { data: pageData } = usePage(pageId);
  const workspaceId = pageData?.workspace_id ?? undefined;

  // Upload de imagem para o bucket `attachments`. Quando `pageId` esta ausente
  // (uso fora da rota /page/:id, como em previews), nao passamos uploadFile e
  // o BlockNote orienta o usuario a colar URL no lugar.
  const uploadImage = usePageImageUpload(pageId ?? '');

  const editor = useCreateBlockNote({
    schema: lfproBlockNoteSchema,
    dictionary: ptDictionary,
    uploadFile: pageId ? uploadImage : undefined,
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
                onTriggerDatabase:
                  pageId && workspaceId ? () => setDatabaseDialogOpen(true) : undefined,
                onTriggerBookmark: () => setBookmarkPromptOpen(true),
                // Synced block requer workspaceId (RLS scope). Sem workspace,
                // ocultamos o item do slash menu pra evitar erros de RLS.
                onTriggerSyncedBlock: workspaceId ? () => setSyncedDialogOpen(true) : undefined,
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

      {pageId && workspaceId && (
        <CreateDatabaseDialog
          open={databaseDialogOpen}
          onOpenChange={setDatabaseDialogOpen}
          workspaceId={workspaceId}
          pageId={pageId}
          onCreated={({ boardId, name }) => {
            const cursor = editor.getTextCursorPosition();
            // Cast pelo mesmo motivo do embed-board: o type 'database' vem do
            // schema custom mas mantemos consumidores externos sem tipos pesados.
            editor.insertBlocks(
              [
                {
                  type: 'database',
                  props: { boardId, snapshotName: name },
                },
              ] as unknown as PartialBlock[],
              cursor.block,
              'after',
            );
          }}
        />
      )}

      {workspaceId && (
        <SyncedBlockPickerDialog
          open={syncedDialogOpen}
          onOpenChange={setSyncedDialogOpen}
          workspaceId={workspaceId}
          onSelect={(syncedBlockId) => {
            const cursor = editor.getTextCursorPosition();
            // Cast pelo mesmo motivo dos outros blocos custom: mantemos a API
            // publica do componente sem propagar generics pesados do BlockNote.
            editor.insertBlocks(
              [
                {
                  type: 'synced',
                  props: { synced_block_id: syncedBlockId },
                },
              ] as unknown as PartialBlock[],
              cursor.block,
              'after',
            );
          }}
        />
      )}

      <UrlPromptDialog
        open={bookmarkPromptOpen}
        onOpenChange={setBookmarkPromptOpen}
        onConfirm={async (url) => {
          const cursor = editor.getTextCursorPosition();
          // 1. Insere bloco com props minimas pra UX otimista (placeholder rapido
          //    com so a URL; renderiza estado fallback enquanto a Edge Function roda).
          editor.insertBlocks(
            [
              {
                type: 'bookmark',
                props: {
                  url,
                  title: '',
                  description: '',
                  image: '',
                  favicon: '',
                  site_name: '',
                  fetched_at: '',
                },
              },
            ] as unknown as PartialBlock[],
            cursor.block,
            'after',
          );

          // 2. Captura referencia do bloco recem-inserido. insertBlocks nao retorna
          //    com tipos estritos na nossa API publica, entao buscamos no documento
          //    o ultimo bloco bookmark com a URL alvo e fetched_at vazio.
          const findInsertedBlock = () => {
            const docBlocks = (editor.document ?? []) as unknown as Array<{
              id?: string;
              type?: string;
              props?: { url?: string; fetched_at?: string };
            }>;
            for (let i = docBlocks.length - 1; i >= 0; i--) {
              const blk = docBlocks[i];
              if (
                blk.type === 'bookmark' &&
                blk.props?.url === url &&
                !blk.props?.fetched_at
              ) {
                return blk;
              }
            }
            return null;
          };

          // 3. Em paralelo: busca metadata e atualiza o bloco.
          try {
            const { data, error } = await supabase.functions.invoke(
              'fetch-url-metadata',
              { body: { url } },
            );
            if (error) throw error;
            const meta = (data ?? {}) as {
              title?: string | null;
              description?: string | null;
              image?: string | null;
              favicon?: string | null;
              site_name?: string | null;
              fetched_at?: string | null;
            };

            const target = findInsertedBlock();
            if (target?.id) {
              editor.updateBlock(target.id as unknown as string, {
                type: 'bookmark',
                props: {
                  url,
                  title: meta.title ?? '',
                  description: meta.description ?? '',
                  image: meta.image ?? '',
                  favicon: meta.favicon ?? '',
                  site_name: meta.site_name ?? '',
                  fetched_at: meta.fetched_at ?? new Date().toISOString(),
                },
              } as unknown as PartialBlock);
            }
          } catch (err) {
            console.error('fetch-url-metadata invoke error:', err);
            toast.error(
              'Nao foi possivel buscar o preview. Use "Atualizar preview" no bloco.',
            );
          }
        }}
      />
    </div>
  );
};

export default PageEditor;
