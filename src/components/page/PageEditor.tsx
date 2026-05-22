import React, { useEffect, useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { Block, PartialBlock } from '@blocknote/core';
import { useTheme } from 'next-themes';

import { lfproBlockNoteLightTheme, lfproBlockNoteDarkTheme } from './blocknote-theme';

// Imports de CSS obrigatorios do BlockNote.
// Nao remover. Os overrides finos vivem em src/styles/blocknote-overrides.css.
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

export interface PageEditorProps {
  /** Conteudo inicial em formato BlockNote. Lido apenas na montagem. */
  initialContent?: PartialBlock[];
  /** Callback disparado a cada mudanca (debounce e responsabilidade do consumidor). */
  onChange?: (blocks: Block[]) => void;
  /** Bloqueia edicao (leitura apenas). Default true. */
  editable?: boolean;
  /** className do container externo. */
  className?: string;
}

/**
 * PageEditor — editor base BlockNote tematizado para LFPro.
 *
 * Componente uncontrolled (segue API do BlockNote): `initialContent` so e lido na
 * primeira renderizacao. Para atualizar externamente use `editor.replaceBlocks`.
 *
 * Tema acompanha o tema global (light/dark) via next-themes.
 *
 * Conexao com plano 01-04: hook de auto-save chama `onChange` com debounce.
 * Conexao com plano 01-05: extensoes customizadas (mention/embed) entram aqui.
 */
const PageEditor: React.FC<PageEditorProps> = ({
  initialContent,
  onChange,
  editable = true,
  className,
}) => {
  const { resolvedTheme } = useTheme();

  const editor = useCreateBlockNote({
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
  });

  const theme = useMemo(
    () => (resolvedTheme === 'dark' ? lfproBlockNoteDarkTheme : lfproBlockNoteLightTheme),
    [resolvedTheme]
  );

  // Atualiza editable dinamicamente.
  useEffect(() => {
    editor.isEditable = editable;
  }, [editor, editable]);

  return (
    <div className={className ?? 'w-full max-w-3xl mx-auto px-4'}>
      <BlockNoteView
        editor={editor}
        theme={theme}
        editable={editable}
        onChange={() => {
          if (onChange) {
            onChange(editor.document);
          }
        }}
      />
    </div>
  );
};

export default PageEditor;
