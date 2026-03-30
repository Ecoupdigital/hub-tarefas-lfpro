import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateColumn } from '@/hooks/useCrudMutations';
import { toast } from 'sonner';
import { Plus, X, Star, BarChart3 } from 'lucide-react';
import ColorPalette from '@/components/ui/color-palette';

const COLUMN_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'status', label: 'Status' },
  { value: 'date', label: 'Data' },
  { value: 'people', label: 'Pessoa' },
  { value: 'number', label: 'Número' },
  { value: 'link', label: 'Link' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'long_text', label: 'Texto Longo' },
  { value: 'time_tracking', label: 'Controle de Tempo' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'file', label: 'Arquivo' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'rating', label: 'Avaliação' },
  { value: 'tags', label: 'Tags' },
  { value: 'progress', label: 'Progresso' },
  { value: 'auto_number', label: 'Número Automático' },
  { value: 'creation_log', label: 'Log de Criação' },
  { value: 'last_updated', label: 'Última Atualização' },
  { value: 'formula', label: 'Fórmula' },
];

const STATUS_TEMPLATES = [
  {
    name: 'Básico',
    labels: [
      { id: '1', name: 'A Fazer', color: '#579BFC', isDone: false },
      { id: '2', name: 'Em Progresso', color: '#FDAB3D', isDone: false },
      { id: '3', name: 'Concluído', color: '#00C875', isDone: true },
    ],
  },
  {
    name: 'Prioridade',
    labels: [
      { id: '1', name: 'Baixa', color: '#579BFC', isDone: false },
      { id: '2', name: 'Média', color: '#FDAB3D', isDone: false },
      { id: '3', name: 'Alta', color: '#E2445C', isDone: false },
      { id: '4', name: 'Crítica', color: '#FF158A', isDone: false },
    ],
  },
  {
    name: 'Aprovação',
    labels: [
      { id: '1', name: 'Pendente', color: '#FDAB3D', isDone: false },
      { id: '2', name: 'Aprovado', color: '#00C875', isDone: true },
      { id: '3', name: 'Rejeitado', color: '#E2445C', isDone: false },
    ],
  },
];

const DEFAULT_COLORS = ['#579BFC', '#FDAB3D', '#00C875', '#E2445C', '#A25DDC', '#FF642E', '#C4C4C4', '#037F4C', '#FF158A', '#5559DF'];

interface StatusLabelInput {
  id: string;
  name: string;
  color: string;
  isDone: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
}

