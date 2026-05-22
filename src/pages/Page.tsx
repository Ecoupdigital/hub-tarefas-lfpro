import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { usePage } from '@/hooks/useSupabaseData';
import { useCanEditPage } from '@/hooks/usePagePermissions';
import PageEditor from '@/components/page/PageEditor';
import PageHeader from '@/components/page/PageHeader';
import PagePermissionsPanel from '@/components/page/PagePermissionsPanel';
import { usePageAutoSave } from '@/components/page/usePageAutoSave';
import LoadingScreen from '@/components/shared/LoadingScreen';
import type { PartialBlock } from '@blocknote/core';

const PagePage: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const { data: page, isLoading, error } = usePage(pageId);
  const autoSave = usePageAutoSave({ pageId: pageId ?? '' });
  const canEdit = useCanEditPage(pageId ?? null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);

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

  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        pageId={page.id}
        initialTitle={page.title}
        saveStatus={autoSave.status}
        onOpenPermissions={() => setPermissionsOpen(true)}
      />
      <div className="flex-1 overflow-y-auto py-8">
        <PageEditor
          initialContent={initialContent}
          onChange={(blocks) => autoSave.schedule(blocks)}
          editable={canEdit}
        />
      </div>
      <PagePermissionsPanel
        open={permissionsOpen}
        onOpenChange={setPermissionsOpen}
        pageId={page.id}
      />
    </div>
  );
};

export default PagePage;
