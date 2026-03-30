import React, { useState } from 'react';
import { Webhook, Plus, Trash2, Pencil, Play, X, ToggleLeft, ToggleRight, Clock } from 'lucide-react';
import {
  useIntegrations,
  useCreateIntegration,
  useUpdateIntegration,
  useDeleteIntegration,
  useToggleIntegration,
  WebhookConfig,
  Integration,
} from '@/hooks/useIntegrations';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AVAILABLE_EVENTS = [
  { key: 'item_created', label: 'Item criado' },
  { key: 'status_changed', label: 'Status alterado' },
  { key: 'item_completed', label: 'Item concluido' },
];

interface WebhookManagerProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WebhookManager: React.FC<WebhookManagerProps> = ({ workspaceId, open, onOpenChange }) => {
  const { data: integrations = [], isLoading } = useIntegrations(workspaceId);
  const createIntegration = useCreateIntegration();
  const updateIntegration = useUpdateIntegration();
  const deleteIntegration = useDeleteIntegration();
  const toggleIntegration = useToggleIntegration();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const resetForm = () => {
    setFormName('');
    setFormUrl('');
    setFormEvents([]);
    setEditingId(null);
    setShowForm(false);
  };

  const openEditForm = (integration: Integration) => {
    setEditingId(integration.id);
    setFormName(integration.config.name || '');
    setFormUrl(integration.config.url || '');
    setFormEvents(integration.config.events || []);
    setShowForm(true);
  };

  const toggleEvent = (event: string) => {
    setFormEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formUrl.trim() || formEvents.length === 0) {
      toast.error('Preencha todos os campos e selecione ao menos um evento.');
      return;
    }

    // Basic URL validation
    try {
      new URL(formUrl);
    } catch {
      toast.error('URL invalida. Use um formato como https://example.com/webhook');
      return;
    }

    const config: WebhookConfig = {
      name: formName.trim(),
      url: formUrl.trim(),
      events: formEvents,
    };

