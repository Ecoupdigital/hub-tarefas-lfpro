import React, { useState } from 'react';
import { Table2, Kanban, Calendar, List } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateBoardView } from '@/hooks/useBoardViews';
import {
  DATABASE_VIEW_TYPES,
  DATABASE_VIEW_LABELS,
  type DatabaseViewType,
} from '@/types/database';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  onCreated: (viewId: string) => void;
}

/**
 * Dialog pt-BR pra criar uma nova board_view dentro de uma database inline.
 *
 * Campos:
 *  - Nome (texto, obrigatorio)
 *  - Tipo (grid de 4 opcoes: Tabela / Kanban / Calendario / Lista detalhada)
 *
 * Chama `useCreateBoardView` (insere em board_views) e callback `onCreated`
 * com o id da view criada para que o tab muda imediatamente pra ela.
 */
const ICONS: Record<DatabaseViewType, React.ComponentType<{ className?: string }>> = {
  table: Table2,
  kanban: Kanban,
  calendar: Calendar,
  list_detailed: List,
};

const CreateDatabaseViewDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  boardId,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DatabaseViewType>('table');
  const [isCreating, setIsCreating] = useState(false);
  const createView = useCreateBoardView();

  const resetState = () => {
    setName('');
    setType('table');
  };

  const handleOpenChange = (next: boolean) => {
    if (isCreating) return;
    if (!next) resetState();
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Informe um nome para a view');
      return;
    }
    setIsCreating(true);
    try {
      const created = await createView.mutateAsync({
        boardId,
        name: trimmed,
        viewType: type,
        config: {},
      });
      onCreated(created.id);
      toast.success('View criada');
      resetState();
      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao criar view:', err);
      toast.error('Erro ao criar view');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isCreating) {
      e.preventDefault();
      void handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Nova view</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="view-name" className="text-xs font-medium text-muted-foreground">
              Nome
            </Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Meus itens, Por status, Calendario do trimestre"
              autoFocus
              disabled={isCreating}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Tipo</p>
            <div className="grid grid-cols-2 gap-2">
              {DATABASE_VIEW_TYPES.map((t) => {
                const Icon = ICONS[t];
                const isActive = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    disabled={isCreating}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted text-foreground'
                    } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-pressed={isActive}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{DATABASE_VIEW_LABELS[t]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isCreating || !name.trim()}>
            {isCreating ? 'Criando...' : 'Criar view'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDatabaseViewDialog;
