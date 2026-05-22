import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { History, RotateCcw } from 'lucide-react';
import { useProfiles } from '@/hooks/useSupabaseData';
import {
  usePageVersions,
  useRestorePageVersion,
} from '@/hooks/usePageVersions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Page, PageVersion } from '@/types/page';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: Page;
  /** Callback acionado apos restore bem-sucedido. Recebe o conteudo restaurado
   *  para que o consumidor atualize o editor (chamando editor.replaceBlocks). */
  onAfterRestore: (newContent: unknown[]) => void;
}

const PageVersionsPanel: React.FC<Props> = ({
  open,
  onOpenChange,
  page,
  onAfterRestore,
}) => {
  const { data: versions = [], isLoading } = usePageVersions(page.id);
  const { data: profiles = [] } = useProfiles();
  const restore = useRestorePageVersion();

  const [pendingVersion, setPendingVersion] = useState<PageVersion | null>(null);

  const getAuthor = (userId: string | null): string => {
    if (!userId) return 'Sistema';
    const p = (profiles as Array<{ id: string; name?: string | null; email?: string | null }>).find(
      (pr) => pr.id === userId
    );
    return p?.name ?? p?.email ?? 'Usuario';
  };

  const handleConfirmRestore = () => {
    if (!pendingVersion) return;
    const version = pendingVersion;
    restore.mutate(
      {
        pageId: page.id,
        versionContent: version.content as unknown[],
        versionTitle: version.title,
        currentContent: (page.content as unknown[]) ?? [],
        currentTitle: page.title,
      },
      {
        onSuccess: (res) => {
          toast.success('Versao restaurada');
          onAfterRestore(res.content as unknown[]);
          setPendingVersion(null);
          onOpenChange(false);
        },
        onError: () => {
          toast.error('Erro ao restaurar versao');
          setPendingVersion(null);
        },
      }
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Historico de versoes
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-2">
            {isLoading && (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isLoading && versions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma versao salva ainda. Snapshots sao criados automaticamente
                a cada poucos minutos de edicao.
              </p>
            )}

            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {v.title ?? page.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getAuthor(v.created_by)}
                      {' · '}
                      {format(new Date(v.created_at), "dd 'de' MMM 'as' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setPendingVersion(v)}
                    disabled={restore.isPending}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Restaurar
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingVersion}
        onOpenChange={(o) => {
          if (!o) setPendingVersion(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar esta versao?</AlertDialogTitle>
            <AlertDialogDescription>
              O estado atual da pagina sera salvo no historico antes da
              restauracao, entao voce nao perde nada e pode voltar atras a
              qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restore.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              disabled={restore.isPending}
            >
              {restore.isPending ? 'Restaurando...' : 'Restaurar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PageVersionsPanel;
