import React from 'react';
import { Type, AlignLeft, CircleDot, Calendar, Users, Hash, CheckSquare, List } from 'lucide-react';
import type { ColumnType } from '@/types/board';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  text: Type,
  long_text: AlignLeft,
  status: CircleDot,
  date: Calendar,
  people: Users,
  number: Hash,
  checkbox: CheckSquare,
  dropdown: List,
};

interface Props {
  type: ColumnType;
  className?: string;
}

/**
 * Renderiza o icone Lucide correspondente ao tipo de coluna no NotionTableView.
 * Fallback: Type (texto) para tipos nao mapeados.
 */
export const NotionColumnIcon: React.FC<Props> = ({ type, className }) => {
  const Icon = ICON_MAP[type] ?? Type;
  return <Icon className={className ?? 'w-3.5 h-3.5 shrink-0'} />;
};
