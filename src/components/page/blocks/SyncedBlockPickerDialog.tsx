import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Repeat2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useSyncedBlocksByWorkspace } from '@/hooks/useSupabaseData';
import { useCreateSyncedBlock } from '@/hooks/useCrudMutations';

/**
 * Dialog que escolhe entre criar um novo synced_block ou referenciar
 * um existente do mesmo workspace.
 *
 * Fluxo:
 *  - "Criar novo": chama useCreateSyncedBlock com seed minimo (paragrafo placeholder),
 *    propaga o id pro caller (PageEditor) que insere o bloco no documento.
 *  - "Referenciar existente": lista synced blocks do workspace ordenados por
 *    updated_at desc; click propaga o id e fecha.
 *
 * Lista so aparece quando ha pelo menos 1 synced block existente no workspace
 * (evita secao vazia no primeiro uso).
 *
 * Workspace scope: useSyncedBlocksByWorkspace ja recebe workspaceId e
 * RLS garante que somente synced blocks acessiveis ao usuario apareçam.
 */
export interface SyncedBlockPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  /** Callback com o id do synced_block a ser referenciado. */
  onSelect: (syncedBlockId: string) => void;
}

const SyncedBlockPickerDialog: React.FC<SyncedBlockPickerDialogProps> = ({
  open,
  onOpenChange,
  workspaceId,
  onSelect,
}) => {
  const { data: synced = [] } = useSyncedBlocksByWorkspace(workspaceId, open);
  const createSynced = useCreateSyncedBlock();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNew = async () => {
    setIsCreating(true);
    try {
      // Seed: paragrafo simples em pt-BR. Usuario pode editar imediatamente
      // no mini-editor apos inserir o bloco na page.
      const created = await createSynced.mutateAsync({
        workspaceId,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Conteudo sincronizado', styles: {} }],
          },
        ],
      });
      const newId = (created as { id?: string }).id;
      if (!newId) throw new Error('synced_block sem id no retorno');
      onSelect(newId);
      onOpenChange(false);
      toast.success('Bloco sincronizado criado');
    } catch (e) {
      console.error('handleCreateNew synced erro:', e);
      // useCreateSyncedBlock ja mostra toast de erro; aqui nao duplica.
    } finally {
      setIsCreating(false);
    }
  };

  // Extrai preview textual dos primeiros blocos pra ajudar o usuario a
  // identificar qual synced_block referenciar. Tolerante a formatos.
  const previewText = (content: unknown): string => {
    if (!Array.isArray(content) || content.length === 0) return '(vazio)';
    const first = content[0] as {
      content?: Array<{ text?: string; type?: string }> | string;
    };
    if (typeof first.content === 'string') return first.content.slice(0, 80);
    if (Array.isArray(first.content)) {
      const text = first.content
        .map((c) => (typeof c === 'object' && c?.text ? c.text : ''))
        .join('')
        .trim();
      return text ? text.slice(0, 80) : '(sem texto)';
    }
    return '(sem texto)';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bloco sincronizado</DialogTitle>
        </DialogHeader>

        <Button
          onClick={handleCreateNew}
          disabled={isCreating}
          className="w-full"
          variant="default"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isCreating ? 'Criando...' : 'Criar novo bloco sincronizado'}
        </Button>

        {synced.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
              Ou referencie um existente
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {synced.map((sb) => (
                <button
                  key={sb.id}
                  type="button"
                  onClick={() => {
                    onSelect(sb.id);
                    onOpenChange(false);
                  }}
                  className="w-full flex items-start gap-2 p-2 rounded hover:bg-muted transition-colors text-left"
                >
                  <Repeat2 className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{previewText(sb.content)}</p>
                    <p className="text-xs text-muted-foreground">
                      Atualizado em{' '}
                      {format(parseISO(sb.updated_at), "dd 'de' MMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SyncedBlockPickerDialog;
