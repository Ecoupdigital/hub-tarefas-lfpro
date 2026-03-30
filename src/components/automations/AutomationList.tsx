import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  useAutomations, useUpdateAutomation, useDeleteAutomation,
  type AutomationRow,
} from '@/hooks/useAutomations';
import AutomationBuilder from './AutomationBuilder';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Zap, Trash2, Pencil, Plus } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TRIGGER_LABELS: Record<string, string> = {
  status_change: 'Status muda',
  item_created: 'Item e criado',
  date_arrived: 'Data chega',
  column_change: 'Coluna muda',
};

const ACTION_LABELS: Record<string, string> = {
  change_status: 'Mudar status',
  assign_person: 'Atribuir pessoa',
  move_to_group: 'Mover para grupo',
  send_notification: 'Enviar notificacao',
  create_subitem: 'Criar subitem',
};

function describeTrigger(a: AutomationRow): string {
  const base = TRIGGER_LABELS[a.trigger_type] || a.trigger_type;
  const config = a.trigger_config as any;
  if (a.trigger_type === 'status_change' && config?.statusName) {
    return `${base} para "${config.statusName}"`;
  }
  if ((a.trigger_type === 'column_change' || a.trigger_type === 'date_arrived') && config?.columnTitle) {
    return `${base} (${config.columnTitle})`;
  }
  return base;
}

function describeAction(a: AutomationRow): string {
  const base = ACTION_LABELS[a.action_type] || a.action_type;
  const config = a.action_config as any;
  if (a.action_type === 'change_status' && config?.statusName) {
    return `${base} para "${config.statusName}"`;
  }
  if (a.action_type === 'assign_person' && config?.personName) {
    return `${base} "${config.personName}"`;
  }
  if (a.action_type === 'move_to_group' && config?.groupTitle) {
    return `${base} "${config.groupTitle}"`;
  }
  if (a.action_type === 'send_notification' && config?.message) {
    return `${base}: "${config.message.slice(0, 30)}${config.message.length > 30 ? '...' : ''}"`;
  }
  if (a.action_type === 'create_subitem' && config?.subitemName) {
    return `${base} "${config.subitemName}"`;
  }
  return base;
}

const AutomationList: React.FC = () => {
  const { activeBoard } = useApp();
  const { data: automations = [], isLoading } = useAutomations(activeBoard?.id ?? null);
  const updateAutomation = useUpdateAutomation();
  const deleteAutomation = useDeleteAutomation();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleToggleActive = (automation: AutomationRow) => {
    updateAutomation.mutate({ id: automation.id, isActive: !automation.is_active });
  };

  const handleEdit = (automation: AutomationRow) => {
    setEditingAutomation(automation);
    setBuilderOpen(true);
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteAutomation.mutate(deletingId);
      setDeletingId(null);
    }
  };

  const handleNewAutomation = () => {
    setEditingAutomation(null);
    setBuilderOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="font-density-cell font-medium text-foreground">
            {automations.length} automacao{automations.length !== 1 ? 'es' : ''}
          </span>
        </div>
        <Button size="sm" variant="default" onClick={handleNewAutomation} className="h-7 text-xs gap-1">
          <Plus className="w-3.5 h-3.5" /> Nova automacao
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 font-density-cell text-muted-foreground">
          Carregando...
        </div>
      ) : automations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Zap className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="font-density-cell text-muted-foreground font-medium mb-1">Nenhuma automacao configurada</p>
          <p className="font-density-cell text-muted-foreground mb-4">
            Crie automacoes para agilizar seu fluxo de trabalho
          </p>
          <Button size="sm" variant="outline" onClick={handleNewAutomation} className="text-xs gap-1">
            <Plus className="w-3.5 h-3.5" /> Criar primeira automacao
          </Button>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1">
          {automations.map(automation => (
            <div
              key={automation.id}
              className={`rounded-lg border p-3 transition-colors ${
                automation.is_active
                  ? 'border-border bg-card'
                  : 'border-border/50 bg-muted/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-density-cell font-medium text-foreground truncate">{automation.name}</p>
                </div>
                <Switch
                  checked={automation.is_active}
                  onCheckedChange={() => handleToggleActive(automation)}
                  className="flex-shrink-0"
                />
              </div>

              <div className="space-y-1 mb-2">
                <p className="font-density-cell text-muted-foreground">
                  <span className="font-medium text-primary">Quando:</span>{' '}
                  {describeTrigger(automation)}
                </p>
                <p className="font-density-cell text-muted-foreground">
                  <span className="font-medium text-green-600">Entao:</span>{' '}
                  {describeAction(automation)}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-density-tiny text-muted-foreground">
                  {automation.run_count > 0
                    ? `Executada ${automation.run_count}x`
                    : 'Nunca executada'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(automation)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingId(automation.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Builder dialog */}
      <AutomationBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        editingAutomation={editingAutomation}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir automacao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta automacao? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AutomationList;
