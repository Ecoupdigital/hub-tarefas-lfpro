# Convencoes de Codigo

**Data da Analise:** 2026-05-22

## TypeScript e Configuracao

**Versao:** TypeScript 5.8.3 (`package.json`)

**Config:** `tsconfig.json` + `tsconfig.app.json` + `tsconfig.node.json`

**Compiler options frouxas (intencional):**
- `noImplicitAny: false` - tipos `any` permitidos
- `strictNullChecks: false` - null/undefined nao bloqueiam build
- `noUnusedLocals: false` / `noUnusedParameters: false`
- `allowJs: true` - JS pode coexistir
- `skipLibCheck: true`

**Path alias:**
- `@/*` -> `./src/*` (definido em `tsconfig.json` linha 6 e replicado em `vite.config.ts` e `vitest.config.ts`)
- SEMPRE use `@/...` para imports do src. Ex: `import { supabase } from '@/integrations/supabase/client';`

**`as any` e aceito** quando o tipo gerado pelo Supabase nao acompanha tabelas novas. Padrao visto em `useCrudMutations.ts:10`:
```ts
await supabase.from('activity_log' as any).insert({ ... });
```

## Lint (ESLint 9)

**Config:** `eslint.config.js` (flat config, ESM)

**Stack:**
- `@eslint/js` recommended
- `typescript-eslint` recommended
- `eslint-plugin-react-hooks` (regras recommended)
- `eslint-plugin-react-refresh`

**Regras-chave:**
- `react-refresh/only-export-components: warn` (com `allowConstantExport: true`)
- `@typescript-eslint/no-unused-vars: warn` (ignora args com prefixo `_`)
- Hooks rules ativas (rules-of-hooks + exhaustive-deps)

**Ignora:** `dist/`

**Comando:** `npm run lint` (executa `eslint .` em todo o projeto)

## Padroes de Nomeacao

**Arquivos:**
- Componentes React: `PascalCase.tsx` (ex: `BoardTable.tsx`, `StatusCell.tsx`)
- Hooks: `camelCase.ts` ou `camelCase.tsx` com prefixo `use` (ex: `useSupabaseData.ts`, `useAuth.tsx`)
- Tipos: `camelCase.ts` (ex: `board.ts`)
- Utilities: `camelCase.ts` (ex: `exportCsv.ts`, `formulaParser.ts`)
- Modais de criacao: `Create<Entidade>Modal.tsx` (ex: `CreateBoardModal.tsx`, `CreateColumnModal.tsx`, `CreateGroupModal.tsx`, `CreateWorkspaceModal.tsx`)
- Modais de edicao: `Edit<Entidade>Modal.tsx` (ex: `EditColumnModal.tsx`)
- Cells de coluna: `<Tipo>Cell.tsx` em `src/components/board/` (ex: `StatusCell.tsx`, `DateCell.tsx`, `PeopleCell.tsx`)

**Variaveis e funcoes:**
- `camelCase` para variaveis, funcoes e props
- `PascalCase` para componentes, interfaces, types, enums
- `SCREAMING_SNAKE_CASE` para constantes de modulo (ex: `STORAGE_KEY_PREFIX`, `MAX_TABS`, `ITEMS_PAGE_SIZE`, `RECENT_BOARDS_KEY`)

**Interfaces:**
- Props de componente sao `interface Props` (genericas, sem prefixo) ou `interface <Component>Props`. Ambos padroes coexistem:
  - `CreateBoardModal.tsx:15`: `interface Props { ... }`
  - `StatusCell.tsx:5`: `interface StatusCellProps { ... }`
- Preferir `interface <Component>Props` para componentes reutilizaveis exportados; `Props` local em modais e telas.

## Idioma e i18n

**UI em pt-BR** (Portugues Brasileiro). Toda string visivel ao usuario em portugues:
- Toasts: `toast.success('Perfil atualizado com sucesso!')`, `toast.error('Erro ao salvar perfil: ...')`
- Botoes e labels: "Criar board", "Adicionar coluna", "Novo grupo"

