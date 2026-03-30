import React from 'react';
import { Plus, X } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Column } from '@/types/board';

export interface ConditionRule {
  id: string;
  column_id: string;
  operator: ConditionOperator;
  value: string;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than';

export type ConditionCombinator = 'and' | 'or';

export interface ConditionGroup {
  combinator: ConditionCombinator;
  rules: ConditionRule[];
}

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: 'e igual a',
  not_equals: 'nao e igual a',
  contains: 'contem',
  is_empty: 'esta vazio',
  is_not_empty: 'nao esta vazio',
  greater_than: 'maior que',
  less_than: 'menor que',
};

const VALUE_OPERATORS: ConditionOperator[] = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'];

interface ConditionBuilderProps {
  conditions: ConditionGroup;
  onChange: (conditions: ConditionGroup) => void;
  columns: Column[];
}

let nextConditionId = 1;
const generateConditionId = () => `cond_${Date.now()}_${nextConditionId++}`;

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ conditions, onChange, columns }) => {
  const { combinator, rules } = conditions;

  const addRule = () => {
    const newRule: ConditionRule = {
      id: generateConditionId(),
      column_id: '',
      operator: 'equals',
      value: '',
    };
    onChange({ ...conditions, rules: [...rules, newRule] });
  };

  const removeRule = (id: string) => {
    onChange({ ...conditions, rules: rules.filter((r) => r.id !== id) });
  };

  const updateRule = (id: string, updates: Partial<ConditionRule>) => {
    onChange({
      ...conditions,
      rules: rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    });
  };

  const toggleCombinator = () => {
    onChange({
      ...conditions,
      combinator: combinator === 'and' ? 'or' : 'and',
    });
  };

  const needsValue = (op: ConditionOperator) => VALUE_OPERATORS.includes(op);

  if (rules.length === 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={addRule}
        className="text-xs text-muted-foreground hover:text-foreground gap-1 w-full justify-start"
      >
        <Plus className="w-3 h-3" />
        Adicionar condicao
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
          Somente se
        </span>
        {rules.length > 1 && (
          <button
            onClick={toggleCombinator}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
          >
            {combinator === 'and' ? 'E' : 'OU'}
          </button>
        )}
      </div>

      {rules.map((rule, index) => (
        <div key={rule.id} className="flex items-start gap-1.5">
          {index > 0 && (
            <span className="text-[10px] font-bold text-muted-foreground uppercase mt-2 w-6 text-center flex-shrink-0">
              {combinator === 'and' ? 'E' : 'OU'}
            </span>
          )}
          <div className={`flex-1 grid gap-1.5 ${index === 0 ? '' : ''}`} style={{ gridTemplateColumns: needsValue(rule.operator) ? '1fr 1fr 1fr' : '1fr 1fr' }}>
            {/* Column select */}
            <Select
              value={rule.column_id}
              onValueChange={(val) => updateRule(rule.id, { column_id: val })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Coluna..." />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator select */}
            <Select
              value={rule.operator}
              onValueChange={(val) => updateRule(rule.id, { operator: val as ConditionOperator })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value input */}
            {needsValue(rule.operator) && (
              <Input
                value={rule.value}
                onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                placeholder="Valor..."
                className="h-7 text-xs"
              />
            )}
          </div>
          <button
            onClick={() => removeRule(rule.id)}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors mt-0.5 flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      <Button
        variant="ghost"
        size="sm"
        onClick={addRule}
        className="text-xs text-muted-foreground hover:text-foreground gap-1 h-6"
      >
        <Plus className="w-3 h-3" />
        Adicionar condicao
      </Button>
    </div>
  );
};

export default ConditionBuilder;
