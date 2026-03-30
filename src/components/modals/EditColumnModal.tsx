import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateColumn, useDeleteColumn, useCreateColumn } from '@/hooks/useCrudMutations';
import { toast } from 'sonner';
import { Plus, X, Trash2, Copy } from 'lucide-react';
import ColorPalette from '@/components/ui/color-palette';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface StatusLabelInput {
  id: string;
  name: string;
  color: string;
  isDone: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column: { id: string; title: string; type: string; settings: any; boardId?: string } | null;
}

const EditColumnModal: React.FC<Props> = ({ open, onOpenChange, column }) => {
  const [title, setTitle] = useState('');
  const [statusLabels, setStatusLabels] = useState<StatusLabelInput[]>([]);
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [newDropdownOpt, setNewDropdownOpt] = useState('');
  const [numberUnit, setNumberUnit] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  const createColumn = useCreateColumn();

  useEffect(() => {
    if (!column) return;
    setTitle(column.title);
    if (column.type === 'status' && column.settings?.labels) {
      setStatusLabels(Object.entries(column.settings.labels).map(([id, l]: [string, any]) => ({
        id, name: l.name, color: l.color, isDone: l.isDone || false,
      })));
    } else {
      setStatusLabels([]);
    }
    if (column.type === 'dropdown') setDropdownOptions(column.settings?.options || []);
    if (column.type === 'number') setNumberUnit(column.settings?.unit || '');
  }, [column]);

  if (!column) return null;

  const getSettings = () => {
    if (column.type === 'status') {
      const labels: Record<string, any> = {};
      statusLabels.forEach(l => { labels[l.id] = { name: l.name, color: l.color, isDone: l.isDone }; });
      return { labels };
    }
    if (column.type === 'dropdown') return { options: dropdownOptions };
    if (column.type === 'number' && numberUnit) return { unit: numberUnit };
    return column.settings || {};
  };

  const addStatusLabel = () => {
    const id = String(Date.now());
    const colors = ['#579BFC', '#FDAB3D', '#00C875', '#E2445C', '#A25DDC', '#FF642E', '#C4C4C4', '#037F4C', '#FF158A', '#5559DF'];
    const color = colors[statusLabels.length % colors.length];
    setStatusLabels([...statusLabels, { id, name: '', color, isDone: false }]);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      await updateColumn.mutateAsync({ id: column.id, title: title.trim(), settings: getSettings() });
      toast.success('Coluna atualizada!');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar coluna');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteColumn.mutateAsync(column.id);
      toast.success('Coluna excluída!');
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch {
      toast.error('Erro ao excluir coluna');
    }
  };

  const handleDuplicate = async () => {
    if (!column.boardId) { toast.error('Board ID não encontrado'); return; }
    try {
      await createColumn.mutateAsync({
        boardId: column.boardId,
        title: `${column.title} (cópia)`,
        columnType: column.type,
        settings: getSettings(),
      });
      toast.success('Coluna duplicada!');
    } catch {
      toast.error('Erro ao duplicar coluna');
    }
  };

  const addDropdownOption = () => {
    if (!newDropdownOpt.trim() || dropdownOptions.includes(newDropdownOpt.trim())) return;
    setDropdownOptions([...dropdownOptions, newDropdownOpt.trim()]);
    setNewDropdownOpt('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="monday-h4 flex items-center justify-between">
              Editar Coluna
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleDuplicate} className="h-7 px-2 text-muted-foreground hover:text-foreground">
                  <Copy className="w-3.5 h-3.5 mr-1" /> Duplicar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-destructive hover:text-destructive h-7 px-2">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="monday-text2">Título</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="monday-text2">Tipo</Label>
              <p className="font-density-cell text-muted-foreground mt-1 capitalize">{column.type.replace('_', ' ')}</p>
            </div>

            {column.type === 'status' && (
              <div className="space-y-3">
                <Label>Labels de Status</Label>
                {statusLabels.map(l => (
                  <div key={l.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input value={l.name} onChange={e => setStatusLabels(statusLabels.map(s => s.id === l.id ? { ...s, name: e.target.value } : s))}
                        placeholder="Nome" className="flex-1 h-8 text-xs" />
                      <label className="flex items-center gap-1 font-density-tiny text-muted-foreground whitespace-nowrap">
                        <input type="checkbox" checked={l.isDone} onChange={e => setStatusLabels(statusLabels.map(s => s.id === l.id ? { ...s, isDone: e.target.checked } : s))} className="w-3 h-3" />
                        Done
                      </label>
                      <button type="button" onClick={() => setStatusLabels(statusLabels.filter(s => s.id !== l.id))} className="p-0.5 text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <ColorPalette value={l.color} onChange={c => setStatusLabels(statusLabels.map(s => s.id === l.id ? { ...s, color: c } : s))} size="sm" />
                    {l.name && (
                      <div className="flex items-center gap-1">
                        <span className="font-density-badge text-muted-foreground">Preview:</span>
                        <span className="inline-block px-2.5 py-0.5 rounded font-density-tiny font-medium text-white" style={{ backgroundColor: l.color }}>
                          {l.name}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addStatusLabel} className="text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Adicionar label
                </Button>
              </div>
            )}

            {column.type === 'dropdown' && (
              <div className="space-y-2">
                <Label>Opções</Label>
                <div className="flex flex-wrap gap-1">
                  {dropdownOptions.map(opt => (
                    <span key={opt} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full font-density-cell">
                      {opt}
                      <button onClick={() => setDropdownOptions(dropdownOptions.filter(o => o !== opt))}>
                        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Input value={newDropdownOpt} onChange={e => setNewDropdownOpt(e.target.value)}
                    placeholder="Nova opção" className="h-8 text-xs"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDropdownOption(); } }} />
                  <Button type="button" variant="outline" size="sm" onClick={addDropdownOption} className="h-8">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {column.type === 'number' && (
              <div>
                <Label>Unidade</Label>
                <Input value={numberUnit} onChange={e => setNumberUnit(e.target.value)} placeholder="Ex: R$, %, kg" className="h-8 text-xs mt-1" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!title.trim() || updateColumn.isPending}>
              {updateColumn.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir coluna?</AlertDialogTitle>
            <AlertDialogDescription>A coluna "{column.title}" e todos seus valores serão excluídos permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditColumnModal;