**Sem acentuacao em codigo/comentarios** (codigo legado as vezes omite acentos em pt-BR no codigo, mas a UI visivel ao usuario USA acentos corretos). Comentarios em pt-BR sem acentuacao sao comuns: `// Capturar snapshot do item antes de deletar para possivel undo` (useCrudMutations.ts:146).

**SEM em-dash (—)** em qualquer texto, codigo, copy, comentarios ou commits. Usar ponto final + nova frase, virgula, dois-pontos, parenteses, ou quebra de linha. Hifen `-` e en-dash `–` tambem evitar. Regra global do dono do projeto.

## Convencoes do Projeto (CLAUDE.md)

**Prefixos universais:**
- `lfpro-` para todas as chaves em `localStorage` (ex: `lfpro-recent-boards`, `lfpro-week-start`, `lfpro-date-format`, `lfpro-onboarding`, `lfpro-cal-datecol-${boardId}`, `lfpro-kanban-settings-${boardId}`, `lfpro-color-rules-${id}`, `lfpro-work-columns-${id}`)
- `lfpro-` para todos os `CustomEvent`s globais (ex: `lfpro-create-board`, `lfpro-create-workspace`, `lfpro-command-palette`)

**Soft delete:**
- Boards usam coluna `state` (`'active'` | `'deleted'`), nao DELETE fisico
- Items tambem usam `state` (ver `useDeleteItem` em `useCrudMutations.ts:142`: `supabase.from('items').update({ state: 'deleted' }).eq('id', id)`)
- Toda query de leitura filtra `.eq('state', 'active')` (ver `useBoards` em `useSupabaseData.ts:52`)

**Onboarding automatico:** Novos usuarios recebem workspace + board iniciais com colunas Status, People, Date (logica em `useAuth`/onboarding).

## Datas (date-fns)

**Stack:** `date-fns@^3.6.0` com locale `ptBR`.

**Import padrao:**
```ts
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
```

Arquivos que seguem o padrao: `DateCell.tsx`, `TimelineCell.tsx`, `BoardCalendar.tsx`, `ActivityFeed.tsx`, `NotificationBell.tsx`, `AuditLogPanel.tsx`, `WebhookManager.tsx`, `FilePreview.tsx`, `TimeTrackingDetailModal.tsx`, `utils/groupBy.ts`.

**Formato configuravel pelo usuario:**
- Preferencia salva em `localStorage` chave `lfpro-date-format` (`DD/MM/YYYY` default, `MM/DD/YYYY`, `YYYY-MM-DD`)
- Ver `getDateDisplayFormat()` em `DateCell.tsx:47`

**Datas em column_values:** Persistidas como string `'YYYY-MM-DD'` ou JSON `{ date, startTime?, endTime? }`. Ver `parseDateValue` e `serializeDateValue` em `DateCell.tsx:17-45` (mantem retrocompat).

## Padrao de Hooks

**Separacao estrita (CRITICO):**

| Tipo | Arquivo | Conteudo |
|------|---------|----------|
| Queries (leitura) | `src/hooks/useSupabaseData.ts` | `useProfiles`, `useWorkspaces`, `useBoards`, `useAllBoards`, `useGroups`, `useColumns`, `useItems`, `useColumnValues`, `useUpdates`, `useSubitems`, etc. |
| Mutations (escrita) | `src/hooks/useCrudMutations.ts` | `useCreate*`, `useDelete*`, `useUpdate*`, `useDuplicate*`, `useMove*` |
| Realtime sync | `src/hooks/useRealtimeSync.ts` | Subscricoes Supabase que invalidam React Query |
| Hooks especializados | `src/hooks/use<Feature>.ts` | Um arquivo por dominio: `useAuth`, `useAutomations`, `usePermissions`, `useUndoRedo`, `usePresence`, `useNotifications`, etc. |

