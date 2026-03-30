import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateWorkspace } from '@/hooks/useCrudMutations';
import { toast } from 'sonner';

const ICONS = ['📁', '🏢', '🚀', '💼', '🎯', '📊', '🔧', '🌱'];
const COLORS = ['#6161FF', '#579BFC', '#00C875', '#FDAB3D', '#E2445C', '#A25DDC', '#037F4C', '#FF158A'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateWorkspaceModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState('#6161FF');
  const createWorkspace = useCreateWorkspace();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createWorkspace.mutateAsync({ name: name.trim(), icon, color });
      toast.success('Workspace criado!');
      setName('');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao criar workspace');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Novo Workspace</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="ws-name">Nome</Label>
            <Input id="ws-name" value={name} onChange={e => setName(e.target.value)} placeholder="Meu Workspace" autoFocus />
          </div>
          <div>
            <Label>Ícone</Label>
            <div className="flex gap-2 mt-1">
              {ICONS.map(i => (
                <button key={i} type="button" onClick={() => setIcon(i)}
                  className={`w-8 h-8 rounded-md flex items-center justify-center text-lg border transition-colors ${icon === i ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
                  {i}
                </button>
              ))}
            </div>
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
            <Button type="submit" disabled={!name.trim() || createWorkspace.isPending}>
              {createWorkspace.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkspaceModal;