const CreateColumnModal: React.FC<Props> = ({ open, onOpenChange, boardId }) => {
  const [title, setTitle] = useState('');
  const [columnType, setColumnType] = useState('text');
  const [statusLabels, setStatusLabels] = useState<StatusLabelInput[]>(STATUS_TEMPLATES[0].labels);
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [newDropdownOpt, setNewDropdownOpt] = useState('');
  const [numberUnit, setNumberUnit] = useState('');
  const [formulaText, setFormulaText] = useState('');
  const [statusError, setStatusError] = useState('');
  const createColumn = useCreateColumn();

  const getSettings = () => {
    if (columnType === 'status') {
      const labels: Record<string, any> = {};
      statusLabels.forEach(l => { labels[l.id] = { name: l.name, color: l.color, isDone: l.isDone }; });
      return { labels };
    }
    if (columnType === 'dropdown') return { options: dropdownOptions };
    if (columnType === 'number' && numberUnit) return { unit: numberUnit };
    if (columnType === 'formula') return { formula: formulaText };
    return {};
  };

  const addStatusLabel = () => {
    const id = String(Date.now());
    const color = DEFAULT_COLORS[statusLabels.length % DEFAULT_COLORS.length];
    setStatusLabels([...statusLabels, { id, name: '', color, isDone: false }]);
  };

  const removeStatusLabel = (id: string) => setStatusLabels(statusLabels.filter(l => l.id !== id));
  const updateStatusLabel = (id: string, field: keyof StatusLabelInput, value: any) =>
    setStatusLabels(statusLabels.map(l => l.id === id ? { ...l, [field]: value } : l));

  const addDropdownOption = () => {
    if (!newDropdownOpt.trim() || dropdownOptions.includes(newDropdownOpt.trim())) return;
    setDropdownOptions([...dropdownOptions, newDropdownOpt.trim()]);
    setNewDropdownOpt('');
  };

  const validate = () => {
    if (columnType === 'status') {
      const filled = statusLabels.filter(l => l.name.trim());
      if (filled.length === 0) {
        setStatusError('Adicione pelo menos 1 label com nome.');
        return false;
      }
    }
    setStatusError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !validate()) return;
    try {
      await createColumn.mutateAsync({ boardId, title: title.trim(), columnType, settings: getSettings() });
      toast.success('Coluna criada!');
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao criar coluna');
    }
  };

  const resetForm = () => {
    setTitle('');
    setColumnType('text');
    setStatusLabels(STATUS_TEMPLATES[0].labels);
    setDropdownOptions([]);
    setNewDropdownOpt('');
    setNumberUnit('');
    setFormulaText('');
    setStatusError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="monday-h4 font-heading">Nova Coluna</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="col-title" className="monday-text2">Título</Label>
            <Input id="col-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome da coluna" autoFocus />
          </div>
          <div>
            <Label className="monday-text2">Tipo</Label>
            <Select value={columnType} onValueChange={setColumnType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COLUMN_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status labels config */}
          {columnType === 'status' && (
            <div className="space-y-3">
              {/* Templates */}
              <div>
                <Label className="font-density-tiny text-muted-foreground">Templates</Label>
                <div className="flex gap-1.5 mt-1">
                  {STATUS_TEMPLATES.map(t => (
                    <Button key={t.name} type="button" variant="outline" size="sm"
                      onClick={() => { setStatusLabels(t.labels); setStatusError(''); }}
                      className="font-density-tiny h-6 px-2">
                      {t.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Label>Labels de Status</Label>
              {statusLabels.map(l => (
                <div key={l.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Input value={l.name} onChange={e => updateStatusLabel(l.id, 'name', e.target.value)}
                      placeholder="Nome do label" className="flex-1 h-8 font-density-cell" />
                    <label className="flex items-center gap-1 font-density-tiny text-muted-foreground whitespace-nowrap">
                      <input type="checkbox" checked={l.isDone} onChange={e => updateStatusLabel(l.id, 'isDone', e.target.checked)} className="w-3 h-3" />
                      Concluído
                    </label>
                    <button type="button" onClick={() => removeStatusLabel(l.id)} className="p-0.5 text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ColorPalette value={l.color} onChange={c => updateStatusLabel(l.id, 'color', c)} size="sm" />
                  {/* Preview badge */}
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
              {statusError && <p className="font-density-tiny text-destructive">{statusError}</p>}
              <Button type="button" variant="outline" size="sm" onClick={addStatusLabel} className="font-density-cell">
                <Plus className="w-3 h-3 mr-1" /> Adicionar label
              </Button>
            </div>
          )}

          {/* Dropdown options config */}
          {columnType === 'dropdown' && (
            <div className="space-y-2">
              <Label>Opções do Dropdown</Label>
              <div className="flex flex-wrap gap-1">
                {dropdownOptions.map(opt => (
                  <span key={opt} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full font-density-cell text-foreground">
                    {opt}
                    <button type="button" onClick={() => setDropdownOptions(dropdownOptions.filter(o => o !== opt))}>
                      <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <Input value={newDropdownOpt} onChange={e => setNewDropdownOpt(e.target.value)}
                  placeholder="Nova opção" className="h-8 font-density-cell"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDropdownOption(); } }} />
                <Button type="button" variant="outline" size="sm" onClick={addDropdownOption} className="h-8">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Number unit */}
          {columnType === 'number' && (
            <div>
              <Label>Unidade (opcional)</Label>
              <Input value={numberUnit} onChange={e => setNumberUnit(e.target.value)}
                placeholder="Ex: R$, %, kg" className="h-8 font-density-cell mt-1" />
            </div>
          )}

          {/* Formula config */}
          {columnType === 'formula' && (
            <div className="space-y-2">
              <Label>Fórmula</Label>
              <Input
                value={formulaText}
                onChange={e => setFormulaText(e.target.value)}
                placeholder='Ex: {Preço} * {Quantidade}'
                className="h-8 font-density-cell font-mono"
              />
              <div className="font-density-tiny text-muted-foreground space-y-0.5">
                <p className="font-medium">Referências: <code className="bg-muted px-1 rounded font-density-tiny">{'{Nome da Coluna}'}</code></p>
                <p>Funções: SUM, AVG, COUNT, MIN, MAX, IF, CONCAT, DAYS_DIFF, TODAY, ROUND, ABS</p>
                <p>Operadores: +, -, *, /, {'>'}, {'<'}, {'>='},{'<='}, ==, !=</p>
                <p>Exemplo: <code className="bg-muted px-1 rounded">IF({'{Valor}'} {'>'} 100, "Alto", "Baixo")</code></p>
              </div>
            </div>
          )}

          {/* Rating preview */}
          {columnType === 'rating' && (
            <div className="flex items-center gap-1 py-1">
              <span className="font-density-tiny text-muted-foreground mr-1">Preview:</span>
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`w-4 h-4 ${i <= 3 ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
              ))}
            </div>
          )}

          {/* Progress preview */}
          {columnType === 'progress' && (
            <div className="flex items-center gap-2 py-1">
              <span className="font-density-tiny text-muted-foreground">Preview:</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[120px]">
                <div className="h-full bg-accent rounded-full" style={{ width: '65%' }} />
              </div>
              <span className="font-density-tiny text-muted-foreground">65%</span>
            </div>
          )}

          {/* Timeline preview */}
          {columnType === 'timeline' && (
            <div className="flex items-center gap-2 py-1">
              <span className="font-density-tiny text-muted-foreground">Preview:</span>
              <div className="flex flex-col gap-0.5">
                <div className="h-2 rounded-full bg-primary/60 w-24" />
                <span className="font-density-tiny text-muted-foreground">01 Jan - 31 Jan</span>
              </div>
            </div>
          )}

          {/* File preview */}
          {columnType === 'file' && (
            <div className="flex items-center gap-2 py-1">
              <span className="font-density-tiny text-muted-foreground">Preview:</span>
              <span className="font-density-tiny text-muted-foreground bg-muted px-2 py-0.5 rounded">Upload de arquivos (clique ou arraste)</span>
            </div>
          )}

          {/* Creation log preview */}
          {columnType === 'creation_log' && (
            <div className="flex items-center gap-2 py-1">
              <span className="font-density-tiny text-muted-foreground">Preview:</span>
              <span className="font-density-tiny text-muted-foreground bg-muted px-2 py-0.5 rounded">Preenchido automaticamente na criação do item</span>
            </div>
          )}

          {/* Last updated preview */}
          {columnType === 'last_updated' && (
            <div className="flex items-center gap-2 py-1">
              <span className="font-density-tiny text-muted-foreground">Preview:</span>
              <span className="font-density-tiny text-muted-foreground bg-muted px-2 py-0.5 rounded">Atualizado automaticamente a cada edição</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!title.trim() || createColumn.isPending}>
              {createColumn.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateColumnModal;
