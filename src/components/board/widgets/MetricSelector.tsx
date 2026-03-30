import React, { useMemo } from 'react';
import {
  Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Column } from '@/types/board';

interface MetricSelectorProps {
  columns: Column[];
  value: string | undefined;
  onChange: (columnId: string | undefined) => void;
  label?: string;
}

const MetricSelector: React.FC<MetricSelectorProps> = ({ columns, value, onChange, label }) => {
  const grouped = useMemo(() => {
    const groups: Record<string, Column[]> = {
      status: [],
      number: [],
      people: [],
      date: [],
      other: [],
    };

    for (const col of columns) {
      if (col.type === 'status') {
        groups.status.push(col);
      } else if (col.type === 'number' || col.type === 'progress' || col.type === 'rating') {
        groups.number.push(col);
      } else if (col.type === 'people') {
        groups.people.push(col);
      } else if (col.type === 'date') {
        groups.date.push(col);
      } else {
        groups.other.push(col);
      }
    }

    return groups;
  }, [columns]);

  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium">{label}</label>}
      <Select
        value={value ?? '__count__'}
        onValueChange={v => onChange(v === '__count__' ? undefined : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecionar metrica" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Geral</SelectLabel>
            <SelectItem value="__count__">Contagem de itens</SelectItem>
          </SelectGroup>

          {grouped.status.length > 0 && (
            <SelectGroup>
              <SelectLabel>Status</SelectLabel>
              {grouped.status.map(col => (
                <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
              ))}
            </SelectGroup>
          )}

          {grouped.number.length > 0 && (
            <SelectGroup>
              <SelectLabel>Numero</SelectLabel>
              {grouped.number.map(col => (
                <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
              ))}
            </SelectGroup>
          )}

          {grouped.people.length > 0 && (
            <SelectGroup>
              <SelectLabel>Pessoa</SelectLabel>
              {grouped.people.map(col => (
                <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
              ))}
            </SelectGroup>
          )}

          {grouped.date.length > 0 && (
            <SelectGroup>
              <SelectLabel>Data</SelectLabel>
              {grouped.date.map(col => (
                <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
              ))}
            </SelectGroup>
          )}

          {grouped.other.length > 0 && (
            <SelectGroup>
              <SelectLabel>Outros</SelectLabel>
              {grouped.other.map(col => (
                <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default MetricSelector;
