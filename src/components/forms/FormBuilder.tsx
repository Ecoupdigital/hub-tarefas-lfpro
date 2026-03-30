import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useBoardForms, useCreateBoardForm, useUpdateBoardForm, useDeleteBoardForm } from '@/hooks/useBoardForms';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, ExternalLink, GripVertical, Copy, Pencil, Check, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';

interface FormBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Converte uma string para slug URL-friendly (sem acentos, lowercase, hifens).
 */
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const FormBuilder: React.FC<FormBuilderProps> = ({ open, onOpenChange }) => {
  const { activeBoard, columns } = useApp();
  const boardId = activeBoard?.id ?? null;
  const { data: forms = [] } = useBoardForms(boardId);
  const createForm = useCreateBoardForm();
  const updateForm = useUpdateBoardForm();
  const deleteForm = useDeleteBoardForm();

  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Form editor state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Validação de slug
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allColumns = activeBoard?.columns ?? [];
  const groups = activeBoard?.groups ?? [];

  // Auto-gerar slug quando o título muda (apenas se slug está vazio ou igual ao slug auto-gerado anterior)
  useEffect(() => {
    if (!editing) {
      setSlug(toSlug(title));
    }
  }, [title, editing]);

  // Validar unicidade do slug com debounce de 400ms
  useEffect(() => {
    if (!slug) {
      setSlugStatus('idle');
      return;
    }
    // Se editando, ignorar o próprio slug atual
    if (editing && (editing as Record<string, unknown>).slug === slug) {
      setSlugStatus('available');
      return;
    }
    setSlugStatus('checking');
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    slugDebounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('board_forms')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      setSlugStatus(data ? 'taken' : 'available');
    }, 400);
    return () => {
      if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    };
  }, [slug, editing]);

  const resetEditor = () => {
    setTitle('');
    setDescription('');
    setSlug('');
    setTargetGroupId(groups[0]?.id || '');
    setSelectedColumns([]);
    setIsActive(true);
    setEditing(null);
    setSlugStatus('idle');
  };

  const openNewForm = () => {
    resetEditor();
    setTargetGroupId(groups[0]?.id || '');
    setShowEditor(true);
  };

  const openEditForm = (form: Record<string, unknown>) => {
    setEditing(form);
    setTitle(form.title as string || '');
    setDescription(form.description as string || '');
    setSlug(form.slug as string || '');
    setTargetGroupId(form.target_group_id as string || groups[0]?.id || '');
    setSelectedColumns((form.column_ids as string[]) || []);
    setIsActive(form.is_active as boolean);
    setSlugStatus('available');
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !slug.trim() || !targetGroupId || !boardId) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }
    if (slugStatus === 'taken') {
      toast.error('Este slug ja esta em uso. Escolha outro.');
      return;
    }

    try {
      if (editing) {
        await updateForm.mutateAsync({
          id: editing.id as string,
          title: title.trim(),
          description: description.trim() || undefined,
          slug: slug.trim(),
          targetGroupId,
          columnIds: selectedColumns,
          isActive,
        });
        toast.success('Formulario atualizado');
      } else {
        await createForm.mutateAsync({
          boardId,
          title: title.trim(),
          description: description.trim() || undefined,
          slug: slug.trim(),
          targetGroupId,
          columnIds: selectedColumns,
        });
        toast.success('Formulario criado');
      }
      setShowEditor(false);
      resetEditor();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar formulario';
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteForm.mutateAsync(id);
      toast.success('Formulario excluido');
    } catch {
      toast.error('Erro ao excluir formulario');
    }
  };

  const handleToggleActive = async (form: Record<string, unknown>) => {
    try {
      await updateForm.mutateAsync({ id: form.id as string, isActive: !(form.is_active as boolean) });
    } catch {
      toast.error('Erro ao atualizar formulario');
    }
  };

  const toggleColumn = (colId: string) => {
    setSelectedColumns(prev =>
      prev.includes(colId)
        ? prev.filter(c => c !== colId)
        : [...prev, colId]
    );
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newCols = [...selectedColumns];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newCols.length) return;
    [newCols[index], newCols[newIndex]] = [newCols[newIndex], newCols[index]];
    setSelectedColumns(newCols);
  };

  const copyFormUrl = (formSlug: string) => {
    const url = `${window.location.origin}/form/${formSlug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  if (!activeBoard) return null;

  const canSave = title.trim() && slug.trim() && targetGroupId && slugStatus !== 'taken' && slugStatus !== 'checking';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Formularios Publicos</DialogTitle>
        </DialogHeader>

        {!showEditor ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Crie formularios publicos para receber respostas diretamente no seu board.
            </p>

            {forms.length > 0 ? (
              <div className="space-y-2">
                {(forms as Record<string, unknown>[]).map(form => (
                  <div key={form.id as string} className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{form.title as string}</span>
                        <span className={`font-density-tiny px-1.5 py-0.5 rounded-full ${form.is_active ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                          {form.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <p className="font-density-cell text-muted-foreground truncate mt-0.5">
                        /form/{form.slug as string}
                      </p>
                    </div>
                    {/* Toggle ativo/inativo na listagem (AC 6) */}
                    <Switch
                      checked={form.is_active as boolean}
                      onCheckedChange={() => handleToggleActive(form)}
                      title={form.is_active ? 'Desativar' : 'Ativar'}
                    />
                    <button
                      onClick={() => copyFormUrl(form.slug as string)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Copiar link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={`/form/${form.slug as string}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Abrir formulario"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => openEditForm(form)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(form.id as string)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum formulario criado ainda.
              </div>
            )}

            <button
              onClick={openNewForm}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Criar formulario
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="form-title">Titulo *</Label>
              <Input
                id="form-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Formulario de solicitacao"
                className="mt-1"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="form-desc">Descricao</Label>
              <Textarea
                id="form-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descricao opcional do formulario..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="form-slug">Slug da URL *</Label>
              <div className="flex items-center gap-1 mt-1">
                <span className="font-density-cell text-muted-foreground">/form/</span>
                <div className="relative flex-1">
                  <Input
                    id="form-slug"
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="meu-formulario"
                    className={`pr-7 ${slugStatus === 'taken' ? 'border-destructive' : slugStatus === 'available' ? 'border-green-500' : ''}`}
                  />
                  {slugStatus === 'available' && (
                    <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                  {slugStatus === 'taken' && (
                    <XIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                  )}
                </div>
              </div>
              {slugStatus === 'taken' && (
                <p className="text-xs text-destructive mt-1">Este slug ja esta em uso. Escolha outro.</p>
              )}
            </div>

            <div>
              <Label>Grupo de destino *</Label>
              <Select value={targetGroupId} onValueChange={setTargetGroupId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: g.color }} />
                        {g.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Campos do formulario</Label>
              <p className="font-density-cell text-muted-foreground mb-2">
                Selecione quais colunas aparecerao como campos no formulario.
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
                {allColumns.map(col => (
                  <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col.id)}
                      onChange={() => toggleColumn(col.id)}
                      className="w-4 h-4 rounded-[3px]"
                    />
                    <span className="text-sm">{col.title}</span>
                    <span className="font-density-tiny text-muted-foreground ml-auto">{col.type}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedColumns.length > 0 && (
              <div>
                <Label>Ordem dos campos</Label>
                <div className="space-y-1 mt-1">
                  {selectedColumns.map((colId, idx) => {
                    const col = allColumns.find(c => c.id === colId);
                    if (!col) return null;
                    return (
                      <div key={colId} className="flex items-center gap-2 px-2 py-1 rounded bg-muted/50 text-sm">
                        <GripVertical className="w-3 h-3 text-muted-foreground" />
                        <span className="flex-1">{col.title}</span>
                        <button
                          onClick={() => moveColumn(idx, 'up')}
                          disabled={idx === 0}
                          className="font-density-tiny px-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          &#9650;
                        </button>
                        <button
                          onClick={() => moveColumn(idx, 'down')}
                          disabled={idx === selectedColumns.length - 1}
                          className="font-density-tiny px-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          &#9660;
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {editing && (
              <div className="flex items-center justify-between">
                <Label htmlFor="form-active">Formulario ativo</Label>
                <Switch
                  id="form-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => { setShowEditor(false); resetEditor(); }}
                className="flex-1 px-4 py-2 rounded-md text-sm border border-border hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave || createForm.isPending || updateForm.isPending}
                className="flex-1 px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:opacity-50"
              >
                {editing ? 'Salvar' : 'Criar formulario'}
              </button>
            </div>

            {slug && (
              <div className="text-center">
                <a
                  href={`/form/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-density-cell text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Visualizar formulario
                </a>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FormBuilder;
