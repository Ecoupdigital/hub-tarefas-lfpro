import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmojiColorPicker } from '@/components/shared/EmojiColorPicker';
import { useCreateDatabase } from '@/hooks/useCrudMutations';
import { toast } from 'sonner';

interface CreateDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  pageId: string;
  onCreated: (result: { boardId: string; name: string }) => void;
}

/**
 * Dialog modal pt-BR para criar uma database inline ancorada na page atual.
 *
 * Fluxo:
 *  1. Usuario preenche nome (obrigatorio) e opcionalmente escolhe emoji/cor
 *  2. Confirma -> chama useCreateDatabase (boards.page_id + grupo + 3 colunas + 4 views)
 *  3. onCreated recebe { boardId, name } pro consumidor inserir bloco no editor
 *
 * Enter no input confirma. Cancelar/fechar reseta estado.
 */
const CreateDatabaseDialog: React.FC<CreateDatabaseDialogProps> = ({
  open,
  onOpenChange,
  workspaceId,
  pageId,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const createDatabase = useCreateDatabase();

  const handleConfirm = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Informe um nome para a database');
      return;
    }
    setIsCreating(true);
    try {
      const result = await createDatabase.mutateAsync({
        workspaceId,
        pageId,
        name: trimmed,
        icon: emoji,
      });
      onCreated({ boardId: result.boardId, name: trimmed });
      toast.success('Database criada');
      // Reset e fecha
      setName('');
      setEmoji(undefined);
      onOpenChange(false);
    } catch (e) {
      toast.error('Erro ao criar database. Tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName('');
      setEmoji(undefined);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova database</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <EmojiColorPicker
              emoji={emoji}
              color={undefined}
              onEmojiChange={setEmoji}
              onColorChange={() => {
                /* cor nao usada na database inline no MVP */
              }}
              size="md"
            />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da database"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleConfirm();
                }
              }}
              disabled={isCreating}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            A database e criada com 3 colunas (Status, Data, Responsavel), um grupo
            padrao e 4 views (Tabela, Kanban, Calendario, Lista detalhada).
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={isCreating}>
            {isCreating ? 'Criando...' : 'Criar database'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDatabaseDialog;
