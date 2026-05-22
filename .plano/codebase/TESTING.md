# Padroes de Teste

**Data da Analise:** 2026-05-22

## Framework de Teste

### Unit / Integration: Vitest

**Versao:** `vitest@^3.2.4` + `@vitejs/plugin-react-swc@^3.11.0`

**Config:** `vitest.config.ts`
```ts
{
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
  include: ['src/**/*.{test,spec}.{ts,tsx}'],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
}
```

**Caracteristicas:**
- Ambiente `jsdom` (`jsdom@^29.0.1`) para componentes React
- `globals: true` - `describe`, `it`, `expect`, `vi` disponiveis sem import (apesar disso o codebase importa explicitamente, ver abaixo)
- Path alias `@/*` espelha o do app
- Setup file injeta `@testing-library/jest-dom` e mock de `window.matchMedia`

### Testing Library

**Stack:**
- `@testing-library/react@^16.0.0`
- `@testing-library/jest-dom@^6.6.0` (matchers como `toBeInTheDocument`)
- Setup automatico em `src/test/setup.ts`

### E2E: Playwright (configurado, NAO usado ainda)

**Versao:** `@playwright/test@^1.58.2`

**Config:** `playwright.config.ts`
- `testDir: './tests'` - **diretorio NAO existe no repo**
- `testMatch: '**/*.ts'`
- `timeout: 600_000` (10 min por teste)
- `baseURL: 'http://localhost:8080'` (mesma porta do `vite dev`)
- `headless: false` - roda com browser visivel
- `fullyParallel: false`, `workers: 1`, `retries: 0`
- `trace`, `screenshot`, `video` apenas em falha
- Apenas projeto `chromium`

**Status:** Config presente, pasta `tests/` ausente. Nenhum teste E2E escrito. Sem script npm para Playwright.

## Comandos

```bash
npm run test         # Vitest single run (vitest run)
npm run test:watch   # Vitest watch mode (vitest)
```

**Para Playwright (manualmente, sem npm script):**
```bash
npx playwright test
npx playwright test --ui
```

**Sem comando de coverage configurado.** Para gerar coverage manualmente:
```bash
npx vitest run --coverage
```

## Localizacao dos Testes

**Centralizada em `src/test/`** (nao co-localizada com componentes):

| Arquivo | Linhas | Cobertura |
|---------|--------|-----------|
| `src/test/setup.ts` | 15 | Setup global (jest-dom, matchMedia mock) |
| `src/test/example.test.ts` | 7 | Smoke test placeholder |
| `src/test/utils.test.ts` | 370 | `formulaParser`, `DateCell` parse/serialize, `TimeTrackingDetailModal` helpers |
| `src/test/filter.test.ts` | 284 | `evaluateFilterGroup` (FilterBuilder) para todos os tipos de coluna |
| `src/test/dateTimeSupport.test.ts` | 127 | `parseDateValue` / `serializeDateValue` + sort logic |
| `src/test/work-components.test.ts` | 313 | `WorkColumnSelector` utilities, `WorkExtraCell` rendering |
| `src/test/tab-context.test.ts` | 269 | `TabContext` provider (renderHook + act) |

**Total:** ~1385 linhas de teste cobrindo logica pura + 1 context provider.

**Convencao:** Sufixo `.test.ts` (nao `.spec.ts`, embora ambos sejam aceitos pelo `include`).

## Estrutura dos Testes

**Padrao observado (todos os arquivos seguem):**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { funcaoAlvo } from '@/path/to/module';
import type { Column } from '@/types/board';

// Helpers de fabrica no topo do arquivo
function makeCol(id: string, title: string, type: string): Column {
  return { id, boardId: 'b1', title, type: type as any, width: 100, position: 0, settings: {} };
}

describe('NomeDoModulo', () => {
  describe('funcaoEspecifica', () => {
    it('faz X quando Y', () => {
      expect(funcaoAlvo(input)).toBe(expected);
    });
  });
});
```

**Convencoes:**
- Imports explicitos de vitest (apesar de `globals: true`)
- Helpers de fabrica (`makeCol`, `makeRule`, `makeGroup`, `makeWorkItem`) declarados no topo, antes dos `describe`s
- Suites aninhadas: `describe('Modulo')` > `describe('funcao')` > `it('caso')`
- Comentarios de secao com barras box-drawing: `// ── DateCell utilities ───────────────────`
- Nomes de testes em ingles (formato `it('does X when Y')`), apesar da UI ser pt-BR

**Estilo de assertion:**
- `expect(x).toBe(y)` para primitivos
- `expect(x).toEqual(y)` para objetos/arrays
- `expect(x).toBeCloseTo(y)` para floats
- `expect(arr).toHaveLength(n)`
- `expect(x).not.toBeNull()` / `not.toBe(null)`
- `expect(x).toBeUndefined()` / `.toBeNull()`

## Hook Testing

**Pattern (de `tab-context.test.ts`):**

```ts
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { TabProvider, useTab } from '@/context/TabContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(TabProvider, null, children);
}

describe('TabContext', () => {
  beforeEach(() => {
    localStorage.clear();  // CRITICO: limpar localStorage entre testes
  });

  it('starts with no tabs', () => {
    const { result } = renderHook(() => useTab(), { wrapper });
    expect(result.current.tabs).toEqual([]);
  });

  it('opens a new tab', () => {
    const { result } = renderHook(() => useTab(), { wrapper });
    act(() => result.current.openTab('board-1'));
    expect(result.current.tabs).toHaveLength(1);
  });
});
```

