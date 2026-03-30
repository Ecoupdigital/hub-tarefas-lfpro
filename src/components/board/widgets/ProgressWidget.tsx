import React, { useMemo } from 'react';
import type { WidgetConfig } from '@/hooks/useDashboardWidgets';
import type { Item, Column, Group } from '@/types/board';

interface ProgressWidgetProps {
  config: WidgetConfig;
  items: Item[];
  columns: Column[];
  groups: Group[];
}

const ProgressWidget: React.FC<ProgressWidgetProps> = ({ config, items, columns, groups }) => {
  const { statusColumnId } = config;

  const progressData = useMemo(() => {
    const statusCols = statusColumnId
      ? columns.filter(c => c.id === statusColumnId)
      : columns.filter(c => c.type === 'status');

    if (statusCols.length === 0) {
      // Sem coluna de status: calcular progresso por coluna progress/number
      const progressCols = columns.filter(c => c.type === 'progress' || c.type === 'number');
      if (progressCols.length === 0) return null;

      const col = progressCols[0];
      const values = items
        .map(i => {
          const v = i.columnValues[col.id]?.value;
          return v != null ? Number(v) : null;
        })
        .filter((v): v is number => v !== null && !isNaN(v));

      if (values.length === 0) return null;
      const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      return { percentage: Math.min(100, Math.max(0, avg)), label: col.title };
    }

    // Calcular percentual de itens "concluidos" com base nas colunas de status
    let doneCount = 0;
    let total = 0;

    for (const item of items) {
      for (const col of statusCols) {
        const val = item.columnValues[col.id]?.value;
        if (val == null) continue;
        const label = col.settings.labels?.[String(val)];
        if (!label) continue;
        total++;
        if (label.isDone) doneCount++;
        break;
      }
    }

    if (total === 0) return null;
    return {
      percentage: Math.round((doneCount / total) * 100),
      label: `${doneCount} de ${total} concluidos`,
    };
  }, [items, columns, statusColumnId]);

  if (!progressData) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-4 text-muted-foreground">
        <p className="font-density-cell">Sem dados de progresso</p>
        <p className="font-density-tiny mt-1 opacity-60">Adicione uma coluna de Status ou Progresso</p>
      </div>
    );
  }

  const { percentage, label } = progressData;

  const colorClass =
    percentage >= 75
      ? 'bg-green-500'
      : percentage >= 40
      ? 'bg-yellow-500'
      : 'bg-red-500';

  return (
    <div className="flex flex-col items-center justify-center h-full py-4 gap-3 w-full">
      <p className="text-4xl font-bold text-primary">{percentage}%</p>
      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="font-density-cell text-muted-foreground text-center">{label}</p>
    </div>
  );
};

export default ProgressWidget;