**Padrao de query (useSupabaseData.ts:46):**
```ts
export const useBoards = (workspaceId?: string) =>
  useQuery({
    queryKey: ['boards', workspaceId],
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('boards')
        .select('id, name, state, workspace_id, ...')
        .eq('workspace_id', workspaceId!)
        .eq('state', 'active')
        .order('position').order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });
```

**Convencoes em queries:**
- `queryKey` sempre array com nome do recurso primeiro: `['boards', workspaceId]`, `['column_values', itemId]`
- `enabled: !!param` para queries dependentes de id
- `staleTime` explicito (2-5 min para dados estaveis)
- SEMPRE `if (error) throw error`
- Retorno fallback: `return data ?? []`
- `select()` lista campos explicitamente (nao usar `select('*')`)
- Filtrar `.eq('state', 'active')` para entidades com soft delete
- Usar `keepPreviousData` (`placeholderData: keepPreviousData`) em listas paginadas/dependentes (`useGroups`)

**Padrao de mutation (useCrudMutations.ts:52):**
```ts
export const useCreateBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({ workspaceId, name, description }: { ... }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('boards').insert({ ... }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-boards'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};
```

**Convencoes em mutations:**
- SEMPRE `retry: 1`
- Argumentos como objeto nomeado: `{ workspaceId, name, description }`
- Auth check inline: `const { data: user } = await supabase.auth.getUser(); if (!user.user) throw new Error('Not authenticated');`
- `onSuccess` invalida todas as query keys relacionadas
- Para delete com undo: usar `onMutate` para snapshot, registrar via `UndoRedoContext.pushAction` em `onSuccess` (ver `useDeleteItem` em `useCrudMutations.ts:136`)
- Activity log e fire-and-forget: `logActivity({...}).catch(() => {})` (nao bloqueia a mutation)

## Padrao de Cell Components

**Localizacao:** `src/components/board/<Tipo>Cell.tsx`

**Tipos existentes (25):** AutoNumber, Button, Checkbox, Color, ConnectBoards, Date, Dropdown, Email, File, Formula, Link, Location, LongText, Mirror, Number, People, Phone, Progress, Rating, Status, Tags, Text, Timeline, TimeTracking, Vote.

**Contrato de props comum:**
```ts
interface <Tipo>CellProps {
  value: <T> | undefined;
  onChange: (val: <T>) => void;
  // opcionalmente: labels, settings, columnId, etc.
}
```

**Padroes internos:**
- Cell e controlado: recebe `value` + `onChange`
- Estado de UI local (popover open, search, highlight) em `useState`
- Funcoes de `parse<Tipo>Value` / `serialize<Tipo>Value` EXPORTADAS para reuso (ex: `DateCell.tsx:17`, `TimeTrackingDetailModal.tsx`). Estas funcoes sao alvo principal de testes unitarios.
- Keyboard navigation (Arrow keys + Enter) em cells com popover (ver `StatusCell.tsx:54`)
- Posicionamento de dropdown manual via `getBoundingClientRect()` quando shadcn `Popover` nao cabe

**Ao adicionar nova Cell:**
1. Criar `src/components/board/<Tipo>Cell.tsx` seguindo o contrato `{ value, onChange }`
2. Exportar funcoes pure de parse/serialize se o valor for nao-trivial
3. Registrar no renderizador de celulas (provavelmente `BoardTable.tsx` ou `cellRegistry.ts`)
4. Adicionar tipo em `src/types/board.ts`
5. Escrever teste unitario das funcoes pure em `src/test/<tipo>.test.ts`

## Padrao de Modais

**Localizacao:** `src/components/modals/Create<Entidade>Modal.tsx` ou `Edit<Entidade>Modal.tsx`

**Contrato de props:**
```ts
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // ids necessarios: workspaceId, boardId, etc.
}
```

**Estrutura (ver `CreateBoardModal.tsx`):**
- Usa shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
- Estado interno via `useState` (steps, form fields, isCreating)
- `resetState()` ao fechar (`handleOpenChange` em `:72`)
- Chama hook de mutation (`useCreateBoard`)
- `toast.success(...)` / `toast.error(...)` para feedback (sonner)
- Navega via `useNavigate()` quando relevante
- Templates/wizards: estado de step (`'template' | 'details'`)

