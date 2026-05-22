import React, { useEffect, useRef, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { usePage } from '@/hooks/useSupabaseData';
import { useCanEditPage } from '@/hooks/usePagePermissions';
import PageEditor from '@/components/page/PageEditor';
import PageHeader from '@/components/page/PageHeader';
import PagePermissionsPanel from '@/components/page/PagePermissionsPanel';
import PageVersionsPanel from '@/components/page/PageVersionsPanel';
import { usePageAutoSave } from '@/components/page/usePageAutoSave';
import LoadingScreen from '@/components/shared/LoadingScreen';
import type { PartialBlock } from '@blocknote/core';
import type { Page } from '@/types/page';

const PagePage: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const { data: page, isLoading, error } = usePage(pageId);
  // Ref pro editor BlockNote, populada pelo PageEditor. Permite restore de versao
  // chamar editor.replaceBlocks sem reload.
  const editorRef = useRef<unknown>(null);
  // Ref pro titulo corrente, lida pelo usePageAutoSave quando snapshot e disparado.
  const currentTitleRef = useRef<string>('');
  if (page) currentTitleRef.current = page.title;

  const autoSave = usePageAutoSave({
    pageId: pageId ?? '',
    getCurrentTitle: () => currentTitleRef.current,
  });
  const canEdit = useCanEditPage(pageId ?? null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Anti-overwrite: quando outro usuario salva (ou nos mesmos saimos e voltamos),
  // a query `usePage` invalida e retorna content novo. Re-aplicamos no editor
  // APENAS se nao houver edicao local pendente. Sem isso, o usuario perderia
  // o que esta digitando agora.
  const lastUpdatedAtRef = useRef<string | null>(null);
  useEffect(() => {
    if (!page) return;
    if (lastUpdatedAtRef.current === null) {
      lastUpdatedAtRef.current = page.updated_at;
      return;
    }
    if (page.updated_at === lastUpdatedAtRef.current) return;
    lastUpdatedAtRef.current = page.updated_at;

    // Aceitar incoming so quando nao ha mudancas locais pendentes.
    // status === 'saving' tambem bloqueia (nosso save in-flight pode ter
    // gerado o update que voltou via realtime).
    const safeToReplace =
      autoSave.status === 'idle' || autoSave.status === 'saved';
    if (!safeToReplace) return;

    const editor = editorRef.current as {
      document: unknown[];
      replaceBlocks: (existing: unknown[], next: unknown[]) => void;
    } | null;
    if (editor && Array.isArray(page.content)) {
      editor.replaceBlocks(editor.document, page.content as unknown[]);
    }
  }, [page, autoSave.status]);

  if (!pageId) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !page) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-6">
        <h2 className="font-heading text-xl font-bold mb-2">Pagina nao encontrada</h2>
        <p className="text-sm text-muted-foreground">
          A pagina nao existe ou voce nao tem permissao para acessa-la.
        </p>
      </div>
    );
  }

  if (page.state !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-6">
        <h2 className="font-heading text-xl font-bold mb-2">Pagina arquivada</h2>
        <p className="text-sm text-muted-foreground">
          Esta pagina foi removida. Restaure-a na lixeira para edita-la.
        </p>
      </div>
    );
  }

  const initialContent = (page.content as PartialBlock[] | null) ?? undefined;

  const handleAfterRestore = (newContent: unknown[]) => {
    // editor.replaceBlocks substitui o documento todo sem reload.
    // Tipagem solta porque editor vem com generics pesados do BlockNote.
    const editor = editorRef.current as {
      document: unknown[];
      replaceBlocks: (existing: unknown[], next: unknown[]) => void;
    } | null;
    if (editor) {
      editor.replaceBlocks(editor.document, newContent);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        pageId={page.id}
        initialTitle={page.title}
        saveStatus={autoSave.status}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenPermissions={() => setPermissionsOpen(true)}
      />
      <div className="flex-1 overflow-y-auto py-8">
        <PageEditor
          pageId={page.id}
          initialContent={initialContent}
          onChange={(blocks) => autoSave.schedule(blocks)}
          editable={canEdit}
          editorRef={editorRef}
        />
      </div>
      <PagePermissionsPanel
        open={permissionsOpen}
        onOpenChange={setPermissionsOpen}
        pageId={page.id}
      />
      <PageVersionsPanel
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        page={page as Page}
        onAfterRestore={handleAfterRestore}
      />
    </div>
  );
};

export default PagePage;
