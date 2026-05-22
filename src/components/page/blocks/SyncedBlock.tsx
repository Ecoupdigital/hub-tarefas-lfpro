import React, { useEffect, useMemo, useRef } from 'react';
import { createReactBlockSpec, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { pt as ptDictionary } from '@blocknote/core/locales';
import type { PartialBlock } from '@blocknote/core';
import { Repeat2 } from 'lucide-react';
import { useTheme } from 'next-themes';

import { lfproBlockNoteLightTheme, lfproBlockNoteDarkTheme } from '../blocknote-theme';
import { useSyncedBlock } from '@/hooks/useSupabaseData';
import { useUpdateSyncedBlockContent } from '@/hooks/useCrudMutations';

/**
 * Bloco custom BlockNote 'synced' - conteudo compartilhado entre pages do workspace.
 *
 * Render (estados visuais):
 *  - id vazio: placeholder destrutivo (caso teorico, insercao sempre passa id)
 *  - syncedBlock null + nao loading: placeholder "Bloco nao acessivel"
 *    (workspace diferente, removido ou bloqueado por RLS)
 *  - syncedBlock carregado: container com mini-editor BlockNote interno editavel
 *
 * O mini-editor usa schema DEFAULT do BlockNote (sem mention/embed/database/bookmark/synced).
 * Isso e intencional pra evitar:
 *  - nesting infinito de synced blocks dentro de synced blocks
 *  - dependencias cruzadas que dificultam serializar/migrar
 * Conteudo permanece rich (paragrafos, headings, listas, etc).
 *
 * Sync model (last-write-wins):
 *  - Edicao local: debounce 1s -> useUpdateSyncedBlockContent (salva JSON em synced_blocks.content)
 *  - Edicao remota: useSyncedBlock retorna novo content (via realtime/invalidate em 02-11)
 *    -> useEffect aplica via editor.replaceBlocks SE nao for echo da nossa propria edicao
 *
 * Props serializadas no JSON do documento BlockNote:
 *  - synced_block_id: id da row em public.synced_blocks
 *
 * content: 'none' garante que o bloco e atomico no editor pai (sem texto editavel fora do mini-editor).
 * contentEditable={false} no wrapper isola o ProseMirror interno do mini-editor do pai.
 *
 * IMPORTANTE: createReactBlockSpec retorna factory na API v0.51 do BlockNote.
 * Para usar no schema, invocar como `SyncedBlock()` (ver blocknote-schema.ts).
 */
export const SyncedBlock = createReactBlockSpec(
  {
    type: 'synced' as const,
    propSchema: {
      synced_block_id: { default: '' as string },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const id = (props.block.props as { synced_block_id?: string }).synced_block_id ?? '';
      return <SyncedBlockView id={id} />;
    },
  },
);

const SAVE_DEBOUNCE_MS = 1000;

interface SyncedBlockViewProps {
  id: string;
}

const SyncedBlockView: React.FC<SyncedBlockViewProps> = ({ id }) => {
  const { resolvedTheme } = useTheme();
  const { data: syncedBlock, isLoading } = useSyncedBlock(id);
  const updateContent = useUpdateSyncedBlockContent();

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Serializacao do ultimo content salvo/recebido. Usado pra:
  //  1. evitar saves redundantes (se nada mudou)
  //  2. evitar replaceBlocks redundante quando o realtime traz o eco do nosso save
  const lastSyncedSerializedRef = useRef<string>('');
  // Flag de "edicao local pendente": setada antes do save e consumida quando o
  // realtime devolve o mesmo content (evita stomp do cursor durante digitacao).
  const isLocalEditRef = useRef(false);

  const initialContent = useMemo<PartialBlock[] | undefined>(() => {
    if (!syncedBlock?.content) return undefined;
    if (!Array.isArray(syncedBlock.content)) return undefined;
    return syncedBlock.content as unknown as PartialBlock[];
  }, [syncedBlock?.content]);

  // Mini-editor BlockNote DEFAULT (sem customizacoes). Decisao explicita:
  // synced blocks nao aceitam mention/embed/database/bookmark/synced aninhados no MVP.
  const editor = useCreateBlockNote({
    dictionary: ptDictionary,
    initialContent,
  });

  const theme = useMemo(
    () => (resolvedTheme === 'dark' ? lfproBlockNoteDarkTheme : lfproBlockNoteLightTheme),
    [resolvedTheme],
  );

  // Aplica updates externos (realtime/refetch) sem stompar edicao local em curso.
  useEffect(() => {
    if (!syncedBlock?.content) return;
    const serverSerialized = JSON.stringify(syncedBlock.content);
    if (serverSerialized === lastSyncedSerializedRef.current) {
      // Sem mudanca real -> ignora (evita loop com nossa propria edicao em flight).
      return;
    }
    if (isLocalEditRef.current) {
      // Server confirmando NOSSA edicao mais recente. Atualiza baseline e sai
      // sem replaceBlocks (replaceBlocks mata cursor/seleta do usuario).
      isLocalEditRef.current = false;
      lastSyncedSerializedRef.current = serverSerialized;
      return;
    }
    // Update genuinamente externo (outra page editou). Aplica ao editor local.
    try {
      const currentBlocks = editor.document;
      editor.replaceBlocks(
        currentBlocks,
        syncedBlock.content as unknown as PartialBlock[],
      );
      lastSyncedSerializedRef.current = serverSerialized;
    } catch (e) {
      console.error('SyncedBlock replaceBlocks erro:', e);
    }
    // editor incluido nas deps por hook lint; ele e estavel apos useCreateBlockNote.
  }, [syncedBlock?.content, editor]);

  // Debounced save: dispara 1s apos a ultima alteracao do mini-editor.
  const handleEditorChange = () => {
    if (!id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const content = editor.document as unknown as unknown[];
      const serialized = JSON.stringify(content);
      if (serialized === lastSyncedSerializedRef.current) return;
      isLocalEditRef.current = true;
      lastSyncedSerializedRef.current = serialized;
      updateContent.mutate({ id, content });
    }, SAVE_DEBOUNCE_MS);
  };

  // Cleanup do timer no unmount pra nao salvar fantasma.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (!id) {
    return (
      <div
        contentEditable={false}
        className="my-3 border border-destructive/30 rounded-md p-3 text-sm text-destructive bg-destructive/5"
      >
        Bloco sincronizado invalido (id ausente).
      </div>
    );
  }

  if (!isLoading && !syncedBlock) {
    return (
      <div
        contentEditable={false}
        className="my-3 border border-border rounded-md p-3 text-sm text-muted-foreground bg-muted/30"
      >
        <div className="flex items-center gap-1.5">
          <Repeat2 className="w-3.5 h-3.5" />
          <span>Bloco nao acessivel (workspace diferente ou removido).</span>
        </div>
      </div>
    );
  }

  return (
    <div
      contentEditable={false}
      className="my-3 border-l-2 border-primary/40 rounded-md bg-muted/10 overflow-hidden"
    >
      <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground border-b border-border/50 bg-muted/20">
        <Repeat2 className="w-3 h-3" />
        <span>Bloco sincronizado</span>
      </div>
      <div className="px-2 py-1 synced-block-inner-editor">
        <BlockNoteView editor={editor} theme={theme} onChange={handleEditorChange} />
      </div>
    </div>
  );
};
