import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const NOTION_DIR = join(process.cwd(), 'src/components/database/notion');

/**
 * Lista de tokens LFPro proibidos em arquivos Notion*View.
 * Garante paleta cinza pura, sem warm gold ou font heading LFPro.
 *
 * Usamos regex com word-boundary (limites) para evitar falso positivo
 * com `--notion-text-primary` quando procuramos `text-primary`.
 */
const FORBIDDEN_TOKENS: { token: string; regex: RegExp }[] = [
  // Classes Tailwind warm gold LFPro. Excluimos --notion-* via regex.
  { token: 'bg-primary', regex: /(?<![-\w])bg-primary(?![-\w])/ },
  { token: 'text-primary', regex: /(?<![-\w])text-primary(?![-\w])/ },
  { token: 'border-primary', regex: /(?<![-\w])border-primary(?![-\w])/ },
  { token: 'ring-primary', regex: /(?<![-\w])ring-primary(?![-\w])/ },
  // Fontes LFPro (Montserrat / Jost)
  { token: 'font-heading', regex: /(?<![-\w])font-heading(?![-\w])/ },
  // Tokens warm gold custom
  { token: 'warm-gold', regex: /(?<![-\w])warm-gold(?![-\w])/ },
  // CSS variable LFPro `--primary` (sem prefixo --notion-)
  { token: '--primary', regex: /(?<![-\w])--primary(?![-\w])/ },
];

/**
 * Excecoes: trechos onde o termo aparece mas e legitimo (ex: comentarios).
 * Formato: `${file}:${linha}:${token}`.
 */
const ALLOWED_OCCURRENCES = new Set<string>([
  // Nenhuma excecao atualmente.
]);

function listTsxFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    .filter((f) => f !== '.gitkeep')
    .map((f) => join(dir, f));
}

describe('Notion views — paleta cinza pura (Fase 03 REQ-27)', () => {
  const files = listTsxFiles(NOTION_DIR);

  it('lista arquivos Notion* (sanity check)', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith('NotionTableView.tsx'))).toBe(true);
    expect(files.some((f) => f.endsWith('NotionKanbanView.tsx'))).toBe(true);
    expect(files.some((f) => f.endsWith('NotionCalendarView.tsx'))).toBe(true);
    expect(files.some((f) => f.endsWith('NotionListView.tsx'))).toBe(true);
  });

  it('NAO usa tokens warm gold LFPro (bg-primary, text-primary, font-heading, etc.)', () => {
    const violations: { file: string; token: string; line: number; text: string }[] = [];
    files.forEach((file) => {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((text, idx) => {
        // Ignora linhas de comentario
        const stripped = text.trim();
        if (stripped.startsWith('//') || stripped.startsWith('*') || stripped.startsWith('/*')) return;

        FORBIDDEN_TOKENS.forEach(({ token, regex }) => {
          if (regex.test(text)) {
            const occurrence = `${file}:${idx + 1}:${token}`;
            if (!ALLOWED_OCCURRENCES.has(occurrence)) {
              violations.push({ file, token, line: idx + 1, text: text.trim() });
            }
          }
        });
      });
    });

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `${v.file}:${v.line} usa '${v.token}' em: ${v.text.slice(0, 80)}`)
        .join('\n');
      throw new Error(`Tokens LFPro proibidos detectados em arquivos Notion:\n${summary}`);
    }
    expect(violations).toEqual([]);
  });

  it('USA variaveis CSS --notion-* (paleta cinza)', () => {
    // Pelo menos um arquivo deve usar variavel Notion (sanity check)
    const allContent = files.map((f) => readFileSync(f, 'utf-8')).join('\n');
    expect(allContent).toMatch(/--notion-(bg|border|text-primary|text-secondary|panel)/);
  });
});
