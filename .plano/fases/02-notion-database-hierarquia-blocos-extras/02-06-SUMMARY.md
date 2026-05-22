---
phase: 02-notion-database-hierarquia-blocos-extras
plan: 02-06
subsystem: database-views-reuse
tags: [database, board-views, table, kanban, calendar, blocknote, context-scoping]
requires:
  - "02-01: boards.page_id + DATABASE_COLUMN_TYPES + DatabaseViewType"
  - "02-05: DatabaseBlock + DatabaseViewRenderer stub + useCreateDatabase (4 views por database)"
provides:
  - "BoardProvider: prop opcional boardIdOverride (pula onboarding + sync workspace)"
  - "DatabaseBoardContext: wrapper FilterProvider + BoardProvider(boardIdOverride) que isola estado por bloco database"
  - "BoardTable/Kanban/Calendar: prop opcional mode?: 'board' | 'database' (default 'board')"
  - "CreateColumnModal: prop opcional databaseMode?: boolean que filtra select pros 8 tipos do MVP"
  - "DatabaseViewRenderer (real): switch view_type -> BoardTable/Kanban/Calendar/DatabaseListView"
  - "DatabaseListView (stub): placeholder ate 02-07"
affects:
  - "src/context/BoardContext.tsx: BoardProvider aceita boardIdOverride, pula onboarding/sync workspace quando override presente"
  - "src/components/board/BoardTable.tsx: container max-h-[480px] + sem BatchActionsBar + empty states compactos em mode='database'"
  - "src/components/board/BoardKanban.tsx: esconde KanbanToolbar + container max-h-[520px] em mode='database'"
  - "src/components/board/BoardCalendar.tsx: container max-h-[560px] em mode='database'"
  - "src/components/board/table/TableGroupSection.tsx: propaga mode -> databaseMode pro CreateColumnModal"
  - "src/components/modals/CreateColumnModal.tsx: filtro condicional do select + hint pt-BR + reset defensivo"
  - "src/components/database/DatabaseViewRenderer.tsx: reescrito (substitui stub de 02-05)"
tech-stack:
  added: []
  patterns:
    - "Prop boardIdOverride no Provider raiz de dominio (BoardProvider) - pattern reusavel quando precisamos do mesmo dominio em contexto secundario sem duplicar logica"
    - "Composicao por wrapping de Providers (FilterProvider local + BoardProvider escopado) - mantem UIContext/SelectionContext compartilhados intencionalmente"
    - "Switch de view via discriminant union DatabaseViewType (type 'table' | 'kanban' | 'calendar' | 'list_detailed')"
    - "Modes flag em componentes 'big' (BoardTable etc.) - permite reuso sem duplicacao de logica core; UI condicional via expressao em className"
key-files:
  created:
    - "src/components/database/DatabaseBoardContext.tsx"
    - "src/components/database/DatabaseListView.tsx"
  modified:
    - "src/context/BoardContext.tsx"
    - "src/components/board/BoardTable.tsx"
    - "src/components/board/BoardKanban.tsx"
    - "src/components/board/BoardCalendar.tsx"
    - "src/components/board/table/TableGroupSection.tsx"
    - "src/components/modals/CreateColumnModal.tsx"
    - "src/components/database/DatabaseViewRenderer.tsx"
decisions:
  - "BoardProvider ganha prop boardIdOverride em vez de prop drilling em BoardTable/Kanban/Calendar - reduz toque em arquivos grandes e centraliza decisao do boardId em um unico ponto (a logica de fetch ja vive no Provider)"
  - "Quando boardIdOverride esta setado: pular onboarding (so o Provider raiz cria workspace/board iniciais) E pular sync de workspace (nao queremos que o database inline altere activeWorkspaceId do app principal)"
  - "UIContext (selectedItem, navStack) e SelectionContext continuam compartilhados intencionalmente - ItemDetailPanel global abre items do database normalmente; multi-select limpa quando activeBoardId do app muda (e o do app NAO muda ao mexer numa database)"
  - "FilterProvider re-instanciado dentro de DatabaseBoardContext - filtros/sort/hiddenColumns da database nao vazam pro board principal (e vice-versa)"
  - "TabProvider NAO incluido em DatabaseBoardContext - tabs sao um conceito de Board (TabBar do app), nao de view de database. Verifiquei que BoardTable/Kanban/Calendar nao consomem useTab"
  - "mode='database' em BoardTable: tambem esconde BatchActionsBar (bar flutuante absoluta inconsistente dentro de bloco inline). Selecao via checkbox continua funcionando mas sem barra de acoes batch"
  - "DatabaseViewRenderer aceita activeViewId opcional pro 02-08 (DatabaseViewTabs) - fallback resolve via is_default -> primeira -> 'table' defensivo"
  - "DatabaseListView fica como stub neste plano - implementacao real (Notion list view com props chips) e o escopo do 02-07"
