import React, { useState, useMemo } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { DashboardWidget, WidgetConfig } from '@/hooks/useDashboardWidgets';
import type { Item, Column, Group } from '@/types/board';
import MetricSelector from './MetricSelector';
import ChartTypeSelector from './ChartTypeSelector';
import WidgetFilterBuilder from './WidgetFilterBuilder';
import WidgetRenderer from './WidgetRenderer';
import { DashboardFilterProvider } from '@/context/DashboardFilterContext';

interface WidgetConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: DashboardWidget;
  boardId: string;
  columns: Column[];
  items: Item[];
  groups: Group[];
  onSave: (updates: { config?: WidgetConfig; widget_type?: string; title?: string }) => void;
}

const WidgetConfigPanel: React.FC<WidgetConfigPanelProps> = ({
  open,
  onOpenChange,
  widget,
  boardId,
  columns,
  items,
  groups,
  onSave,
}) => {
  const [configDraft, setConfigDraft] = useState<WidgetConfig>({ ...widget.config });
  const [typeDraft, setTypeDraft] = useState(widget.widget_type);

  // Reset drafts when widget changes
  React.useEffect(() => {
    if (open) {
      setConfigDraft({ ...widget.config });
      setTypeDraft(widget.widget_type);
    }
  }, [open, widget.config, widget.widget_type]);

  const previewWidget = useMemo<DashboardWidget>(() => ({
    ...widget,
    widget_type: typeDraft,
    config: configDraft,
  }), [widget, typeDraft, configDraft]);

  const updateConfig = (patch: Partial<WidgetConfig>) => {
    setConfigDraft(prev => ({ ...prev, ...patch }));
  };

  const handleApply = () => {
    onSave({
      config: configDraft,
      widget_type: typeDraft,
      title: configDraft.title,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[680px] sm:max-w-[680px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle>Configurar widget</SheetTitle>
          <SheetDescription className="sr-only">
            Painel de configuracao do widget com preview ao vivo
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left column: config tabs */}
          <div className="w-80 border-r overflow-y-auto p-4">
            <Tabs defaultValue="dados">
              <TabsList className="w-full">
                <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
                <TabsTrigger value="visual" className="flex-1">Visual</TabsTrigger>
                <TabsTrigger value="estilo" className="flex-1">Estilo</TabsTrigger>
              </TabsList>

              {/* Tab: Dados */}
              <TabsContent value="dados" className="space-y-4 mt-4">
                <MetricSelector
                  columns={columns}
                  value={configDraft.metricColumnId}
                  onChange={v => updateConfig({ metricColumnId: v })}
                  label="Coluna da metrica"
                />

                <div className="space-y-1.5">
                  <Label>Agrupar por</Label>
                  <Select
                    value={configDraft.groupByType || 'group'}
                    onValueChange={v => updateConfig({ groupByType: v as WidgetConfig['groupByType'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="group">Por grupo</SelectItem>
                      <SelectItem value="column">Por coluna</SelectItem>
                      <SelectItem value="person">Por pessoa</SelectItem>
                      <SelectItem value="date_created">Por data de criacao</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {configDraft.groupByType === 'column' && (
                  <MetricSelector
                    columns={columns}
                    value={configDraft.groupByColumnId}
                    onChange={v => updateConfig({ groupByColumnId: v })}
                    label="Coluna de agrupamento"
                  />
                )}

                <div className="space-y-1.5">
                  <Label>Agregacao</Label>
                  <Select
                    value={configDraft.aggregation || 'count'}
                    onValueChange={v => updateConfig({ aggregation: v as WidgetConfig['aggregation'] })}
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
                      <SelectItem value="count_unique">Contagem unica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Filtros</Label>
                  <WidgetFilterBuilder
                    columns={columns}
                    items={items}
                    value={configDraft.filters || []}
                    onChange={filters => updateConfig({ filters })}
                  />
                </div>
              </TabsContent>

              {/* Tab: Visualizacao */}
              <TabsContent value="visual" className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label>Tipo de grafico</Label>
                  <ChartTypeSelector
                    value={configDraft.chartType || typeDraft}
                    onChange={type => {
                      updateConfig({ chartType: type as WidgetConfig['chartType'] });
                      // Map chart type to widget_type for backward compat
                      const typeMap: Record<string, string> = {
                        bar: 'bar_chart',
                        bar_horizontal: 'bar_chart',
                        pie: 'pie_chart',
                        donut: 'pie_chart',
                        line: 'line_chart',
                        area: 'line_chart',
                        table: 'table',
                      };
                      if (typeMap[type]) {
                        setTypeDraft(typeMap[type]);
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-legend">Mostrar legenda</Label>
                  <Switch
                    id="show-legend"
                    checked={configDraft.showLegend ?? true}
                    onCheckedChange={v => updateConfig({ showLegend: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-values">Mostrar valores</Label>
                  <Switch
                    id="show-values"
                    checked={configDraft.showValues ?? false}
                    onCheckedChange={v => updateConfig({ showValues: v })}
                  />
                </div>

                {(configDraft.chartType === 'line' || configDraft.chartType === 'area') && (
                  <div className="space-y-1.5">
                    <Label>Periodo</Label>
                    <Select
                      value={configDraft.dateRange || 'last_14'}
                      onValueChange={v => updateConfig({ dateRange: v as WidgetConfig['dateRange'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last_7">Ultimos 7 dias</SelectItem>
                        <SelectItem value="last_14">Ultimos 14 dias</SelectItem>
                        <SelectItem value="last_30">Ultimos 30 dias</SelectItem>
                        <SelectItem value="last_90">Ultimos 90 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Estilo */}
              <TabsContent value="estilo" className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label>Titulo</Label>
                  <Input
                    value={configDraft.title || ''}
                    onChange={e => updateConfig({ title: e.target.value })}
                    placeholder="Nome do widget"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Subtitulo</Label>
                  <Input
                    value={configDraft.subtitle || ''}
                    onChange={e => updateConfig({ subtitle: e.target.value })}
                    placeholder="Descricao curta"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Cor de acento</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={configDraft.color || '#5F3FFF'}
                      onChange={e => updateConfig({ color: e.target.value })}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">
                      {configDraft.color || '#5F3FFF'}
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right column: live preview */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
            <div className="flex-1 border rounded-lg bg-muted/30 p-3 min-h-[200px]">
              <DashboardFilterProvider>
                <WidgetRenderer
                  widget={previewWidget}
                  items={items}
                  columns={columns}
                  groups={groups}
                  boardId={boardId}
                  onConfigChange={cfg => updateConfig(cfg)}
                />
              </DashboardFilterProvider>
            </div>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply}>
            Aplicar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default WidgetConfigPanel;
