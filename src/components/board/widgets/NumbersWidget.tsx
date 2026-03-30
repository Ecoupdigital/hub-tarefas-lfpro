import React, { useMemo } from 'react';
import type { WidgetConfig } from '@/hooks/useDashboardWidgets';
import type { Item, Column } from '@/types/board';

interface NumbersWidgetProps {
  config: WidgetConfig;
  items: Item[];
  columns: Column[];
}

const NumbersWidget: React.FC<NumbersWidgetProps> = ({ config, items, columns }) => {
  const { columnId, aggregation = 'count' } = config;

  const column = useMemo(
    () => columns.find(c => c.id === columnId),
    [columns, columnId]
  );

  const result = useMemo(() => {
    if (aggregation === 'count') {
      return { value: items.length, label: 'Total de Itens' };
    }

    if (!columnId) {
      return { value: items.length, label: 'Total de Itens' };
    }

    const numericValues = items
      .map(item => {
        const cv = item.columnValues[columnId];
        if (!cv || cv.value == null) return null;
        const n = Number(cv.value);
        return isNaN(n) ? null : n;
      })
      .filter((v): v is number => v !== null);

    if (numericValues.length === 0) {
      return { value: 0, label: column?.title ?? 'Sem dados' };
    }

    let value: number;
    let label: string;
    const colName = column?.title ?? 'Coluna';

    switch (aggregation) {
      case 'sum':
        value = numericValues.reduce((a, b) => a + b, 0);
        label = `Soma - ${colName}`;
        break;
      case 'avg':
        value = Math.round((numericValues.reduce((a, b) => a + b, 0) / numericValues.length) * 100) / 100;
        label = `Media - ${colName}`;
        break;
      case 'min':
        value = Math.min(...numericValues);
        label = `Minimo - ${colName}`;
        break;
      case 'max':
        value = Math.max(...numericValues);
        label = `Maximo - ${colName}`;
        break;
      default:
        value = numericValues.length;
        label = `Contagem - ${colName}`;
    }

    return { value, label };
  }, [items, columnId, aggregation, column]);

  const formattedValue = useMemo(() => {
    if (Number.isInteger(result.value)) return result.value.toLocaleString('pt-BR');
    return result.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }, [result.value]);

  return (
    <div className="flex flex-col items-center justify-center h-full py-4">
      <p className="text-4xl font-bold text-primary">{formattedValue}</p>
      <p className="font-density-cell text-muted-foreground mt-2">{config.title || result.label}</p>
    </div>
  );
};

export default NumbersWidget;
