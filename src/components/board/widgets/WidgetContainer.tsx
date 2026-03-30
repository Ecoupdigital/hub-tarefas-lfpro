import React, { useState } from 'react';
import { Settings, Trash2, GripVertical, Copy } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { DashboardWidget, WidgetConfig } from '@/hooks/useDashboardWidgets';
import type { Item, Column, Group } from '@/types/board';
import WidgetRenderer from './WidgetRenderer';

interface WidgetContainerProps {
  widget: DashboardWidget;
  items: Item[];
  columns: Column[];
  groups: Group[];
  boardId: string;
  profiles?: Array<{ id: string; name?: string; full_name?: string }>;
  isEditMode?: boolean;
  onUpdate: (id: string, config?: WidgetConfig) => void;
  onDelete: (id: string) => void;
  onConfigure?: (widget: DashboardWidget) => void;
  onDuplicate?: (widgetId: string) => void;
  dragHandleAttributes?: Record<string, unknown>;
  dragHandleListeners?: Record<string, unknown>;
}

const WIDGET_TYPE_LABELS: Record<string, string> = {
  pie_chart: 'Grafico de Pizza',
  bar_chart: 'Grafico de Barras',
  line_chart: 'Grafico de Linha',
  numbers: 'Contador',
  progress: 'Progresso',
  text: 'Texto',
  activity: 'Atividade',
  table: 'Tabela',
  people_chart: 'Itens por Pessoa',
};

const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  items,
  columns,
  groups,
  boardId,
  profiles,
  isEditMode = true,
  onUpdate,
  onDelete,
  onConfigure,
  onDuplicate,
  dragHandleAttributes,
  dragHandleListeners,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [configDraft, setConfigDraft] = useState<WidgetConfig>({ ...widget.config });

  const title = widget.config.title || WIDGET_TYPE_LABELS[widget.widget_type] || 'Widget';

  const handleSaveConfig = () => {
    onUpdate(widget.id, configDraft);
    setShowConfig(false);
  };

  const handleConfigChange = (newConfig: WidgetConfig) => {
    onUpdate(widget.id, newConfig);
  };

  const handleConfigClick = () => {
    if (onConfigure) {
      onConfigure(widget);
    } else {
      setConfigDraft({ ...widget.config });
      setShowConfig(true);
    }
  };

  // Get numeric columns for numbers widget config
  const numericColumns = columns.filter(c => c.type === 'number' || c.type === 'progress' || c.type === 'rating');
  const statusColumns = columns.filter(c => c.type === 'status');

  return (
    <>
      <Card className="h-full flex flex-col group">
        <CardHeader className="pb-1 pt-3 px-4 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2 min-w-0">
            {isEditMode && (
              <span
                {...(dragHandleAttributes ?? {})}
                {...(dragHandleListeners ?? {})}
                className="widget-drag-handle cursor-grab active:cursor-grabbing touch-none"
                title="Arrastar para reposicionar"
              >
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
              </span>
            )}
            <CardTitle className="font-density-cell font-semibold truncate">{title}</CardTitle>
          </div>
          {isEditMode && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onDuplicate && (
                <button
                  onClick={() => onDuplicate(widget.id)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                  title="Duplicar"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleConfigClick}
                className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                title="Configurar"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 pt-1 px-4 pb-3">
          <WidgetRenderer
            widget={widget}
            items={items}
            columns={columns}
            groups={groups}
            boardId={boardId}
            profiles={profiles}
            onConfigChange={handleConfigChange}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover widget?</AlertDialogTitle>
            <AlertDialogDescription>
              O widget "{widget.config?.title || WIDGET_TYPE_LABELS[widget.widget_type] || 'Widget'}" sera removido do dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onDelete(widget.id); setShowDeleteConfirm(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fallback Config Dialog (used when no onConfigure provided) */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Widget</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titulo</Label>
              <Input
                value={configDraft.title || ''}
                onChange={e => setConfigDraft({ ...configDraft, title: e.target.value })}
                placeholder={WIDGET_TYPE_LABELS[widget.widget_type] || 'Widget'}
              />
            </div>

            {widget.widget_type === 'numbers' && (
              <>
                <div className="space-y-2">
                  <Label>Coluna</Label>
                  <Select
                    value={configDraft.columnId || '_count'}
                    onValueChange={v => setConfigDraft({ ...configDraft, columnId: v === '_count' ? undefined : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_count">Contagem de itens</SelectItem>
                      {numericColumns.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Agregacao</Label>
                  <Select
                    value={configDraft.aggregation || 'count'}
                    onValueChange={v => setConfigDraft({ ...configDraft, aggregation: v as WidgetConfig['aggregation'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Contagem</SelectItem>
                      <SelectItem value="sum">Soma</SelectItem>
                      <SelectItem value="avg">Media</SelectItem>
                      <SelectItem value="min">Minimo</SelectItem>
                      <SelectItem value="max">Maximo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {(widget.widget_type === 'pie_chart' || widget.widget_type === 'bar_chart' || widget.widget_type === 'progress') && (
              <div className="space-y-2">
                <Label>Coluna de Status</Label>
                <Select
                  value={configDraft.statusColumnId || '_auto'}
                  onValueChange={v => setConfigDraft({ ...configDraft, statusColumnId: v === '_auto' ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Automatico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_auto">Automatico (todas)</SelectItem>
                    {statusColumns.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {widget.widget_type === 'bar_chart' && (
              <div className="space-y-2">
                <Label>Agrupar por</Label>
                <Select
                  value={configDraft.groupBy || 'group'}
                  onValueChange={v => setConfigDraft({ ...configDraft, groupBy: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Grupo</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {widget.widget_type === 'activity' && (
              <div className="space-y-2">
                <Label>Limite de atividades</Label>
                <Input
                  type="number"
                  min={5}
                  max={100}
                  value={configDraft.limit || 20}
                  onChange={e => setConfigDraft({ ...configDraft, limit: parseInt(e.target.value) || 20 })}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfig(false)}>Cancelar</Button>
            <Button onClick={handleSaveConfig}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WidgetContainer;