    try {
      if (editingId) {
        // Preserve last_triggered_at from existing integration
        const existing = integrations.find(i => i.id === editingId);
        if (existing?.config.last_triggered_at) {
          config.last_triggered_at = existing.config.last_triggered_at;
        }
        await updateIntegration.mutateAsync({ id: editingId, config });
        toast.success('Webhook atualizado');
      } else {
        await createIntegration.mutateAsync({ workspaceId, config });
        toast.success('Webhook criado');
      }
      resetForm();
    } catch {
      toast.error('Erro ao salvar webhook');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteIntegration.mutateAsync(deleteId);
      toast.success('Webhook excluido');
      setDeleteId(null);
    } catch {
      toast.error('Erro ao excluir webhook');
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await toggleIntegration.mutateAsync({ id, isActive: !currentActive });
      toast.success(!currentActive ? 'Webhook ativado' : 'Webhook desativado');
    } catch {
      toast.error('Erro ao alterar status do webhook');
    }
  };

  const handleTest = async (integration: Integration) => {
    setTestingId(integration.id);
    try {
      const payload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        workspace_id: workspaceId,
        data: {
          message: 'Teste de webhook do LFPro Tasks',
          webhook_name: integration.config.name,
        },
      };

      const response = await fetch(integration.config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });

      // Update last_triggered_at
      const updatedConfig: WebhookConfig = {
        ...integration.config,
        last_triggered_at: new Date().toISOString(),
      };
      await updateIntegration.mutateAsync({ id: integration.id, config: updatedConfig });

      toast.success('Payload de teste enviado com sucesso');
    } catch {
      toast.error('Erro ao enviar teste. Verifique a URL.');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-primary" />
              Integracoes - Webhooks
            </DialogTitle>
            <DialogDescription>
              Configure webhooks para receber notificacoes quando eventos acontecerem no workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 mt-2">
            {/* Add button */}
            {!showForm && (
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md font-density-cell bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors w-full justify-center"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Webhook
              </button>
            )}

            {/* Create/Edit form */}
            {showForm && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-3 border border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-density-cell font-semibold text-foreground">
                    {editingId ? 'Editar Webhook' : 'Novo Webhook'}
                  </h3>
                  <button onClick={resetForm} className="p-0.5 rounded hover:bg-muted text-muted-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="font-density-tiny text-muted-foreground font-medium block mb-1">Nome</label>
                  <Input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Ex: Notificacao Slack"
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="font-density-tiny text-muted-foreground font-medium block mb-1">URL do Webhook</label>
                  <Input
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    placeholder="https://example.com/webhook"
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="font-density-tiny text-muted-foreground font-medium block mb-1">Eventos</label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_EVENTS.map(evt => (
                      <button
                        key={evt.key}
                        onClick={() => toggleEvent(evt.key)}
                        className={`px-2.5 py-1 rounded font-density-tiny font-medium transition-colors border ${
                          formEvents.includes(evt.key)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                        }`}
                      >
                        {evt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={createIntegration.isPending || updateIntegration.isPending}
                    className="flex-1 px-3 py-1.5 rounded-md font-density-cell bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:opacity-50"
                  >
                    {editingId ? 'Salvar' : 'Criar'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-3 py-1.5 rounded-md font-density-cell bg-muted text-foreground hover:bg-muted/80 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            {isLoading ? (
              <div className="font-density-cell text-muted-foreground text-center py-4">Carregando...</div>
            ) : integrations.length === 0 && !showForm ? (
              <div className="text-center py-8">
                <Webhook className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="font-density-cell text-muted-foreground">Nenhum webhook configurado.</p>
                <p className="font-density-tiny text-muted-foreground/60 mt-1">
                  Crie um webhook para integrar com servicos externos.
                </p>
              </div>
            ) : (
              integrations.map(integration => (
                <div
                  key={integration.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    integration.is_active
                      ? 'border-border bg-card'
                      : 'border-border/50 bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Webhook className="w-3.5 h-3.5 text-primary" />
                      <span className="font-density-cell font-semibold text-foreground">{integration.config.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={integration.is_active}
                        onCheckedChange={() => handleToggle(integration.id, integration.is_active)}
                        className="scale-75"
                      />
                    </div>
                  </div>

                  <p className="font-density-tiny text-muted-foreground truncate mb-1.5" title={integration.config.url}>
                    {integration.config.url}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {(integration.config.events || []).map(evt => {
                      const label = AVAILABLE_EVENTS.find(e => e.key === evt)?.label || evt;
                      return (
                        <span key={evt} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-density-badge font-medium">
                          {label}
                        </span>
                      );
                    })}
                  </div>

                  {integration.config.last_triggered_at && (
                    <div className="flex items-center gap-1 font-density-badge text-muted-foreground mb-2">
                      <Clock className="w-2.5 h-2.5" />
                      Ultimo disparo:{' '}
                      {(() => {
                        try {
                          return format(parseISO(integration.config.last_triggered_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
                        } catch {
                          return '—';
                        }
                      })()}
                    </div>
                  )}

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleTest(integration)}
                      disabled={testingId === integration.id}
                      className="flex items-center gap-1 px-2 py-1 rounded font-density-tiny font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors disabled:opacity-50"
                    >
                      <Play className="w-2.5 h-2.5" />
                      {testingId === integration.id ? 'Enviando...' : 'Testar'}
                    </button>
                    <button
                      onClick={() => openEditForm(integration)}
                      className="flex items-center gap-1 px-2 py-1 rounded font-density-tiny font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
                    >
                      <Pencil className="w-2.5 h-2.5" /> Editar
                    </button>
                    <button
                      onClick={() => setDeleteId(integration.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded font-density-tiny font-medium bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir webhook?</AlertDialogTitle>
            <AlertDialogDescription>Esta acao nao pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default WebhookManager;