**Form validation:** Para forms complexos, usar `react-hook-form` + `zod` via `@hookform/resolvers`. Para modais simples, validacao inline com early return e `toast.error`.

## Tratamento de Erros

**Padrao geral:**
- Sempre check `if (error) throw error` apos chamadas Supabase
- Em mutations, deixar React Query capturar o throw (`retry: 1`)
- Em UI, capturar via `useMutation().mutate(..., { onError })` ou try/catch + `toast.error`

**Feedback de erro ao usuario:**
- `sonner` toast (`import { toast } from 'sonner'`) usado em ~47 arquivos
- Mensagens SEMPRE em pt-BR: `'Erro ao salvar perfil: ${msg}'`, `'O nome completo é obrigatório.'`

**Validacao de entrada:**
- Inline em modais/forms (`if (!name) { toast.error('...'); return; }`)
- `zod` schemas em forms complexos (signin/signup, settings)

## Organizacao de Imports

**Ordem observada (nao imposta por lint, mas seguida):**
1. React + libs externas (`react`, `react-router-dom`, `@tanstack/react-query`)
2. Libs de UI (`@radix-ui/*`, `lucide-react`, `sonner`)
3. Aliases internos `@/components`, `@/hooks`, `@/lib`, `@/utils`, `@/integrations`
4. Types (`@/types/board`)
5. Imports relativos `./...`

Linha em branco entre grupos NAO e imposta (codigo as vezes agrupa, as vezes nao).

## Estilos (Tailwind + shadcn)

- Tailwind CSS 3 (`tailwind.config.ts`)
- Componentes shadcn-ui em `src/components/ui/` (50+ primitivos)
- `cn()` helper de `@/lib/utils` para concatenar classes condicionais
- Cor primaria: `hsl(29 45% 71%)` (warm gold LFPro). Dark mode: `hsl(29 50% 76%)`
- Fontes: Jost (body) + Montserrat (headings) via Tailwind `font-sans`/`font-heading`
- Variaveis CSS em `src/index.css` (definidas como HSL)
- Dark mode via classe `.dark` no `<html>` (gerenciado por `next-themes`)

## React Query

**Versao:** v5 (`@tanstack/react-query@^5.83.0`)

**Configuracao:** `QueryClient` instanciado em `src/main.tsx` ou `App.tsx`

**Convencoes:**
- `staleTime` explicito em queries (2-5 min)
- Invalidacao explicita em `onSuccess` das mutations
- Realtime sync (`useRealtimeSync.ts`) chama `qc.invalidateQueries` automaticamente em eventos Supabase
- Query keys hierarquicas: `['items', boardId]`, `['column_values', itemId]`

## Logging

**Activity log:** Helper `logActivity()` em `useCrudMutations.ts:7`. Fire-and-forget (`.catch(() => {})`). Insere em tabela `activity_log` com user_id da sessao.

**Audit log:** Hook `useAuditLog.ts` para acoes administrativas sensiveis.

**Console:** Evitar `console.log` em codigo de producao. Sem regra explicita no lint, mas codigo limpo.

## Anti-padroes a Evitar

- NAO usar `select('*')` - listar campos explicitamente
- NAO esquecer `if (error) throw error` apos chamadas Supabase
- NAO usar `localStorage` direto sem prefixo `lfpro-`
- NAO disparar `CustomEvent` sem prefixo `lfpro-`
- NAO deletar boards/items via `.delete()` - usar `.update({ state: 'deleted' })`
- NAO escrever em ingles na UI visivel
- NAO usar em-dash em strings/copy/comentarios
- NAO duplicar logica de query/mutation: queries em `useSupabaseData.ts`, mutations em `useCrudMutations.ts`
- NAO criar hook de mutation que nao invalida cache em `onSuccess`
