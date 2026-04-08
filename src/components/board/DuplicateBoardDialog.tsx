import React, { useState } from 'react';
import { Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useDuplicateBoardWithOptions } from '@/hooks/useCrudMutations';

interface DuplicateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  boardName: string;
  workspaceId: string;
}

type DuplicateMode = 'structure' | 'with_data' | 'with_updates';

const MODES: Array<{ value: DuplicateMode; label: string; description: string }> = [
  {
    value: 'structure',
    label: 'Somente estrutura',
    description: 'Grupos e colunas vazios',
  },
  {
    value: 'with_data',
    label: 'Estrutura + dados',
    description: 'Inclui items, subitems e valores',
  },
  {
    value: 'with_updates',
    label: 'Tudo',
    description: 'Inclui comentarios e anexos',
  },
];

const DuplicateBoardDialog: React.FC<DuplicateBoardDialogProps> = ({
  open,
  onOpenChange,
  boardId,
  boardName,
  workspaceId,
}) => {
  const [name, setName] = useState(`${boardName} (copia)`);
  const [mode, setMode] = useState<DuplicateMode>('structure');
  const duplicateMutation = useDuplicateBoardWithOptions();

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setName(`${boardName} (copia)`);
      setMode('structure');
    }
  }, [open, boardName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('O nome do board nao pode estar vazio.');
      return;
    }

    try {
      await duplicateMutation.mutateAsync({
        boardId,
        mode,
        name: name.trim(),
      });
      toast.success('Board duplicado com sucesso.');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao duplicar board. Tente novamente.');
    }
  };

  const isSubmitting = duplicateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-4 h-4" />
              Duplicar board
            </DialogTitle>
            <DialogDescription>
              Escolha o nome e o que incluir na copia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Board name field */}
            <div className="space-y-2">
              <Label htmlFor="dup-board-name" className="text-sm font-medium">
                Nome do board
              </Label>
              <Input
                id="dup-board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do novo board"
                disabled={isSubmitting}
                autoFocus
                maxLength={100}
              />
            </div>

            {/* Mode selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">O que duplicar</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as DuplicateMode)}
                disabled={isSubmitting}
                className="space-y-2"
              >
                {MODES.map((m) => (
                  <label
                    key={m.value}
                    htmlFor={`dup-mode-${m.value}`}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-accent/30 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                  >
                    <RadioGroupItem
                      value={m.value}
                      id={`dup-mode-${m.value}`}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium leading-none">
                        {m.label}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {m.description}
                      </p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Duplicando...
                </>
              ) : (
                'Duplicar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateBoardDialog;
