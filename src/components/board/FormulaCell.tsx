import React, { useMemo } from 'react';
import { evaluateFormula, hasCircularRef, extractColumnRefs } from '@/utils/formulaParser';
import type { Column } from '@/types/board';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FormulaCellProps {
  formula: string;
  columnTitle: string;
  columnValues: Record<string, any>;
  columns: Column[];
  onEditFormula?: (newFormula: string) => void;
}

const FormulaCell: React.FC<FormulaCellProps> = ({ formula, columnTitle, columnValues, columns, onEditFormula }) => {
  // Build a map of column title (lowercase) → formula for circular reference detection
  const allFormulas = useMemo(() => {
    const map: Record<string, string> = {};
    for (const col of columns) {
      if (col.type === 'formula' && col.settings.formula) {
        map[col.title.toLowerCase()] = col.settings.formula;
      }
    }
    return map;
  }, [columns]);

  const result = useMemo(() => {
    if (!formula || !formula.trim()) return '—';
    // Check for circular reference before evaluating
    if (hasCircularRef(columnTitle, allFormulas)) return '#REF!';
    return evaluateFormula(formula, columnValues, columns);
  }, [formula, columnTitle, columnValues, columns, allFormulas]);

  const formatResult = (val: any): string => {
    if (val == null || val === '' || val === '—') return '—';
    if (typeof val === 'string' && (val === '#REF!' || val === '#NAME?' || val === '#ERR!')) return val;
    if (typeof val === 'number') {
      if (Number.isInteger(val)) return new Intl.NumberFormat('pt-BR').format(val);
      return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    }
    if (typeof val === 'boolean') return val ? 'Verdadeiro' : 'Falso';
    return String(val);
  };

  const isError = typeof result === 'string' && (result === '#REF!' || result === '#NAME?' || result === '#ERR!');

  const getTooltipMessage = (): string => {
    if (result === '#REF!') return 'Referência circular detectada nesta fórmula';
    if (result === '#NAME?') {
      // Identify which column references are missing
      const refs = extractColumnRefs(formula);
      const missing = refs.filter(ref => !columns.some(c => c.title.toLowerCase() === ref.toLowerCase()));
      return missing.length > 0
        ? `Colunas não encontradas: ${missing.join(', ')}`
        : 'Referência de coluna inválida';
    }
    if (result === '#ERR!') return 'Erro ao calcular a fórmula. Verifique a expressão.';
    return `Fórmula: ${formula || '(vazia)'}`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => {
              if (onEditFormula) {
                onEditFormula(formula);
              }
            }}
            className={`w-full h-full flex items-center justify-center font-density-cell px-2 truncate ${
              isError ? 'text-destructive font-medium' : 'text-foreground'
            }`}
          >
            {formatResult(result)}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[300px]">
          <p className="font-density-tiny font-mono text-muted-foreground">
            {isError ? (
              <span className="font-medium text-destructive">{getTooltipMessage()}</span>
            ) : (
              <>
                <span className="font-medium text-foreground">Fórmula:</span> {formula || '(vazia)'}
              </>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FormulaCell;
