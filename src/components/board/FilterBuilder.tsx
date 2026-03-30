import React, { useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { Column, ColumnType } from '@/types/board';

// --- Types ---

export type FilterOperator =
  | 'is' | 'is_not' | 'contains' | 'starts_with' | 'ends_with'
  | 'gt' | 'lt' | 'between'
  | 'is_empty' | 'is_not_empty'
  | 'checked' | 'unchecked';

export type FilterCombinator = 'and' | 'or';

export interface FilterRule {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: any;
}

export interface FilterGroup {
  combinator: FilterCombinator;
  rules: FilterRule[];
}

// --- Operator definitions per column type ---

interface OperatorDef {
  value: FilterOperator;
  label: string;
  needsValue: boolean;
  needsSecondValue?: boolean;
}

const OPERATORS_BY_TYPE: Record<string, OperatorDef[]> = {
  text: [
    { value: 'contains', label: 'contém', needsValue: true },
    { value: 'is', label: 'igual', needsValue: true },
    { value: 'starts_with', label: 'começa com', needsValue: true },
    { value: 'ends_with', label: 'termina com', needsValue: true },
    { value: 'is_empty', label: 'está vazio', needsValue: false },
    { value: 'is_not_empty', label: 'não está vazio', needsValue: false },
  ],
  long_text: [
    { value: 'contains', label: 'contém', needsValue: true },
    { value: 'is_empty', label: 'está vazio', needsValue: false },
    { value: 'is_not_empty', label: 'não está vazio', needsValue: false },
  ],
  number: [
    { value: 'is', label: 'igual', needsValue: true },
    { value: 'gt', label: 'maior que', needsValue: true },
    { value: 'lt', label: 'menor que', needsValue: true },
    { value: 'between', label: 'entre', needsValue: true, needsSecondValue: true },
    { value: 'is_empty', label: 'está vazio', needsValue: false },
  ],
  status: [
    { value: 'is', label: 'é', needsValue: true },
    { value: 'is_not', label: 'não é', needsValue: true },
  ],
  dropdown: [
    { value: 'is', label: 'é', needsValue: true },
    { value: 'is_not', label: 'não é', needsValue: true },
  ],
  date: [
    { value: 'is', label: 'é', needsValue: true },
    { value: 'lt', label: 'antes de', needsValue: true },
    { value: 'gt', label: 'depois de', needsValue: true },
    { value: 'between', label: 'entre', needsValue: true, needsSecondValue: true },
    { value: 'is_empty', label: 'está vazio', needsValue: false },
  ],
  people: [
    { value: 'is', label: 'é', needsValue: true },
    { value: 'is_not', label: 'não é', needsValue: true },
    { value: 'is_empty', label: 'está vazio', needsValue: false },
  ],
  checkbox: [
    { value: 'checked', label: 'marcado', needsValue: false },
    { value: 'unchecked', label: 'desmarcado', needsValue: false },
  ],
  rating: [
    { value: 'is', label: 'igual', needsValue: true },
    { value: 'gt', label: 'maior que', needsValue: true },
    { value: 'lt', label: 'menor que', needsValue: true },
  ],
  progress: [
    { value: 'is', label: 'igual', needsValue: true },
    { value: 'gt', label: 'maior que', needsValue: true },
    { value: 'lt', label: 'menor que', needsValue: true },
  ],
  tags: [
    { value: 'contains', label: 'contém', needsValue: true },
    { value: 'is_empty', label: 'está vazio', needsValue: false },
  ],
  email: [
    { value: 'contains', label: 'contém', needsValue: true },
    { value: 'is', label: 'igual', needsValue: true },
    { value: 'is_empty', label: 'está vazio', needsValue: false },
  ],
  phone: [
    { value: 'contains', label: 'contém', needsValue: true },
    { value: 'is_empty', label: 'está vazio', needsValue: false },
  ],
  link: [
    { value: 'contains', label: 'contém', needsValue: true },
    { value: 'is_empty', label: 'está vazio', needsValue: false },
  ],
};

// Fallback operators for types not explicitly listed
const DEFAULT_OPERATORS: OperatorDef[] = [
  { value: 'is', label: 'é', needsValue: true },
  { value: 'is_not', label: 'não é', needsValue: true },
  { value: 'is_empty', label: 'está vazio', needsValue: false },
  { value: 'is_not_empty', label: 'não está vazio', needsValue: false },
];

function getOperatorsForType(type: ColumnType): OperatorDef[] {
  return OPERATORS_BY_TYPE[type] || DEFAULT_OPERATORS;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// --- Evaluate filter logic (exported for AppContext) ---

export function evaluateFilterGroup(
  filterGroup: FilterGroup,
  itemColumnValues: Record<string, { value: any }>,
  columns: Column[],
): boolean {
  if (filterGroup.rules.length === 0) return true;

  const results = filterGroup.rules.map(rule => {
    const cv = itemColumnValues[rule.columnId];
    const val = cv?.value;
    const col = columns.find(c => c.id === rule.columnId);
    if (!col) return true;

    return evaluateRule(rule, val, col);
  });

  if (filterGroup.combinator === 'and') {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}

function evaluateRule(rule: FilterRule, val: any, col: Column): boolean {
  const strVal = val != null ? String(val).toLowerCase() : '';
  const ruleVal = rule.value != null ? String(rule.value).toLowerCase() : '';
  const isEmpty = val == null || val === '' || val === undefined;

  switch (rule.operator) {
    case 'is':
      if (col.type === 'status' || col.type === 'dropdown') {
        return String(val) === String(rule.value);
      }
      if (col.type === 'date') {
        return strVal === ruleVal;
      }
      if (col.type === 'number' || col.type === 'rating' || col.type === 'progress') {
        return Number(val) === Number(rule.value);
      }
      if (col.type === 'people') {
        // people value can be a single id or comma-separated
        const peopleArr = strVal.split(',').map(s => s.trim());
        return peopleArr.includes(ruleVal);
      }
      return strVal === ruleVal;

    case 'is_not':
      if (col.type === 'status' || col.type === 'dropdown') {
        return String(val) !== String(rule.value);
      }
      if (col.type === 'people') {
        const peopleArr = strVal.split(',').map(s => s.trim());
        return !peopleArr.includes(ruleVal);
      }
      return strVal !== ruleVal;

    case 'contains':
      return strVal.includes(ruleVal);

    case 'starts_with':
      return strVal.startsWith(ruleVal);

    case 'ends_with':
      return strVal.endsWith(ruleVal);

    case 'gt':
      if (col.type === 'date') {
        return strVal > ruleVal;
      }
      return Number(val) > Number(rule.value);

    case 'lt':
      if (col.type === 'date') {
        return strVal < ruleVal;
      }
      return Number(val) < Number(rule.value);

    case 'between': {
      const [min, max] = Array.isArray(rule.value) ? rule.value : [rule.value, rule.value];
      if (col.type === 'date') {
        return strVal >= String(min).toLowerCase() && strVal <= String(max).toLowerCase();
      }
      return Number(val) >= Number(min) && Number(val) <= Number(max);
    }

    case 'is_empty':
      return isEmpty;

    case 'is_not_empty':
      return !isEmpty;

    case 'checked':
      return val === true || val === 'true' || val === 1 || val === '1';

    case 'unchecked':
      return !val || val === false || val === 'false' || val === 0 || val === '0' || val == null;

    default:
      return true;
  }
}

// --- Component ---

interface FilterBuilderProps {
  columns: Column[];
  filterGroup: FilterGroup;
  onChange: (fg: FilterGroup) => void;
  users?: { id: string; name: string }[];
}

const FilterBuilder: React.FC<FilterBuilderProps> = ({ columns, filterGroup, onChange, users = [] }) => {
  const addRule = () => {
    const firstCol = columns[0];
    if (!firstCol) return;
    const ops = getOperatorsForType(firstCol.type);
    const newRule: FilterRule = {
      id: generateId(),
      columnId: firstCol.id,
      operator: ops[0].value,
      value: '',
    };
    onChange({ ...filterGroup, rules: [...filterGroup.rules, newRule] });
  };

  const removeRule = (ruleId: string) => {
    onChange({ ...filterGroup, rules: filterGroup.rules.filter(r => r.id !== ruleId) });
  };

  const updateRule = (ruleId: string, updates: Partial<FilterRule>) => {
    onChange({
      ...filterGroup,
      rules: filterGroup.rules.map(r => r.id === ruleId ? { ...r, ...updates } : r),
    });
  };

  const toggleCombinator = () => {
    onChange({ ...filterGroup, combinator: filterGroup.combinator === 'and' ? 'or' : 'and' });
  };

  const clearAll = () => {
    onChange({ combinator: 'and', rules: [] });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <p className="font-density-cell font-medium text-foreground">Filtros avancados</p>
          {filterGroup.rules.length > 0 && (
            <span className="font-density-tiny text-muted-foreground">
              {filterGroup.rules.length} filtro{filterGroup.rules.length !== 1 ? 's' : ''} ativo{filterGroup.rules.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {filterGroup.rules.length > 0 && (
          <button onClick={clearAll} className="font-density-tiny text-destructive hover:underline">
            Limpar filtros
          </button>
        )}
      </div>

      {filterGroup.rules.length > 1 && (
        <div className="flex items-center gap-1 mb-2">
          <span className="font-density-tiny text-muted-foreground">Combinar regras com:</span>
          <button
            onClick={toggleCombinator}
            className={`px-2 py-0.5 rounded font-density-tiny font-bold transition-colors ${
              filterGroup.combinator === 'and'
                ? 'bg-primary/10 text-primary'
                : 'bg-orange-500/15 text-orange-600'
            }`}
          >
            {filterGroup.combinator === 'and' ? 'E (AND)' : 'OU (OR)'}
          </button>
        </div>
      )}

      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {filterGroup.rules.map((rule, idx) => (
          <FilterRuleRow
            key={rule.id}
            rule={rule}
            columns={columns}
            users={users}
            onChange={(updates) => updateRule(rule.id, updates)}
            onRemove={() => removeRule(rule.id)}
            showCombinator={idx > 0}
            combinator={filterGroup.combinator}
          />
        ))}
      </div>

      <button
        onClick={addRule}
        className="flex items-center gap-1 font-density-cell text-primary hover:text-primary/80 font-medium mt-1 transition-colors"
      >
        <Plus className="w-3 h-3" /> Adicionar filtro
      </button>
    </div>
  );
};

// --- Single filter rule row ---

interface FilterRuleRowProps {
  rule: FilterRule;
  columns: Column[];
  users: { id: string; name: string }[];
  onChange: (updates: Partial<FilterRule>) => void;
  onRemove: () => void;
  showCombinator: boolean;
  combinator: FilterCombinator;
}

const FilterRuleRow: React.FC<FilterRuleRowProps> = ({
  rule, columns, users, onChange, onRemove, showCombinator, combinator,
}) => {
  const column = columns.find(c => c.id === rule.columnId);
  const colType = column?.type || 'text';
  const operators = useMemo(() => getOperatorsForType(colType), [colType]);
  const currentOp = operators.find(o => o.value === rule.operator) || operators[0];

  const handleColumnChange = (colId: string) => {
    const newCol = columns.find(c => c.id === colId);
    if (!newCol) return;
    const newOps = getOperatorsForType(newCol.type);
    onChange({
      columnId: colId,
      operator: newOps[0].value,
      value: '',
    });
  };

  const handleOperatorChange = (op: string) => {
    const opDef = operators.find(o => o.value === op);
    if (opDef && !opDef.needsValue) {
      onChange({ operator: op as FilterOperator, value: '' });
    } else if (opDef?.needsSecondValue) {
      onChange({ operator: op as FilterOperator, value: ['', ''] });
    } else {
      onChange({ operator: op as FilterOperator });
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {showCombinator && (
        <span className={`font-density-badge font-bold px-1.5 py-0.5 rounded ${
          combinator === 'and' ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-600'
        }`}>
          {combinator === 'and' ? 'E' : 'OU'}
        </span>
      )}

      {/* Column selector */}
      <Select value={rule.columnId} onValueChange={handleColumnChange}>
        <SelectTrigger className="h-7 w-[110px] font-density-cell px-2 border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {columns.map(col => (
            <SelectItem key={col.id} value={col.id} className="font-density-cell">{col.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select value={rule.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="h-7 w-[110px] font-density-cell px-2 border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map(op => (
            <SelectItem key={op.value} value={op.value} className="font-density-cell">{op.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input */}
      {currentOp?.needsValue && (
        <FilterValueInput
          rule={rule}
          column={column!}
          users={users}
          currentOp={currentOp}
          onChange={onChange}
        />
      )}

      <button onClick={onRemove} className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
};

// --- Value input (changes based on column type) ---

interface FilterValueInputProps {
  rule: FilterRule;
  column: Column;
  users: { id: string; name: string }[];
  currentOp: OperatorDef;
  onChange: (updates: Partial<FilterRule>) => void;
}

const FilterValueInput: React.FC<FilterValueInputProps> = ({ rule, column, users, currentOp, onChange }) => {
  // Status / dropdown: show label options
  if (column.type === 'status' || column.type === 'dropdown') {
    const labels = column.settings.labels || {};
    const options = column.settings.options || [];

    if (column.type === 'status' && Object.keys(labels).length > 0) {
      return (
        <Select value={String(rule.value)} onValueChange={v => onChange({ value: v })}>
          <SelectTrigger className="h-7 w-[110px] font-density-cell px-2 border-border">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(labels).map(([key, label]) => (
              <SelectItem key={key} value={key} className="font-density-cell">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: label.color }} />
                  {label.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (options.length > 0) {
      return (
        <Select value={String(rule.value)} onValueChange={v => onChange({ value: v })}>
          <SelectTrigger className="h-7 w-[110px] font-density-cell px-2 border-border">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt} value={opt} className="font-density-cell">{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
  }

  // People: show user list
  if (column.type === 'people') {
    return (
      <Select value={String(rule.value)} onValueChange={v => onChange({ value: v })}>
        <SelectTrigger className="h-7 w-[110px] font-density-cell px-2 border-border">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          {users.map(u => (
            <SelectItem key={u.id} value={u.id} className="font-density-cell">{u.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Date: date input(s)
  if (column.type === 'date' || column.type === 'timeline') {
    if (currentOp.needsSecondValue) {
      const [min, max] = Array.isArray(rule.value) ? rule.value : ['', ''];
      return (
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={min}
            onChange={e => onChange({ value: [e.target.value, max] })}
            className="h-7 w-[110px] font-density-cell px-2 border-border"
          />
          <span className="font-density-tiny text-muted-foreground">e</span>
          <Input
            type="date"
            value={max}
            onChange={e => onChange({ value: [min, e.target.value] })}
            className="h-7 w-[110px] font-density-cell px-2 border-border"
          />
        </div>
      );
    }
    return (
      <Input
        type="date"
        value={rule.value || ''}
        onChange={e => onChange({ value: e.target.value })}
        className="h-7 w-[110px] font-density-cell px-2 border-border"
      />
    );
  }

  // Number / rating / progress with between
  if ((column.type === 'number' || column.type === 'rating' || column.type === 'progress') && currentOp.needsSecondValue) {
    const [min, max] = Array.isArray(rule.value) ? rule.value : ['', ''];
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={min}
          onChange={e => onChange({ value: [e.target.value, max] })}
          className="h-7 w-[70px] font-density-cell px-2 border-border"
          placeholder="Min"
        />
        <span className="font-density-tiny text-muted-foreground">e</span>
        <Input
          type="number"
          value={max}
          onChange={e => onChange({ value: [min, e.target.value] })}
          className="h-7 w-[70px] font-density-cell px-2 border-border"
          placeholder="Max"
        />
      </div>
    );
  }

  // Number / rating / progress: number input
  if (column.type === 'number' || column.type === 'rating' || column.type === 'progress') {
    return (
      <Input
        type="number"
        value={rule.value || ''}
        onChange={e => onChange({ value: e.target.value })}
        className="h-7 w-[90px] font-density-cell px-2 border-border"
        placeholder="Valor..."
      />
    );
  }

  // Default: text input
  return (
    <Input
      type="text"
      value={rule.value || ''}
      onChange={e => onChange({ value: e.target.value })}
      className="h-7 w-[110px] font-density-cell px-2 border-border"
      placeholder="Valor..."
    />
  );
};

export default FilterBuilder;
