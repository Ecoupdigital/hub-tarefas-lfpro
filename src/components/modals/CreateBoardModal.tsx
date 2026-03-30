import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateBoard } from '@/hooks/useCrudMutations';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { defaultTemplates, BoardTemplate } from '@/data/boardTemplates';
import { useWorkspaceTemplates } from '@/hooks/useTemplates';
import { applyTemplate } from '@/utils/applyTemplate';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  preselectedTemplate?: BoardTemplate | null;
}

const CreateBoardModal: React.FC<Props> = ({ open, onOpenChange, workspaceId, preselectedTemplate }) => {
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate>(
    defaultTemplates.find(t => t.id === 'blank')!
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createBoard = useCreateBoard();
  const navigate = useNavigate();
  const { data: dbTemplates = [] } = useWorkspaceTemplates(workspaceId);

  // Mesclar templates locais (sistema) com templates do workspace (DB)
  const allTemplates: BoardTemplate[] = [
    ...defaultTemplates,
    ...(dbTemplates as { id: string; name: string; description?: string; category?: string; icon?: string; config?: Record<string, unknown> }[]).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      category: t.category || 'Customizado',
      icon: t.icon || '📋',
      // Deep clone do config do DB para isolar referências
      groups: structuredClone((t.config?.groups as unknown[]) || []),
      columns: structuredClone((t.config?.columns as unknown[]) || []),
    })),
  ];

  // Handle pre-selected template from TemplateCenter
  useEffect(() => {
    if (open && preselectedTemplate) {
      setSelectedTemplate(preselectedTemplate);
      setName(preselectedTemplate.id !== 'blank' ? preselectedTemplate.name : '');
      setDescription(
        preselectedTemplate.description !== 'Comece do zero com um board vazio'
          ? preselectedTemplate.description
          : ''
      );
      setStep('details');
    }
  }, [open, preselectedTemplate]);

  const resetState = () => {
    setStep('template');
    setSelectedTemplate(defaultTemplates.find(t => t.id === 'blank')!);
    setName('');
    setDescription('');
    setIsCreating(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const handleSelectTemplate = (template: BoardTemplate) => {
    setSelectedTemplate(template);
  };

  const handleNext = () => {
    setName(selectedTemplate.id !== 'blank' ? selectedTemplate.name : '');
    setDescription(selectedTemplate.description !== 'Comece do zero com um board vazio' ? selectedTemplate.description : '');
    setStep('details');
  };

  const handleBack = () => {
    setStep('template');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      // 1. Criar o board
      const board = await createBoard.mutateAsync({
        workspaceId,
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // 2. Aplicar template (grupos, colunas e itens de exemplo) se não for blank
      if (selectedTemplate.id !== 'blank') {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id ?? '';
        // applyTemplate faz deep clone internamente — editar o board não altera o template
        await applyTemplate({ boardId: board.id, template: selectedTemplate, userId });
      }

      toast.success('Board criado com sucesso!');
      resetState();
      onOpenChange(false);
      navigate(`/board/${board.id}`);
    } catch {
      toast.error('Erro ao criar board');
      setIsCreating(false);
    }
  };

  // Agrupar templates por categoria
  const categories = Array.from(new Set(allTemplates.map(t => t.category)));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="monday-h4 font-heading">
            {step === 'template' ? 'Escolha um Template' : 'Configurar Board'}
          </DialogTitle>
        </DialogHeader>

        {step === 'template' ? (
          <>
            <div className="flex-1 overflow-y-auto pr-1 -mr-1">
              {categories.map(category => {
                const templates = allTemplates.filter(t => t.category === category);
                return (
                  <div key={category} className="mb-4">
                    <h3 className="font-density-cell font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {category}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {templates.map(template => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleSelectTemplate(template)}
                          className={`
                            text-left p-4 rounded-lg border-2 transition-all
                            hover:border-primary/50 hover:bg-accent/50
                            ${selectedTemplate.id === template.id
                              ? 'border-primary ring-2 ring-primary bg-accent/50'
                              : 'border-border'
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl flex-shrink-0">{template.icon}</span>
                            <div className="min-w-0">
                              <div className="font-medium text-sm">{template.name}</div>
                              <div className="font-density-cell text-muted-foreground mt-0.5 line-clamp-2">
                                {template.description}
                              </div>
                              <span className="inline-block mt-1.5 font-density-tiny font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {template.category}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleNext}>
                Continuar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 border">
              <span className="text-2xl">{selectedTemplate.icon}</span>
              <div>
                <div className="font-medium text-sm">{selectedTemplate.name}</div>
                <div className="font-density-cell text-muted-foreground">{selectedTemplate.description}</div>
              </div>
            </div>
            <div>
              <Label htmlFor="board-name" className="monday-text2">Nome</Label>
              <Input
                id="board-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Meu Board"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="board-desc" className="monday-text2">Descricao (opcional)</Label>
              <Textarea
                id="board-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descreva este board..."
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleBack}>
                Voltar
              </Button>
              <Button type="submit" disabled={!name.trim() || isCreating}>
                {isCreating ? 'Criando...' : 'Criar Board'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateBoardModal;