metrics:
  duration_minutes: 14
  tasks_completed: 6
  files_created: 2
  files_modified: 7
  tests_added: 0
  total_tests: 199
  completed_date: 2026-05-22
---

# Fase 02 Plano 02-06: Views Tabela/Kanban/Calendar com mode='database' Summary

## One-liner

Reusa BoardTable/Kanban/Calendar dentro do bloco database via prop `mode?='database'` (container reduzido, esconde toolbars), introduz `DatabaseBoardContext` (FilterProvider + BoardProvider com `boardIdOverride`) que isola estado por bloco, e reescreve `DatabaseViewRenderer` como switch real entre 4 view types (`table`/`kanban`/`calendar`/`list_detailed`-stub). CreateColumnModal ganha prop `databaseMode` que filtra select pros 8 tipos do MVP.

## O que foi feito

### Task 1: BoardProvider boardIdOverride + DatabaseBoardContext (`src/context/BoardContext.tsx`, `src/components/database/DatabaseBoardContext.tsx`)

`BoardProvider` agora aceita prop opcional `boardIdOverride?: string`. Quando presente:
- `activeBoardId` interno = `boardIdOverride ?? useUI().activeBoardId` (todos os hooks internos `useGroups`/`useColumns`/`useItems`/`useColumnValues` passam a usar esse id local)
- Effect de onboarding pulado (so o Provider raiz cria workspace/board iniciais)
- Effect de sync `activeWorkspaceId` pulado (nao queremos que database inline mude workspace ativo do app)

`DatabaseBoardContext` e o wrapper publico (usado pelo `DatabaseViewRenderer`):
```tsx
<FilterProvider>
  <BoardProvider boardIdOverride={boardId}>{children}</BoardProvider>
</FilterProvider>
```

UIContext e SelectionContext NAO sao re-instanciados (mantem `selectedItem` global e selecao consistente).

### Task 2: BoardTable mode (`src/components/board/BoardTable.tsx`, `src/components/board/table/TableGroupSection.tsx`)

`BoardTable` ganha prop `mode?: 'board' | 'database'` (default 'board'). Quando 'database':
- Container raiz: `max-h-[480px] overflow-auto bg-board-bg rounded-md` (substitui `flex-1`)
- aria-label "Tabela da database"
- Empty state `!activeBoard`: "Carregando database..." compacto (em vez do CTA "selecione na sidebar")
- Empty state filtros sem resultado: padding reduzido `py-8`
- BatchActionsBar nao renderiza (bar flutuante absoluta nao se aplica)

`TableGroupSection.GroupSection` recebe prop `mode` e propaga `databaseMode={mode === 'database'}` pro `CreateColumnModal`.

### Task 3: BoardKanban mode (`src/components/board/BoardKanban.tsx`)

`BoardKanban` ganha prop `mode?`. Quando 'database':
- Container: `max-h-[520px] flex flex-col overflow-hidden bg-board-bg rounded-md`
- `KanbanToolbar` escondida (config de modo/swimlane/WIP fica fora do escopo inline)
- Guard `!activeBoard`: placeholder "Carregando database..." em vez de `return null`

Drag/drop entre lanes, criacao de item, search inline, swimlanes - tudo continua funcionando (logica core inalterada, dados vem do `BoardProvider` local via `DatabaseBoardContext`).

### Task 4: BoardCalendar mode (`src/components/board/BoardCalendar.tsx`)

`BoardCalendar` ganha prop `mode?`. Quando 'database':
- Container: `max-h-[560px] overflow-auto p-3 bg-board-bg rounded-md` (em vez de `flex-1 p-4`)
- Empty states (`!activeBoard` e `!dateCol`) com padding reduzido

Navegacao mes/semana, seletor de coluna de data, drag de chips entre dias - inalterado.

