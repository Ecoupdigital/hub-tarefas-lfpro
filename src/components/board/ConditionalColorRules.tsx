import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, Trash2, GripVertical, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Column } from '@/types/board';

export interface ColorRule {
  id: string;
  columnId: string;
  operator: 'é' | 'não é' | 'contém' | 'maior que' | 'menor que' | 'está vazio';
  value: string;
  style: {
    backgroundColor: string;
    textColor: string;
    fontWeight?: 'normal' | 'bold';
  };
}

const OPERATORS = [
  { value: 'é', label: 'é' },
  { value: 'não é', label: 'não é' },
  { value: 'contém', label: 'contém' },
  { value: 'maior que', label: 'maior que' },
  { value: 'menor que', label: 'menor que' },
  { value: 'está vazio', label: 'está vazio' },
] as const;

const DEFAULT_COLORS = [
  '#E2445C', '#FDAB3D', '#00C875', '#579BFC',
  '#A25DDC', '#037F4C', '#FF642E', '#CAB641',
  '#FFCB00', '#BB3354', '#FF158A', '#FF5AC4',
  '#784BD1', '#7F5347', '#66CCFF', '#9AADBD',
];

interface ConditionalColorRulesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY_PREFIX = 'lfpro-color-rules-';

export const getColorRulesForBoard = (boardId: string): ColorRule[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + boardId);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveColorRulesForBoard = (boardId: string, rules: ColorRule[]) => {
  localStorage.setItem(STORAGE_KEY_PREFIX + boardId, JSON.stringify(rules));
};

