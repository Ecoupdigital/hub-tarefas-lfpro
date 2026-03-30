import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateGroup } from '@/hooks/useCrudMutations';
import { toast } from 'sonner';

const COLORS = ['#579BFC', '#00C875', '#FDAB3D', '#E2445C', '#A25DDC', '#037F4C', '#FF158A', '#CAB641'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
}

const CreateGroupModal: React.FC<Props> = ({ open, onOpenChange, boardId }) => {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#579BFC');
  const createGroup = useCreateGroup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createGroup.mutateAsync({ boardId, title: title.trim(), color });
      toast.success('Grupo criado!');
      setTitle('');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao criar grupo');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Novo Grupo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="group-title">Título</Label>
            <Input id="group-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Novo Grupo" autoFocus />
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 mt-1">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  aria-label={`Cor ${c}`} title={c}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!title.trim() || createGroup.isPending}>
              {createGroup.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;