### Task 5: CreateColumnModal databaseMode (`src/components/modals/CreateColumnModal.tsx`)

Nova prop `databaseMode?: boolean` (default false). Quando true:
- Select de tipo filtra `COLUMN_TYPES` para somente os 8 valores em `DATABASE_COLUMN_TYPES` (`text`, `status`, `date`, `people`, `number`, `checkbox`, `dropdown`, `long_text`)
- Hint pt-BR: "Databases suportam 8 tipos de coluna no MVP."
- `useEffect` defensivo: se `columnType` esta fora do subset (e.g. estado anterior), reseta para 'text'

### Task 6: DatabaseViewRenderer real (`src/components/database/DatabaseViewRenderer.tsx`) + DatabaseListView stub

Reescrita do stub de 02-05:
- `useBoardViews(boardId)` resolve as 4 views criadas em 02-05
- View ativa: `activeViewId` explicita > `is_default` > primeira > fallback table
- Switch por `view_type` envolve componente da view em `<DatabaseBoardContext boardId={boardId}>`:
  - `'table'` -> `<BoardTable mode="database" />`
  - `'kanban'` -> `<BoardKanban mode="database" />`
  - `'calendar'` -> `<BoardCalendar mode="database" />`
  - `'list_detailed'` -> `<DatabaseListView mode="database" />` (stub novo neste plano)

Aceita prop opcional `activeViewId` pra integracao com `DatabaseViewTabs` (plano 02-08).

`DatabaseListView` e um placeholder pt-BR ("Lista detalhada disponivel em breve (02-07).") - implementacao real e o escopo do 02-07.

## Verificacao

- `npm run build` passa em 16.48s, 0 erros novos. Bundle nao crescei significativamente (BoardTable/Kanban/Calendar reusados, soh codigo de prop opcional adicionado)
- `npm run test` passa: **199 testes (10 arquivos)** - mesmo total. Zero teste novo neste plano (verificacao funcional do mode='database' depende de runtime com page editor + bloco database, que cobre integracao end-to-end em vez de teste unitario)
- `npx tsc --noEmit -p tsconfig.app.json` nao introduz erros novos nos arquivos modificados (erros pre-existentes em BoardContext.tsx e TableGroupSection.tsx confirmados em baseline pre-mudanca)
- Dev server `npm run dev` (porta 8081) responde HTTP 200 + HMR reload limpo apos cada edicao das 7 arquivos
- Pre-existing baseline confirmado via `git stash + tsc` (erros TS em BoardContext linhas 153/154/208/236 e TableGroupSection 192 sao todos pre-existentes, fora do escopo)
- Zero em-dash, UI 100% pt-BR
- Inspecao manual via `grep`:
  - `mode\?:` aparece nos 3 componentes (Table/Kanban/Calendar) ✓
  - `boardIdOverride` aparece em BoardContext.tsx (3 referencias) + DatabaseBoardContext.tsx ✓
  - `databaseMode` aparece em CreateColumnModal.tsx (5 referencias) + TableGroupSection.tsx ✓
  - `DATABASE_COLUMN_TYPES` importado em CreateColumnModal ✓
  - `BoardTable mode="database"`, `BoardKanban mode="database"`, `BoardCalendar mode="database"` no DatabaseViewRenderer ✓

## Desvios do Plano

Nenhum desvio significativo. Plano executado essencialmente como escrito, com refinamentos taticos:

**1. [Regra 3 - Bloqueante] Hide BatchActionsBar in mode='database'**

- **Encontrado durante:** Tarefa 2 (BoardTable mode)
- **Issue:** `BatchActionsBar` renderiza com `position: fixed` (bar flutuante na base da tela). Renderizar isso dentro de um bloco inline numa page seria visualmente confuso (bar global aparecendo quando usuario seleciona item da database).
- **Correcao:** Condicional `mode === 'board' && selectedItems.size > 0 && <BatchActionsBar />`. Selecao multipla continua funcionando (checkbox por item), mas sem bar de acoes batch dentro do contexto inline.
- **Arquivos modificados:** `src/components/board/BoardTable.tsx`
- **Commit:** `046cf88`

**2. [Regra 1 - Bug-defensivo] useEffect reset de columnType em databaseMode**

