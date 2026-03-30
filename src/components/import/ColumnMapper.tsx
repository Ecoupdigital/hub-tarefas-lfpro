import React from 'react';
import { ArrowRight, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Column } from '@/types/board';
import type { ColumnMapping, DetectedType } from '@/utils/importData';

interface ColumnMapperProps {
  mappings: ColumnMapping[];
  boardColumns: Column[];
  onUpdateMapping: (index: number, targetColumnId: string | null) => void;
}

const TYPE_LABELS: Record<DetectedType, string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  email: 'Email',
  checkbox: 'Checkbox',
};

const TYPE_COLORS: Record<DetectedType, string> = {
  text: 'bg-blue-100 text-blue-700',
  number: 'bg-green-100 text-green-700',
  date: 'bg-purple-100 text-purple-700',
  email: 'bg-orange-100 text-orange-700',
  checkbox: 'bg-pink-100 text-pink-700',
};

const ColumnMapper: React.FC<ColumnMapperProps> = ({ mappings, boardColumns, onUpdateMapping }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-density-tiny font-medium text-muted-foreground uppercase px-1 mb-1">
        <span className="flex-1">Coluna de origem</span>
        <span className="w-6" />
        <span className="flex-1">Coluna de destino</span>
      </div>

      {mappings.map((mapping, index) => (
        <div
          key={mapping.sourceHeader}
          className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
            mapping.ignored ? 'bg-muted/30 border-muted opacity-60' : 'bg-card border-border'
          }`}
        >
          {/* Source column */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-density-cell font-medium text-foreground truncate">{mapping.sourceHeader}</span>
              <Badge variant="secondary" className={`font-density-badge px-1 py-0 h-4 ${TYPE_COLORS[mapping.targetType]}`}>
                {TYPE_LABELS[mapping.targetType]}
              </Badge>
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />

          {/* Target column */}
          <div className="flex-1 min-w-0">
            <Select
              value={mapping.ignored ? '__ignore__' : (mapping.targetColumnId || '__new__')}
              onValueChange={(val) => {
                if (val === '__ignore__') {
                  onUpdateMapping(index, null);
                } else {
                  onUpdateMapping(index, val);
                }
              }}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ignore__">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <X className="w-3 h-3" /> Ignorar
                  </span>
                </SelectItem>
                <SelectItem value="__new__">
                  <span className="flex items-center gap-1 text-primary">
                    <Plus className="w-3 h-3" /> Criar nova coluna
                  </span>
                </SelectItem>
                {boardColumns.map(col => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ColumnMapper;