const ConditionalColorRules: React.FC<ConditionalColorRulesProps> = ({ open, onOpenChange }) => {
  const { activeBoard } = useApp();

  const [rules, setRules] = useState<ColorRule[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset rules when dialog opens
  React.useEffect(() => {
    if (open && activeBoard) {
      setRules(getColorRulesForBoard(activeBoard.id));
    }
  }, [open, activeBoard]);

  if (!activeBoard) return null;

  const columns = activeBoard.columns;

  const addRule = () => {
    const newRule: ColorRule = {
      id: Math.random().toString(36).slice(2, 10),
      columnId: columns[0]?.id || '',
      operator: 'é',
      value: '',
      style: {
        backgroundColor: '#579BFC',
        textColor: '#FFFFFF',
        fontWeight: 'normal',
      },
    };
    setRules(prev => [...prev, newRule]);
  };

  const updateRule = (id: string, updates: Partial<ColorRule>) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const updateRuleStyle = (id: string, styleUpdates: Partial<ColorRule['style']>) => {
    setRules(prev => prev.map(r =>
      r.id === id ? { ...r, style: { ...r.style, ...styleUpdates } } : r
    ));
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleSave = () => {
    setSaving(true);
    try {
      saveColorRulesForBoard(activeBoard.id, rules);
      // Dispatch a custom event so BoardTable can react
      window.dispatchEvent(new CustomEvent('color-rules-changed', { detail: { boardId: activeBoard.id } }));
      toast.success('Regras de cor salvas');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao salvar regras');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Regras de cor condicionais
          </DialogTitle>
          <DialogDescription>
            Defina regras para colorir linhas automaticamente com base nos valores das colunas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {rules.length === 0 && (
            <p className="font-density-cell text-muted-foreground text-center py-6">
              Nenhuma regra definida. Clique em "Adicionar regra" para comecar.
            </p>
          )}

          {rules.map((rule, index) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              index={index}
              columns={columns}
              onUpdate={(updates) => updateRule(rule.id, updates)}
              onUpdateStyle={(styleUpdates) => updateRuleStyle(rule.id, styleUpdates)}
              onRemove={() => removeRule(rule.id)}
            />
          ))}

          <button
            onClick={addRule}
            className="flex items-center gap-1.5 px-3 py-2 font-density-cell text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors w-full justify-center border border-dashed border-border"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar regra
          </button>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 font-density-cell rounded-md text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 font-density-cell rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar regras'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface RuleRowProps {
  rule: ColorRule;
  index: number;
  columns: Column[];
  onUpdate: (updates: Partial<ColorRule>) => void;
  onUpdateStyle: (styleUpdates: Partial<ColorRule['style']>) => void;
  onRemove: () => void;
}

const RuleRow: React.FC<RuleRowProps> = ({ rule, index, columns, onUpdate, onUpdateStyle, onRemove }) => {
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showTextPicker, setShowTextPicker] = useState(false);

  const needsValue = rule.operator !== 'está vazio';

  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <span className="font-density-tiny text-muted-foreground font-medium">Regra {index + 1}</span>
        <div className="flex-1" />
        <button onClick={onRemove} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-density-cell text-muted-foreground">Quando</span>
        <select
          value={rule.columnId}
          onChange={(e) => onUpdate({ columnId: e.target.value })}
          className="h-7 px-2 rounded border border-border bg-background font-density-cell text-foreground outline-none"
        >
          {columns.map(col => (
            <option key={col.id} value={col.id}>{col.title}</option>
          ))}
        </select>

        <select
          value={rule.operator}
          onChange={(e) => onUpdate({ operator: e.target.value as ColorRule['operator'] })}
          className="h-7 px-2 rounded border border-border bg-background font-density-cell text-foreground outline-none"
        >
          {OPERATORS.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>

        {needsValue && (
          <input
            value={rule.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="Valor..."
            className="h-7 px-2 rounded border border-border bg-background font-density-cell text-foreground outline-none w-28"
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="font-density-cell text-muted-foreground">Estilo:</span>

        {/* Background color */}
        <div className="relative">
          <button
            onClick={() => { setShowBgPicker(!showBgPicker); setShowTextPicker(false); }}
            className="flex items-center gap-1.5 h-7 px-2 rounded border border-border font-density-cell hover:bg-muted transition-colors"
          >
            <div className="w-3.5 h-3.5 rounded-sm border border-border" style={{ backgroundColor: rule.style.backgroundColor }} />
            <span className="text-muted-foreground">Fundo</span>
          </button>
          {showBgPicker && (
            <div className="absolute top-full mt-1 left-0 bg-popover border border-border rounded-md shadow-lg p-2 z-50 w-40">
              <div className="grid grid-cols-4 gap-1 mb-2">
                {DEFAULT_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => { onUpdateStyle({ backgroundColor: color }); setShowBgPicker(false); }}
                    className="w-7 h-7 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={rule.style.backgroundColor}
                onChange={(e) => onUpdateStyle({ backgroundColor: e.target.value })}
                className="w-full h-7 rounded cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Text color */}
        <div className="relative">
          <button
            onClick={() => { setShowTextPicker(!showTextPicker); setShowBgPicker(false); }}
            className="flex items-center gap-1.5 h-7 px-2 rounded border border-border font-density-cell hover:bg-muted transition-colors"
          >
            <div className="w-3.5 h-3.5 rounded-sm border border-border" style={{ backgroundColor: rule.style.textColor }} />
            <span className="text-muted-foreground">Texto</span>
          </button>
          {showTextPicker && (
            <div className="absolute top-full mt-1 left-0 bg-popover border border-border rounded-md shadow-lg p-2 z-50 w-40">
              <div className="grid grid-cols-4 gap-1 mb-2">
                {['#FFFFFF', '#000000', '#333333', '#666666', ...DEFAULT_COLORS.slice(0, 12)].map(color => (
                  <button
                    key={color}
                    onClick={() => { onUpdateStyle({ textColor: color }); setShowTextPicker(false); }}
                    className="w-7 h-7 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={rule.style.textColor}
                onChange={(e) => onUpdateStyle({ textColor: e.target.value })}
                className="w-full h-7 rounded cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Font weight toggle */}
        <button
          onClick={() => onUpdateStyle({ fontWeight: rule.style.fontWeight === 'bold' ? 'normal' : 'bold' })}
          className={`h-7 px-2 rounded border font-density-cell font-bold transition-colors ${
            rule.style.fontWeight === 'bold' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          N
        </button>

        {/* Preview */}
        <div
          className="h-7 px-3 rounded flex items-center font-density-cell ml-auto"
          style={{
            backgroundColor: rule.style.backgroundColor,
            color: rule.style.textColor,
            fontWeight: rule.style.fontWeight || 'normal',
          }}
        >
          Exemplo
        </div>
      </div>
    </div>
  );
};

// Utility function to evaluate rules against a row
export const evaluateColorRules = (
  rules: ColorRule[],
  columnValues: Record<string, { value: any }>,
  columns: Column[]
): React.CSSProperties | null => {
  if (!rules || rules.length === 0) return null;

  let matchedStyle: React.CSSProperties | null = null;

  for (const rule of rules) {
    const cv = columnValues[rule.columnId];
    const rawVal = cv?.value;
    const col = columns.find(c => c.id === rule.columnId);

    // For status columns, resolve the display name
    let cellValue = '';
    if (col?.type === 'status' && col.settings.labels && rawVal != null) {
      const label = col.settings.labels[String(rawVal)];
      cellValue = label?.name || String(rawVal);
    } else {
      cellValue = rawVal != null ? String(rawVal) : '';
    }

    let matches = false;
    switch (rule.operator) {
      case 'é':
        matches = cellValue.toLowerCase() === rule.value.toLowerCase();
        break;
      case 'não é':
        matches = cellValue.toLowerCase() !== rule.value.toLowerCase();
        break;
      case 'contém':
        matches = cellValue.toLowerCase().includes(rule.value.toLowerCase());
        break;
      case 'maior que': {
        const numVal = parseFloat(cellValue);
        const numRule = parseFloat(rule.value);
        matches = !isNaN(numVal) && !isNaN(numRule) && numVal > numRule;
        break;
      }
      case 'menor que': {
        const numVal = parseFloat(cellValue);
        const numRule = parseFloat(rule.value);
        matches = !isNaN(numVal) && !isNaN(numRule) && numVal < numRule;
        break;
      }
      case 'está vazio':
        matches = cellValue === '' || rawVal == null;
        break;
    }

    if (matches) {
      matchedStyle = {
        backgroundColor: rule.style.backgroundColor,
        color: rule.style.textColor,
        fontWeight: rule.style.fontWeight || 'normal',
      };
      break; // first-match-wins: stop evaluating after first matching rule
    }
  }

  return matchedStyle;
};

export default ConditionalColorRules;
