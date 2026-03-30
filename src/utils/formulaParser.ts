import type { Column } from '@/types/board';

type TokenType = 'number' | 'string' | 'operator' | 'paren' | 'comma' | 'function' | 'column_ref' | 'comparison';

interface Token {
  type: TokenType;
  value: string;
}

/** Tokenize a formula string */
function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < formula.length) {
    const ch = formula[i];

    // Whitespace
    if (/\s/.test(ch)) { i++; continue; }

    // Column reference: {Column Name}
    if (ch === '{') {
      const end = formula.indexOf('}', i + 1);
      if (end === -1) throw new Error('Referência de coluna não fechada');
      tokens.push({ type: 'column_ref', value: formula.slice(i + 1, end) });
      i = end + 1;
      continue;
    }

    // String literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = '';
      i++;
      while (i < formula.length && formula[i] !== quote) {
        str += formula[i];
        i++;
      }
      if (i >= formula.length) throw new Error('String não fechada');
      i++; // skip closing quote
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Numbers
    if (/\d/.test(ch) || (ch === '.' && i + 1 < formula.length && /\d/.test(formula[i + 1]))) {
      let num = '';
      while (i < formula.length && (/\d/.test(formula[i]) || formula[i] === '.')) {
        num += formula[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // Comparison operators (>=, <=, !=, ==, >, <)
    if (ch === '>' || ch === '<' || ch === '!' || ch === '=') {
      if (i + 1 < formula.length && formula[i + 1] === '=') {
        tokens.push({ type: 'comparison', value: ch + '=' });
        i += 2;
        continue;
      }
      if (ch === '>' || ch === '<') {
        tokens.push({ type: 'comparison', value: ch });
        i++;
        continue;
      }
      // single = is not a valid operator in formulas, treat as comparison ==
      if (ch === '=') {
        tokens.push({ type: 'comparison', value: '==' });
        i++;
        continue;
      }
    }

    // Arithmetic operators
    if ('+-*/'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch });
      i++;
      continue;
    }

    // Parentheses
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }

    // Comma
    if (ch === ',') {
      tokens.push({ type: 'comma', value: ',' });
      i++;
      continue;
    }

    // Function names / identifiers
    if (/[a-zA-Z_]/.test(ch)) {
      let name = '';
      while (i < formula.length && /[a-zA-Z_0-9]/.test(formula[i])) {
        name += formula[i];
        i++;
      }
      tokens.push({ type: 'function', value: name.toUpperCase() });
      continue;
    }

    throw new Error(`Caractere inesperado: ${ch}`);
  }

  return tokens;
}

/** Recursive descent parser */
class Parser {
  private tokens: Token[];
  private pos: number;
  private columnValues: Record<string, any>;
  private columns: Column[];

  constructor(tokens: Token[], columnValues: Record<string, any>, columns: Column[]) {
    this.tokens = tokens;
    this.pos = 0;
    this.columnValues = columnValues;
    this.columns = columns;
  }

  private peek(): Token | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  private consume(): Token {
    if (this.pos >= this.tokens.length) throw new Error('Fim inesperado da fórmula');
    return this.tokens[this.pos++];
  }

