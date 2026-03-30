import React from 'react';
import { BarChart2, LayoutList, PieChart, Circle, TrendingUp, Table } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartOption {
  value: string;
  label: string;
  icon: React.ElementType;
}

const ALL_CHART_TYPES: ChartOption[] = [
  { value: 'bar', label: 'Barras', icon: BarChart2 },
  { value: 'bar_horizontal', label: 'Barras horizontais', icon: LayoutList },
  { value: 'pie', label: 'Pizza', icon: PieChart },
  { value: 'donut', label: 'Donut', icon: Circle },
  { value: 'line', label: 'Linha', icon: TrendingUp },
  { value: 'area', label: 'Area', icon: TrendingUp },
  { value: 'table', label: 'Tabela', icon: Table },
];

interface ChartTypeSelectorProps {
  value: string;
  onChange: (type: string) => void;
  allowedTypes?: string[];
}

const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({ value, onChange, allowedTypes }) => {
  const options = allowedTypes
    ? ALL_CHART_TYPES.filter(t => allowedTypes.includes(t.value))
    : ALL_CHART_TYPES;

  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map(opt => {
        const Icon = opt.icon;
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors hover:bg-muted',
              isActive && 'border-primary bg-primary/10',
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate w-full text-center">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ChartTypeSelector;
