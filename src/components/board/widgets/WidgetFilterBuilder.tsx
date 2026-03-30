import React, { useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { WidgetFilter } from '@/hooks/useDashboardWidgets';
import type { Column, Item } from '@/types/board';

interface WidgetFilterBuilderProps {
  columns: Column[];
  items: Item[];
  value: WidgetFilter[];
  onChange: (filters: WidgetFilter[]) => void;
}

type OperatorDef = { value: WidgetFilter['operator']; label: string };

const STATUS_OPS: OperatorDef[] = [
  { value: 'eq', label: 'Igual a' },
  { value: 'neq', label: 'Diferente de' },
  { value: 'is_empty', label: 'Vazio' },
  { value: 'is_not_empty', label: 'Nao vazio' },
];

const PEOPLE_OPS: OperatorDef[] = [
  { value: 'in', label: 'Contem' },
  { value: 'not_in', label: 'Nao contem' },
  { value: 'is_empty', label: 'Vazio' },
];

const NUMBER_OPS: OperatorDef[] = [
  { value: 'eq', label: 'Igual a' },
  { value: 'gt', label: 'Maior que' },
  { value: 'lt', label: 'Menor que' },
  { value: 'gte', label: 'Maior ou igual' },
  { value: 'lte', label: 'Menor ou igual' },
  { value: 'is_empty', label: 'Vazio' },
];

const DEFAULT_OPS: OperatorDef[] = [
  { value: 'eq', label: 'Igual a' },
  { value: 'neq', label: 'Diferente de' },
  { value: 'is_empty', label: 'Vazio' },
  { value: 'is_not_empty', label: 'Nao vazio' },
];

function getOperatorsForColumn(col: Column | undefined): OperatorDef[] {
  if (!col) return DEFAULT_OPS;
  switch (col.type) {
    case 'status':
    case 'dropdown':
      return STATUS_OPS;
    case 'people':
      return PEOPLE_OPS;
    case 'number':
    case 'progress':
    case 'rating':
      return NUMBER_OPS;
    default:
      return DEFAULT_OPS;
  }
}

function needsValueInput(operator: WidgetFilter['operator']): boolean {
  return operator !== 'is_empty' && operator !== 'is_not_empty';
}

const WidgetFilterBuilder: React.FC<WidgetFilterBuilderProps> = ({
  columns,
  items,
  value: filters,
  onChange,
}) => {
  const columnOptions = useMemo(
    () => columns.filter(c => !['auto_number', 'creation_log', 'last_updated', 'formula'].includes(c.type)),
    [columns],
  );

  const peopleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      for (const cv of Object.values(item.columnValues)) {
        if (Array.isArray(cv?.value)) {
          for (const v of cv.value) {
            if (typeof v === 'string') ids.add(v);
          }
        }
      }
    }
    return Array.from(ids);
  }, [items]);

  const getValueOptions = (col: Column | undefined): string[] | null => {
    if (!col) return null;
    if (col.type === 'status' && col.settings?.labels) {
      return Object.values(col.settings.labels).map(l => l.name);
    }
    if (col.type === 'dropdown' && col.settings?.options) {
      return col.settings.options;
    }
    if (col.type === 'people') {
      return peopleIds;
    }
    return null;
  };

  const updateFilter = (index: number, patch: Partial<WidgetFilter>) => {
    const next = filters.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(next);
  };

  const addFilter = () => {
    const firstCol = columnOptions[0];
    if (!firstCol) return;
    onChange([...filters, { columnId: firstCol.id, operator: 'eq', value: '' }]);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {filters.map((filter, index) => {
        const col = columns.find(c => c.id === filter.columnId);
        const operators = getOperatorsForColumn(col);
        const valueOptions = getValueOptions(col);
        const showValue = needsValueInput(filter.operator);

        return (
          <div key={index} className="flex items-center gap-2">
            {/* Column selector */}
            <Select
              value={filter.columnId}
              onValueChange={v => updateFilter(index, { columnId: v, value: '' })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Coluna" />
              </SelectTrigger>
              <SelectContent>
                {columnOptions.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator selector */}
            <Select
              value={filter.operator}
              onValueChange={v => updateFilter(index, { operator: v as WidgetFilter['operator'] })}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map(op => (
                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value input */}
            {showValue && valueOptions ? (
              <Select
                value={filter.value ?? ''}
                onValueChange={v => updateFilter(index, { value: v })}
              >
                <SelectTrigger className="flex-1 min-w-[100px]">
                  <SelectValue placeholder="Valor" />
                </SelectTrigger>
                <SelectContent>
                  {valueOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : showValue ? (
              <Input
                className="flex-1 min-w-[100px]"
                value={filter.value ?? ''}
                onChange={e => updateFilter(index, { value: e.target.value })}
                placeholder="Valor"
              />
            ) : (
              <div className="flex-1" />
            )}

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeFilter(index)}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Remover filtro"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={addFilter} className="w-full">
        <Plus className="h-4 w-4 mr-1" />
        Adicionar filtro
      </Button>
    </div>
  );
};

export default WidgetFilterBuilder;