**Convencoes:**
- `React.createElement(Provider, null, children)` no wrapper (evita JSX em `.test.ts` puro)
- SEMPRE `act(() => ...)` para mutar estado
- `localStorage.clear()` em `beforeEach` quando o hook usa storage
- Nao mockam Supabase ainda (testes focam em logica pura)

## Component Testing

**Pattern (de `work-components.test.ts`):**

```ts
import { render, screen } from '@testing-library/react';
import WorkExtraCell from '@/components/work/WorkExtraCell';

it('renders status with color', () => {
  render(<WorkExtraCell ... />);
  expect(screen.getByText('Done')).toBeInTheDocument();
});
```

Uso minimo - prioridade ainda e testar funcoes puras exportadas (parse/serialize/evaluate), nao a UI.

## O Que Esta Testado

**Bem coberto:**
- `src/utils/formulaParser.ts` - parser de formulas com 30+ casos (operadores, funcoes SUM/AVG/MIN/MAX/IF/CONCAT/ABS/ROUND/DAYS_DIFF, circular refs)
- `src/components/board/DateCell.tsx` - `parseDateValue` / `serializeDateValue` com round-trip
- `src/components/board/FilterBuilder.tsx` - `evaluateFilterGroup` cobre text, number, status, date, checkbox, people, rating, tags + combinators AND/OR
- `src/components/board/TimeTrackingDetailModal.tsx` - parse/format de duracao
- `src/components/work/WorkColumnSelector.tsx` - agregacao e selecao de colunas extras
- `src/context/TabContext.tsx` - abrir/fechar/trocar tabs + persistencia em localStorage

**NAO coberto:**
- Mutations (`useCrudMutations.ts`) - sem mocks de Supabase
- Queries (`useSupabaseData.ts`) - sem mocks de Supabase
- Realtime sync
- Permissoes (`usePermissions.ts`, RPCs)
- Edge Functions (`supabase/functions/*`)
- Components UI complexos (BoardTable, BoardKanban, ItemDetailPanel)
- Fluxo de autenticacao (`useAuth.tsx`)
- Drag-and-drop (dnd-kit)
- Automacoes (`useAutomationEngine.ts`)
- Engenharia de undo/redo

## Mocking

**Framework:** `vi` do vitest (importado explicitamente).

**Mocks setup atualmente:**
- `window.matchMedia` global em `src/test/setup.ts:3` (necessario para Radix/shadcn que checam media query)

**Nao ha mock de Supabase ainda.** Testes evitam codigo que chama `supabase.from(...)`. Para testar mutations/queries no futuro:
```ts
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ select: vi.fn(), insert: vi.fn(), ... })) }
}));
```

## Coverage

**Sem alvo formal de cobertura.** Nao ha config de coverage em `vitest.config.ts`, sem CI gate, sem badge.

**Filosofia atual:** Testar funcoes puras exportadas (parse/serialize/evaluate) que rodam logica de negocio sem efeitos. Componentes UI sao testados manualmente.

## Scripts SQL e Manuais (`scripts/`)

Pasta `scripts/` contem **testes manuais para validar mudancas de DB/RPC**, NAO testes automatizados:

| Arquivo | Proposito |
|---------|-----------|
| `scripts/test-phase1-rpc.sql` | Smoke test SQL para validar RPC `can_access_board` / `can_access_item` |
| `scripts/test-phase2-prefetch.md` | Checklist manual para validar prefetch de "Meu Trabalho" via DevTools Network |
| `scripts/test-phase3-move-item.sql` | Smoke test SQL para validar mutation `move_item` (reordenacao) |

**Convencao:** Cada fase grande de refatoracao gera um script de validacao manual em `scripts/test-phase<N>-<descricao>.<sql|md>`. Sao guias para Jonathan executar no Supabase SQL Editor ou no browser apos deploy.

## Como Adicionar Novos Testes

**Para logica pura (utility, parser, evaluator):**
1. Criar `src/test/<nome>.test.ts`
2. Importar a funcao via alias `@/...`
3. Helpers de fabrica no topo do arquivo
4. `describe` aninhados por funcao
5. Rodar `npm run test:watch` durante TDD

**Para hooks customizados:**
1. Criar `src/test/<nome>.test.ts` (extensao `.ts` mesmo com JSX no wrapper - usar `React.createElement`)
2. `renderHook` com `wrapper` que injeta os Providers necessarios (TabProvider, AppProvider, QueryClientProvider)
3. `beforeEach` para limpar `localStorage`
4. `act(() => result.current.method(...))` para mutacoes

**Para componentes:**
1. Criar `src/test/<componente>.test.tsx`
2. `render(<Component />)` + `screen.getBy*`
3. Pode precisar wrapper com providers (QueryClient, Router, AppContext)

**Para E2E (quando ativado):**
1. Criar `tests/` na raiz do repo
2. Adicionar `.spec.ts` ou `.ts` (qualquer .ts e detectado)
3. Garantir `npm run dev` rodando na porta 8080 antes
4. Rodar `npx playwright test`