- **Encontrado durante:** Tarefa 5 (CreateColumnModal)
- **Issue:** Se o modal e re-aberto com `databaseMode=true` apos uma sessao previa em modo board (onde usuario selecionou `timeline` por exemplo), o estado `columnType` poderia ficar fora do subset permitido (o select esconderia a opcao mas o valor persistiria em getSettings()).
- **Correcao:** `useEffect` que reseta para 'text' quando `databaseMode && !DATABASE_COLUMN_TYPES.includes(columnType)`.
- **Arquivos modificados:** `src/components/modals/CreateColumnModal.tsx`
- **Commit:** `df7a951`

**3. [Regra 3 - Bloqueante] Skip onboarding + workspace sync when boardIdOverride set**

- **Encontrado durante:** Tarefa 1 (DatabaseBoardContext)
- **Issue:** O `BoardProvider` tem 2 effects que mutam estado global (UIContext): onboarding (cria workspace/board ao primeiro login) e sync `activeWorkspaceId` quando board muda. Se rodassem dentro do BoardProvider aninhado da database, criariam state corruption (criar boards extras, mudar workspace ativo do app ao renderizar database inline).
- **Correcao:** Guard `if (boardIdOverride) return;` no topo de ambos os effects. So o Provider raiz (sem override) faz onboarding/sync.
- **Arquivos modificados:** `src/context/BoardContext.tsx`
- **Commit:** `e5f275e`

## Issues Adiados

Nenhum. Decisoes futuras explicitas no escopo:
- `DatabaseListView` real -> Plano 02-07
- `DatabaseViewTabs` real (passa activeViewId pro DatabaseViewRenderer) -> Plano 02-08
- Filtros/sort/visibilidade de coluna persistidos por view em `board_views.config` -> Plano 02-08 (parte de tabs)

## Commits

| Tarefa | Hash | Mensagem |
|--------|------|----------|
| 1 | `e5f275e` | feat(02-06): add DatabaseBoardContext + boardIdOverride in BoardProvider |
| 2 | `046cf88` | feat(02-06): add mode='database' prop to BoardTable |
| 3 | `1545abf` | feat(02-06): add mode='database' prop to BoardKanban |
| 4 | `93b809b` | feat(02-06): add mode='database' prop to BoardCalendar |
| 5 | `df7a951` | feat(02-06): filter CreateColumnModal to 8 types when databaseMode=true |
| 6 | `4148481` | feat(02-06): rewrite DatabaseViewRenderer with view_type switch |

## Self-Check: PASSOU

- src/components/database/DatabaseBoardContext.tsx: ENCONTRADO
- src/components/database/DatabaseListView.tsx: ENCONTRADO
- src/components/database/DatabaseViewRenderer.tsx (reescrito): ENCONTRADO
- src/context/BoardContext.tsx (modificado): ENCONTRADO (boardIdOverride presente)
- src/components/board/BoardTable.tsx (modificado): ENCONTRADO (mode prop presente)
- src/components/board/BoardKanban.tsx (modificado): ENCONTRADO (mode prop presente)
- src/components/board/BoardCalendar.tsx (modificado): ENCONTRADO (mode prop presente)
- src/components/board/table/TableGroupSection.tsx (modificado): ENCONTRADO (mode prop + databaseMode propagado)
- src/components/modals/CreateColumnModal.tsx (modificado): ENCONTRADO (databaseMode + DATABASE_COLUMN_TYPES presente)
- Commit e5f275e: ENCONTRADO
- Commit 046cf88: ENCONTRADO
- Commit 1545abf: ENCONTRADO
- Commit 93b809b: ENCONTRADO
- Commit df7a951: ENCONTRADO
- Commit 4148481: ENCONTRADO
- `npm run build`: PASSOU (0 erros novos)
- `npm run test`: PASSOU (199/199)

## Proximos planos

- **02-07:** `DatabaseListView` real - lista detalhada Notion-style (cada item renderiza como bloco grande com titulo `text-lg` + chips horizontais de status/data/people; props visiveis configuraveis via `board_views.config.visibleProps`). Substitui o stub atual.
- **02-08:** `DatabaseViewTabs` real - lista views do board, tab ativa controla `activeViewId` passado pro DatabaseViewRenderer, botao "+" pra criar nova view, gerencia config persistido em `board_views`.
- **02-11:** Polimento final (UX/edge cases) - inclui verificacao runtime end-to-end do bloco database em /page/:id apos 02-06+07+08 estarem juntos.