  private expect(type: TokenType, value?: string): Token {
    const t = this.consume();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new Error(`Esperado ${type}${value ? ` '${value}'` : ''}, encontrado ${t.type} '${t.value}'`);
    }
    return t;
  }

  parse(): any {
    const result = this.parseComparison();
    if (this.pos < this.tokens.length) {
      throw new Error('Tokens inesperados no final da fórmula');
    }
    return result;
  }

  private parseComparison(): any {
    let left = this.parseExpression();
    const t = this.peek();
    if (t && t.type === 'comparison') {
      this.consume();
      const right = this.parseExpression();
      switch (t.value) {
        case '>': return left > right;
        case '<': return left < right;
        case '>=': return left >= right;
        case '<=': return left <= right;
        case '==': return left == right;
        case '!=': return left != right;
        default: return left;
      }
    }
    return left;
  }

  private parseExpression(): any {
    let left = this.parseTerm();
    while (this.peek()?.type === 'operator' && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.consume().value;
      const right = this.parseTerm();
      if (typeof left === 'string' || typeof right === 'string') {
        if (op === '+') left = String(left ?? '') + String(right ?? '');
        else left = Number(left) - Number(right);
      } else {
        left = op === '+' ? (Number(left) || 0) + (Number(right) || 0) : (Number(left) || 0) - (Number(right) || 0);
      }
    }
    return left;
  }

  private parseTerm(): any {
    let left = this.parseUnary();
    while (this.peek()?.type === 'operator' && (this.peek()!.value === '*' || this.peek()!.value === '/')) {
      const op = this.consume().value;
      const right = this.parseUnary();
      if (op === '*') left = (Number(left) || 0) * (Number(right) || 0);
      else {
        const r = Number(right) || 0;
        if (r === 0) throw new Error('Divisão por zero');
        left = (Number(left) || 0) / r;
      }
    }
    return left;
  }

  private parseUnary(): any {
    const t = this.peek();
    if (t?.type === 'operator' && t.value === '-') {
      this.consume();
      return -(Number(this.parsePrimary()) || 0);
    }
    return this.parsePrimary();
  }

  private parsePrimary(): any {
    const t = this.peek();
    if (!t) throw new Error('Expressão incompleta');

    // Number
    if (t.type === 'number') {
      this.consume();
      return parseFloat(t.value);
    }

    // String
    if (t.type === 'string') {
      this.consume();
      return t.value;
    }

    // Column reference
    if (t.type === 'column_ref') {
      this.consume();
      return this.resolveColumnRef(t.value);
    }

    // Parenthesized expression
    if (t.type === 'paren' && t.value === '(') {
      this.consume();
      const val = this.parseComparison();
      this.expect('paren', ')');
      return val;
    }

    // Function call
    if (t.type === 'function') {
      this.consume();
      const fname = t.value;
      this.expect('paren', '(');
      const args = this.parseArguments();
      this.expect('paren', ')');
      return this.callFunction(fname, args);
    }

    throw new Error(`Token inesperado: ${t.value}`);
  }

  private parseArguments(): any[] {
    const args: any[] = [];
    if (this.peek()?.type === 'paren' && this.peek()!.value === ')') {
      return args;
    }
    args.push(this.parseComparison());
    while (this.peek()?.type === 'comma') {
      this.consume();
      args.push(this.parseComparison());
    }
    return args;
  }

  private resolveColumnRef(columnName: string): any {
    // Find the column by title
    const col = this.columns.find(c => c.title.toLowerCase() === columnName.toLowerCase());
    if (!col) throw new Error(`#NAME?: Coluna "${columnName}" não encontrada`);
    const cv = this.columnValues[col.id];
    return cv?.value ?? null;
  }

  private callFunction(name: string, args: any[]): any {
    switch (name) {
      case 'SUM': {
        const values = this.flattenNumericArgs(args);
        return values.reduce((a, b) => a + b, 0);
      }
      case 'AVG': {
        const values = this.flattenNumericArgs(args);
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
      }
      case 'COUNT': {
        const values = args.flat();
        return values.filter(v => v != null && v !== '').length;
      }
      case 'MIN': {
        const values = this.flattenNumericArgs(args);
        if (values.length === 0) return 0;
        return Math.min(...values);
      }
      case 'MAX': {
        const values = this.flattenNumericArgs(args);
        if (values.length === 0) return 0;
        return Math.max(...values);
      }
      case 'IF': {
        if (args.length < 2) throw new Error('IF precisa de pelo menos 2 argumentos');
        const condition = args[0];
        return condition ? args[1] : (args[2] ?? '');
      }
      case 'CONCAT': {
        return args.map(a => String(a ?? '')).join('');
      }
      case 'DAYS_DIFF': {
        if (args.length < 2) throw new Error('DAYS_DIFF precisa de 2 datas');
        const d1 = new Date(args[0]);
        const d2 = new Date(args[1]);
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) throw new Error('Data inválida em DAYS_DIFF');
        return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      }
      case 'TODAY': {
        return new Date().toISOString().split('T')[0];
      }
      case 'ABS': {
        if (args.length < 1) throw new Error('ABS precisa de 1 argumento');
        return Math.abs(Number(args[0]) || 0);
      }
      case 'ROUND': {
        if (args.length < 1) throw new Error('ROUND precisa de pelo menos 1 argumento');
        const decimals = args.length > 1 ? Number(args[1]) || 0 : 0;
        return Number((Number(args[0]) || 0).toFixed(decimals));
      }
      default:
        throw new Error(`Função desconhecida: ${name}`);
    }
  }

  private flattenNumericArgs(args: any[]): number[] {
    const result: number[] = [];
    for (const a of args) {
      if (Array.isArray(a)) {
        for (const v of a) {
          const n = Number(v);
          if (!isNaN(n)) result.push(n);
        }
      } else {
        const n = Number(a);
        if (!isNaN(n)) result.push(n);
      }
    }
    return result;
  }
}

/**
 * Evaluate a formula string against column values.
 * @param formula - The formula string, e.g. "{Price} * {Quantity}"
 * @param columnValues - Record of column ID → ColumnValue (same as item.columnValues)
 * @param columns - Array of Column definitions for reference resolution
 * @returns The computed value or an error string like #ERROR or #REF
 */
export function evaluateFormula(
  formula: string,
  columnValues: Record<string, any>,
  columns: Column[]
): any {
  if (!formula || !formula.trim()) return '';
  try {
    const tokens = tokenize(formula);
    if (tokens.length === 0) return '';
    const parser = new Parser(tokens, columnValues, columns);
    const result = parser.parse();
    return result;
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.includes('#NAME?')) return '#NAME?';
    if (msg.includes('#REF')) return '#REF!';
    return '#ERR!';
  }
}

/**
 * Extract column names referenced in a formula (for dependency tracking).
 */
export function extractColumnRefs(formula: string): string[] {
  const refs: string[] = [];
  const regex = /\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(formula)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

/**
 * Detect circular references in formula columns using DFS.
 * @param columnName - The column being checked (case-insensitive match)
 * @param formulas - Map of column title (lowercase) → formula string
 * @param visited - Internal set for DFS traversal (do not pass from outside)
 * @returns true if a circular reference is detected
 */
export function hasCircularRef(
  columnName: string,
  formulas: Record<string, string>,
  visited: Set<string> = new Set()
): boolean {
  const key = columnName.toLowerCase();
  if (visited.has(key)) return true;
  visited.add(key);
  const formula = formulas[key];
  if (!formula) return false;
  const refs = extractColumnRefs(formula);
  return refs.some(ref => hasCircularRef(ref, formulas, new Set(visited)));
}
