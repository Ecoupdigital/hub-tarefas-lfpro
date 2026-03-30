import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useProfiles } from '@/hooks/useSupabaseData';
import { useCreateAutomation, useUpdateAutomation, type AutomationRow } from '@/hooks/useAutomations';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Zap, ArrowRight, Plus, X, Trash2 } from 'lucide-react';
import ConditionBuilder, { type ConditionGroup } from './ConditionBuilder';
import type { AutomationRecipe } from '@/hooks/useAutomationRecipes';

export interface ActionItem {
  id: string;
  action_type: string;
  action_config: any;
}

interface AutomationBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAutomation?: AutomationRow | null;
  prefillRecipe?: AutomationRecipe | null;
}

const TRIGGER_OPTIONS = [
  { value: 'status_change', label: 'Status muda para...' },
  { value: 'item_created', label: 'Item e criado' },
  { value: 'date_arrived', label: 'Data chega (hoje)' },
  { value: 'column_change', label: 'Coluna muda de valor' },
];

const ACTION_OPTIONS = [
  { value: 'set_column_value', label: 'Definir valor de coluna' },
  { value: 'notify_assignee', label: 'Notificar responsavel' },
  { value: 'move_to_group', label: 'Mover para grupo' },
  { value: 'create_subitem', label: 'Criar subitem' },
  { value: 'send_webhook', label: 'Enviar webhook' },
  { value: 'duplicate_to_group', label: 'Duplicar para grupo' },
  { value: 'archive_item', label: 'Arquivar item' },
  { value: 'create_item_in_board', label: 'Criar item em outro board' },
  // Legacy actions (for backward compat)
  { value: 'change_status', label: 'Mudar status para...' },
  { value: 'assign_person', label: 'Atribuir pessoa...' },
  { value: 'send_notification', label: 'Enviar notificacao' },
];

const EMPTY_CONDITION_GROUP: ConditionGroup = { combinator: 'and', rules: [] };

let nextActionId = 1;
const generateActionId = () => `action_${Date.now()}_${nextActionId++}`;

