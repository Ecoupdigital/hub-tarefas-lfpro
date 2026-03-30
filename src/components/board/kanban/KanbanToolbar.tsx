import React from 'react';
import type { StatusLabel, Column } from '@/types/board';
import type { KanbanSettings } from './KanbanTypes';
import {
  Settings2, Layers, Search, X,
  LayoutGrid, Columns3,
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';

const KanbanToolbar: React.FC<{
  kanbanMode: 'column' | 'group';
  onSetKanbanMode: (mode: 'column' | 'group') => void;
  laneEligibleCols: Column[];
  selectedKanbanColId: string | null;
  onSelectKanbanCol: (id: string) => void;
  swimlaneEnabled: boolean;
  onToggleSwimlane: (v: boolean) => void;
  swimlaneMode: 'group' | 'column';
  onSetSwimlaneMode: (mode: 'group' | 'column') => void;
  swimlaneOptions: Column[];
  swimlaneColumnId: string | null;
  onSelectSwimlaneCol: (id: string | null) => void;
  visibleFields: KanbanSettings['visibleFields'];
  onToggleField: (field: keyof KanbanSettings['visibleFields']) => void;
  wipLimits: Record<string, number>;
  onSetWipLimit: (key: string, limit: number) => void;
  labels: Record<string, StatusLabel>;
  inlineSearch: string;
  onInlineSearchChange: (v: string) => void;
}> = ({
  kanbanMode, onSetKanbanMode,
  laneEligibleCols, selectedKanbanColId, onSelectKanbanCol,
  swimlaneEnabled, onToggleSwimlane,
  swimlaneMode, onSetSwimlaneMode,
  swimlaneOptions, swimlaneColumnId, onSelectSwimlaneCol,
  visibleFields, onToggleField,
  wipLimits, onSetWipLimit, labels,
  inlineSearch, onInlineSearchChange,
}) => {
  const fieldLabels: Record<keyof KanbanSettings['visibleFields'], string> = {
    name: 'Nome',
    statusIndicator: 'Indicador de status',
    person: 'Pessoa',
    date: 'Data',
    progress: 'Barra de progresso',
    priority: 'Prioridade',
    tags: 'Tags',
    subitems: 'Subitens',
  };

  const columnTypeLabels: Record<string, string> = {
    status: 'Status',
    dropdown: 'Dropdown',
    tags: 'Tags',
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0 flex-wrap">
      {/* Busca inline client-side (sem re-fetch) */}
      <div className="relative flex items-center">
        <Search className="absolute left-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={inlineSearch}
          onChange={e => onInlineSearchChange(e.target.value)}
          placeholder="Buscar cartoes..."
          className="font-density-cell bg-muted border border-border rounded pl-7 pr-7 py-1 text-foreground outline-none w-44 focus:ring-1 focus:ring-primary/30 transition-all"
        />
        {inlineSearch && (
          <button
            onClick={() => onInlineSearchChange('')}
            className="absolute right-2 text-muted-foreground hover:text-foreground"
            title="Limpar busca"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Kanban mode selector: column vs group */}
      <div className="flex items-center gap-1.5">
        <span className="font-density-cell text-muted-foreground">Lanes por:</span>
        <div className="flex items-center bg-muted rounded border border-border overflow-hidden">
          <button
            onClick={() => onSetKanbanMode('column')}
            className={`flex items-center gap-1 px-2 py-1 font-density-cell transition-colors ${
              kanbanMode === 'column'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
            }`}
            title="Organizar lanes por valor de coluna"
          >
            <Columns3 className="w-3 h-3" />
            Coluna
          </button>
          <button
            onClick={() => onSetKanbanMode('group')}
            className={`flex items-center gap-1 px-2 py-1 font-density-cell transition-colors ${
              kanbanMode === 'group'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
            }`}
            title="Organizar lanes por grupo do board"
          >
            <LayoutGrid className="w-3 h-3" />
            Grupo
          </button>
        </div>
      </div>

      {/* Column selector (somente no modo 'column') */}
      {kanbanMode === 'column' && laneEligibleCols.length > 0 && (
        <div className="flex items-center gap-1.5">
          <select
            value={selectedKanbanColId || ''}
            onChange={e => onSelectKanbanCol(e.target.value)}
            className="font-density-cell bg-muted border border-border rounded px-2 py-1 text-foreground outline-none"
          >
            {laneEligibleCols.map(col => (
              <option key={col.id} value={col.id}>
                {col.title} ({columnTypeLabels[col.type] || col.type})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Swimlane toggle */}
      <div className="flex items-center gap-1.5 ml-1">
        <Layers className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-density-cell text-muted-foreground">Raias</span>
        <Switch
          checked={swimlaneEnabled}
          onCheckedChange={onToggleSwimlane}
          className="scale-75 origin-left"
        />
        {swimlaneEnabled && (
          <>
            {/* Seletor de modo: grupo do board ou coluna */}
            <select
              value={swimlaneMode}
              onChange={e => onSetSwimlaneMode(e.target.value as 'group' | 'column')}
              className="font-density-cell bg-muted border border-border rounded px-2 py-1 text-foreground outline-none ml-1"
            >
              <option value="group">Por grupo do board</option>
              <option value="column">Por coluna</option>
            </select>
            {/* Seletor de coluna apenas no modo 'column' */}
            {swimlaneMode === 'column' && swimlaneOptions.length > 0 && (
              <select
                value={swimlaneColumnId || ''}
                onChange={e => onSelectSwimlaneCol(e.target.value || null)}
                className="font-density-cell bg-muted border border-border rounded px-2 py-1 text-foreground outline-none ml-1"
              >
                <option value="">Selecionar coluna...</option>
                {swimlaneOptions.map(col => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            )}
          </>
        )}
      </div>

      {/* Card settings popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="ml-auto flex items-center gap-1 font-density-cell text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">
            <Settings2 className="w-3.5 h-3.5" />
            <span>Personalizar cartoes</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-3">
          <p className="font-density-cell font-semibold text-foreground mb-3">Campos visiveis nos cartoes</p>
          <div className="space-y-2">
            {(Object.keys(fieldLabels) as Array<keyof KanbanSettings['visibleFields']>).map(field => (
              <label key={field} className="flex items-center justify-between cursor-pointer">
                <span className="font-density-cell text-foreground">{fieldLabels[field]}</span>
                <Switch
                  checked={visibleFields[field]}
                  onCheckedChange={() => onToggleField(field)}
                  className="scale-75"
                />
              </label>
            ))}
          </div>

          <div className="border-t border-border mt-3 pt-3">
            <p className="font-density-cell font-semibold text-foreground mb-2">Limites WIP por coluna</p>
            <div className="space-y-1.5">
              {Object.entries(labels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <span className="font-density-cell text-foreground flex-1 truncate">{label.name}</span>
                  <input
                    type="number"
                    min={0}
                    value={wipLimits[key] || ''}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      onSetWipLimit(key, isNaN(val) || val < 0 ? 0 : val);
                    }}
                    placeholder="--"
                    className="w-12 font-density-cell bg-muted border border-border rounded px-1.5 py-0.5 text-foreground outline-none text-center"
                  />
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default KanbanToolbar;