const AutomationBuilder: React.FC<AutomationBuilderProps> = ({ open, onOpenChange, editingAutomation, prefillRecipe }) => {
  const { activeBoard } = useApp();
  const { data: profiles = [] } = useProfiles();
  const createAutomation = useCreateAutomation();
  const updateAutomation = useUpdateAutomation();

  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [triggerConfig, setTriggerConfig] = useState<any>({});
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [conditions, setConditions] = useState<ConditionGroup>(EMPTY_CONDITION_GROUP);
  const [isActive, setIsActive] = useState(true);

  // Legacy single action fields for backward compat
  const [actionType, setActionType] = useState('');
  const [actionConfig, setActionConfig] = useState<any>({});

  useEffect(() => {
    if (prefillRecipe && open) {
      setName(prefillRecipe.name);
      setTriggerType(prefillRecipe.trigger_type || '');
      setTriggerConfig(prefillRecipe.trigger_config || {});
      setConditions(prefillRecipe.conditions || EMPTY_CONDITION_GROUP);
      const recipeActions = prefillRecipe.actions;
      if (Array.isArray(recipeActions) && recipeActions.length > 0) {
        setActions(recipeActions.map((a: any) => ({
          id: generateActionId(),
          action_type: a.action_type || '',
          action_config: a.action_config || {},
        })));
        setActionType(recipeActions[0].action_type || '');
        setActionConfig(recipeActions[0].action_config || {});
      } else {
        setActions([{ id: generateActionId(), action_type: '', action_config: {} }]);
        setActionType('');
        setActionConfig({});
      }
      setIsActive(true);
    } else if (editingAutomation && open) {
      setName(editingAutomation.name);
      setTriggerType(editingAutomation.trigger_type);
      setTriggerConfig(editingAutomation.trigger_config || {});
      setConditions((editingAutomation as any).conditions || EMPTY_CONDITION_GROUP);

      const existingActions = (editingAutomation as any).actions;
      if (Array.isArray(existingActions) && existingActions.length > 0) {
        setActions(existingActions.map((a: any) => ({
          id: generateActionId(),
          action_type: a.action_type || '',
          action_config: a.action_config || {},
        })));
      } else {
        setActions([{
          id: generateActionId(),
          action_type: editingAutomation.action_type,
          action_config: editingAutomation.action_config || {},
        }]);
      }
      setActionType(editingAutomation.action_type);
      setActionConfig(editingAutomation.action_config || {});
      setIsActive(editingAutomation.is_active);
    } else if (open) {
      setName('');
      setTriggerType('');
      setTriggerConfig({});
      setActions([{ id: generateActionId(), action_type: '', action_config: {} }]);
      setConditions(EMPTY_CONDITION_GROUP);
      setActionType('');
      setActionConfig({});
      setIsActive(true);
    }
  }, [editingAutomation, prefillRecipe, open]);

  if (!activeBoard) return null;

  const statusColumns = activeBoard.columns.filter(c => c.type === 'status');

  const allStatusLabels: { key: string; name: string; color: string; columnId: string; columnTitle: string }[] = [];
  statusColumns.forEach(col => {
    const labels = col.settings.labels || {};
    Object.entries(labels).forEach(([key, label]) => {
      allStatusLabels.push({
        key,
        name: label.name,
        color: label.color,
        columnId: col.id,
        columnTitle: col.title,
      });
    });
  });

  const addAction = () => {
    setActions([...actions, { id: generateActionId(), action_type: '', action_config: {} }]);
  };

  const removeAction = (id: string) => {
    if (actions.length <= 1) return;
    setActions(actions.filter(a => a.id !== id));
  };

  const updateAction = (id: string, updates: Partial<ActionItem>) => {
    setActions(actions.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleSave = async () => {
    const firstAction = actions[0];
    if (!name.trim() || !triggerType || !firstAction?.action_type) return;

    const actionsPayload = actions.map(a => ({
      action_type: a.action_type,
      action_config: a.action_config,
    }));

    const conditionsPayload = conditions.rules.length > 0 ? conditions : null;

    if (editingAutomation) {
      await updateAutomation.mutateAsync({
        id: editingAutomation.id,
        name: name.trim(),
        triggerType,
        triggerConfig,
        actionType: firstAction.action_type,
        actionConfig: firstAction.action_config,
        isActive,
        conditions: conditionsPayload,
        actions: actionsPayload,
      } as any);
    } else {
      await createAutomation.mutateAsync({
        boardId: activeBoard.id,
        name: name.trim(),
        triggerType,
        triggerConfig,
        actionType: firstAction.action_type,
        actionConfig: firstAction.action_config,
        isActive,
        conditions: conditionsPayload,
        actions: actionsPayload,
      } as any);
    }
    onOpenChange(false);
  };

  const renderTriggerConfig = () => {
    switch (triggerType) {
      case 'status_change':
        return (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Status alvo</label>
            <Select
              value={triggerConfig.statusKey || ''}
              onValueChange={(val) => {
                const label = allStatusLabels.find(l => `${l.columnId}:${l.key}` === val);
                setTriggerConfig({
                  statusKey: val,
                  columnId: label?.columnId,
                  statusName: label?.name,
                });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione o status..." />
              </SelectTrigger>
              <SelectContent>
                {allStatusLabels.map(label => (
                  <SelectItem key={`${label.columnId}:${label.key}`} value={`${label.columnId}:${label.key}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: label.color }} />
                      <span>{label.columnTitle} - {label.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'column_change':
        return (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Coluna</label>
            <Select
              value={triggerConfig.columnId || ''}
              onValueChange={(val) => {
                const col = activeBoard.columns.find(c => c.id === val);
                setTriggerConfig({ columnId: val, columnTitle: col?.title });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione a coluna..." />
              </SelectTrigger>
              <SelectContent>
                {activeBoard.columns.map(col => (
                  <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date_arrived':
        return (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Coluna de data</label>
            <Select
              value={triggerConfig.columnId || ''}
              onValueChange={(val) => {
                const col = activeBoard.columns.find(c => c.id === val);
                setTriggerConfig({ columnId: val, columnTitle: col?.title });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione a coluna de data..." />
              </SelectTrigger>
              <SelectContent>
                {activeBoard.columns.filter(c => c.type === 'date' || c.type === 'timeline').map(col => (
                  <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'item_created':
      default:
        return null;
    }
  };

  const renderActionConfig = (action: ActionItem) => {
    const { action_type, action_config, id } = action;
    const setConfig = (config: any) => updateAction(id, { action_config: config });

    switch (action_type) {
      case 'change_status':
      case 'set_column_value':
        return (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              {action_type === 'set_column_value' ? 'Coluna e valor' : 'Novo status'}
            </label>
            {action_type === 'set_column_value' && (
              <Select
                value={action_config.columnId || ''}
                onValueChange={(val) => {
                  const col = activeBoard.columns.find(c => c.id === val);
                  setConfig({ ...action_config, columnId: val, columnTitle: col?.title });
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione a coluna..." />
                </SelectTrigger>
                <SelectContent>
                  {activeBoard.columns.map(col => (
                    <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(action_type === 'change_status' || action_config.columnId) && (
              <Input
                value={action_config.value || action_config.statusKey || ''}
                onChange={(e) => setConfig({ ...action_config, value: e.target.value })}
                placeholder="Valor..."
                className="h-8 text-xs"
              />
            )}
          </div>
        );

      case 'assign_person':
      case 'notify_assignee':
        return (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              {action_type === 'notify_assignee' ? 'Notificar' : 'Pessoa'}
            </label>
            <Select
              value={action_config.personId || ''}
              onValueChange={(val) => {
                const profile = profiles.find(p => p.id === val);
                setConfig({ personId: val, personName: profile?.name });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione a pessoa..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[7px] font-bold">
                        {p.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'move_to_group':
      case 'duplicate_to_group':
        return (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Grupo destino</label>
            <Select
              value={action_config.groupId || ''}
              onValueChange={(val) => {
                const group = activeBoard.groups.find(g => g.id === val);
                setConfig({ groupId: val, groupTitle: group?.title });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione o grupo..." />
              </SelectTrigger>
              <SelectContent>
                {activeBoard.groups.map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: g.color }} />
                      {g.title}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'send_notification':
        return (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Mensagem</label>
            <Input
              value={action_config.message || ''}
              onChange={(e) => setConfig({ message: e.target.value })}
              placeholder="Digite a mensagem da notificacao..."
              className="h-8 text-xs"
            />
          </div>
        );

      case 'create_subitem':
        return (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Nome do subitem</label>
            <Input
              value={action_config.subitemName || ''}
              onChange={(e) => setConfig({ subitemName: e.target.value })}
              placeholder="Nome do subitem..."
              className="h-8 text-xs"
            />
          </div>
        );

      case 'send_webhook':
        return (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">URL do Webhook</label>
            <Input
              value={action_config.url || ''}
              onChange={(e) => setConfig({ url: e.target.value })}
              placeholder="https://..."
              className="h-8 text-xs"
            />
          </div>
        );

      case 'create_item_in_board':
        return (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Nome do item</label>
            <Input
              value={action_config.itemName || ''}
              onChange={(e) => setConfig({ ...action_config, itemName: e.target.value })}
              placeholder="Nome do novo item..."
              className="h-8 text-xs"
            />
            <label className="text-xs text-muted-foreground">Board ID destino</label>
            <Input
              value={action_config.targetBoardId || ''}
              onChange={(e) => setConfig({ ...action_config, targetBoardId: e.target.value })}
              placeholder="ID do board de destino..."
              className="h-8 text-xs"
            />
          </div>
        );

      case 'archive_item':
        return (
          <p className="text-xs text-muted-foreground italic">O item sera arquivado automaticamente.</p>
        );

      default:
        return null;
    }
  };

  const firstAction = actions[0];
  const isValid = name.trim() && triggerType && firstAction?.action_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-amber-500" />
            {editingAutomation ? 'Editar automacao' : 'Nova automacao'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Nome</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da automacao..."
              className="h-8 text-sm"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Ativa</label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Trigger section */}
          <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Quando</span>
            </div>

            <Select value={triggerType} onValueChange={(val) => { setTriggerType(val); setTriggerConfig({}); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione o gatilho..." />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {renderTriggerConfig()}
          </div>

          {/* Condition Builder */}
          <div className="flex justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
          </div>

          <ConditionBuilder
            conditions={conditions}
            onChange={setConditions}
            columns={activeBoard.columns}
          />

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
          </div>

          {/* Actions section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Entao</span>
            </div>

            {actions.map((action, index) => (
              <div
                key={action.id}
                className="rounded-lg border border-border p-3 space-y-3 bg-muted/30 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="font-density-badge text-muted-foreground">
                    Acao {index + 1}
                  </span>
                  {actions.length > 1 && (
                    <button
                      onClick={() => removeAction(action.id)}
                      className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <Select
                  value={action.action_type}
                  onValueChange={(val) => updateAction(action.id, { action_type: val, action_config: {} })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione a acao..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {renderActionConfig(action)}
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={addAction}
              className="w-full text-xs gap-1 h-7"
            >
              <Plus className="w-3 h-3" />
              Adicionar acao
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isValid || createAutomation.isPending || updateAutomation.isPending}
          >
            {createAutomation.isPending || updateAutomation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutomationBuilder;
