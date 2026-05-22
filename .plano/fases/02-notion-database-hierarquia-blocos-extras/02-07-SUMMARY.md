---
phase: 02-notion-database-hierarquia-blocos-extras
plan: 02-07
subsystem: database-list-view
tags: [database, list-view, notion-style, board-views, config, visible-props]
requires:
  - "02-05: useCreateDatabase cria 4 views (list_detailed inclusa)"
  - "02-06: DatabaseListView stub + DatabaseViewRenderer com switch view_type"
provides:
  - "useUpdateBoardViewConfig: mutation pra atualizar board_views.config jsonb"
  - "DatabaseListItem: render de UM item Notion-style (titulo grande + chips)"
  - "DatabaseListViewConfig: popover de checkboxes pra toggle de visibleProps"
  - "DatabaseListView (real): lista detalhada Notion-style com props chips configuraveis"
affects:
  - "src/hooks/useBoardViews.ts: novo hook useUpdateBoardViewConfig"
  - "src/components/database/DatabaseListView.tsx: reescrito do stub pra implementacao real"
  - "src/components/database/DatabaseViewRenderer.tsx: passa activeViewId pra DatabaseListView"
tech-stack:
  added: []
  patterns:
    - "Mini renderers por tipo de coluna (ListItemPropChip) - reuso minimo de Cell components, lightweight pra read-only"
    - "Config persistente em board_views.config.visibleProps (jsonb) - reutiliza tabela existente em vez de nova coluna"
    - "Default visibleProps fallback: primeiras colunas de tipo status/date/people - inteligente sem requerer setup inicial"
    - "Header sticky com sticky top-0 z-10 - mantem contador + botao config visiveis durante scroll"
    - "baseConfig prop em DatabaseListViewConfig - preserva outros campos do config (filters/sort) ao salvar visibleProps"
key-files:
  created:
    - "src/components/database/DatabaseListItem.tsx"
    - "src/components/database/DatabaseListViewConfig.tsx"
  modified:
    - "src/hooks/useBoardViews.ts"
    - "src/components/database/DatabaseListView.tsx"
    - "src/components/database/DatabaseViewRenderer.tsx"
decisions:
  - "Usar activeBoard.groups (pre-transformado pelo BoardProvider) em vez de items/columnValues raw - consistente com BoardCalendar/BoardKanban, items ja vem com columnValues como Record"
  - "Mini renderers leves (ListItemPropChip) por tipo em vez de reusar Cell components - chips read-only nao precisam de logica de edicao/popovers, pattern similar ao EmbedBoardBlock"
  - "Status pill: backgroundColor com alpha 22 (translucido) + color do label, similar ao Notion - melhor contraste que cor solida"
  - "People: max 3 avatares + contador +N (em vez de truncar nomes ou listar todos) - mantem layout previsivel"
  - "Date: parse flexivel (string raw, JSON com .date, ISO) - cobre todos formatos vistos no boardCalendar e StatusCell"
  - "Empty state: 'Use a view Tabela para adicionar' - direciona pro fluxo de criacao real, evita duplicar UX de criar item dentro da view"
  - "DatabaseListViewConfig passa baseConfig=listView.config - preserva outros campos quando 02-08 adicionar sort/filters por view"
  - "useUpdateBoardViewConfig.update({ config: config as never }) - cast defensivo p/ tipos narrow do Supabase (Json union recursivo). Validacao real do shape e responsabilidade do caller"
  - "DatabaseListView aceita activeViewId opcional - integra com DatabaseViewRenderer (que passa activeView.id) e abre caminho pro 02-08 DatabaseViewTabs"
metrics:
  duration_minutes: 5
  tasks_completed: 4
  files_created: 2
  files_modified: 3
  tests_added: 0
  total_tests: 199
  completed_date: 2026-05-22
---

# Fase 02 Plano 02-07: DatabaseListView (Notion list view) Summary

## One-liner

Substitui o stub de `DatabaseListView` (02-06) pela view real Notion-style: cada item renderiza como linha grande com titulo `text-lg font-heading-medium` + chips horizontais (status pill, data ptBR, avatares people, numero, checkbox, dropdown, text) das columns visiveis configuraveis em `board_views.config.visibleProps`. Inclui hook `useUpdateBoardViewConfig`, componente `DatabaseListItem` (render de uma linha), `DatabaseListViewConfig` (popover de toggle), e integra com `DatabaseViewRenderer` passando `activeViewId`.

## O que foi feito

### Task 1: useUpdateBoardViewConfig (`src/hooks/useBoardViews.ts`)

Novo hook de mutation:
- `mutationFn({ viewId, config })` faz `UPDATE board_views SET config = $1 WHERE id = $2`
- `onSuccess` invalida `['board_views']`
- Cast defensivo `config as never` pra contornar tipos `Json` narrow do Supabase generated types (config aceita qualquer objeto JSON serializavel, validacao no caller)

### Task 2: DatabaseListItem (`src/components/database/DatabaseListItem.tsx`)

Render de UMA linha da lista:
- `<button>` clicavel full-width com `py-3 px-3 border-b border-border hover:bg-muted/40 focus:bg-muted/40`
- Linha 1: `<h3 className="font-heading text-lg font-medium text-foreground mb-1.5 truncate">` titulo do item
- Linha 2: `flex items-center gap-2 flex-wrap text-xs` com chips das visibleColumns

`ListItemPropChip` (sub-componente local) renderiza por tipo:
- **status**: pill com dot colorido + label name, background com alpha 22, color do label (resolve via `column.settings.labels[key]`, strip quotes do raw value)
- **date**: icon Calendar + data formatada `dd MMM yyyy` com locale ptBR (parse flexivel: string raw, JSON com `.date`, ISO)
- **people**: stack de avatares com `-space-x-1.5` (max 3) + `+N` se mais; avatar_url se existe, fallback inicial do nome
- **number**: `toLocaleString('pt-BR')` + `settings.unit` opcional
- **checkbox**: pill "Sim"/"Nao" com cor primary quando true
- **dropdown**: pill simples com value
- **text/long_text**: texto truncado max-w-[220px] com title attr
- Outros tipos: retorna null (nao quebra render)

Aria-label `Abrir item ${item.name}`. Tooltips por chip (`title` attr).

### Task 3: DatabaseListViewConfig (`src/components/database/DatabaseListViewConfig.tsx`)

Popover de config:
- Trigger: `<button>` com icon `Settings2 w-3.5 h-3.5`, `aria-label="Configurar props visiveis"`
- Content: `Popover` align=end, w-60, lista todas as `columns` com checkbox + nome + tipo (badge `text-[10px] uppercase`)
- Toggle dispara `useUpdateBoardViewConfig.mutateAsync({ viewId, config: { ...baseConfig, visibleProps: newVisible } })` - preserva outros campos do config ao salvar
- Toast de erro `'Erro ao salvar configuracao da view'` se mutation falhar (console.error tambem)
- Checkbox `disabled` enquanto mutation `isPending`
- Empty state se columns vazias

### Task 4: DatabaseListView real (`src/components/database/DatabaseListView.tsx`)

Substitui o stub de 02-06:
- Le `useApp().activeBoard` (vem do DatabaseBoardContext via BoardProvider override)
- Le `useBoardViews(activeBoard.id)` pra encontrar a view list_detailed (resolve por `activeViewId` se passado, senao primeira `view_type === 'list_detailed'`)
- `useProfiles()` pra resolver people avatares
- Default `visibleProps` quando config vazio: primeiras colunas de tipo status/date/people (em ordem)
- Header sticky `top-0 z-10` com contador "{N} itens" + `DatabaseListViewConfig`
- Empty state pt-BR: "Nenhum item ainda. Use a view Tabela para adicionar."
- Items agrupados via `activeBoard.groups`: header de group com bullet colorido (`g.color`) + titulo uppercase + contador
- Cada item renderiza com `<DatabaseListItem onClick={setSelectedItem}>` (abre ItemDetailPanel global)
- Container `max-h-[560px] overflow-y-auto bg-board-bg rounded-md` em mode=database

`DatabaseViewRenderer` atualizado: passa `activeViewId={activeView?.id ?? null}` pro DatabaseListView (consistencia com o pattern preparado pra 02-08 DatabaseViewTabs).

## Verificacao

- `npm run build` passa em 16.54s, 0 erros novos. Bundle: novo codigo absorvido no chunk `Page-VPtik4va.js` (DatabaseBlock dynamic import).
- `npm run test` passa: **199 testes (10 arquivos)** - mesmo total. Zero teste novo (DatabaseListView e read-only de data + presentation, cobertura ja feita por testes de integracao do PageEditor/DatabaseBlock no runtime).
- `npx tsc --noEmit -p tsconfig.app.json` sem novos erros nos arquivos modificados (erro Json union resolvido com cast `as never`).
- Dev server `npm run dev` (porta 8080) responde HTTP 200, HMR limpo apos cada edicao.
- Verificacao manual via `grep`:
  - `useUpdateBoardViewConfig` em useBoardViews.ts: 1 match
  - `DatabaseListItem` + `ListItemPropChip` em DatabaseListItem.tsx: 5 matches
  - `DatabaseListViewConfig` + `visibleProps` em DatabaseListViewConfig.tsx: 11 matches
  - `DatabaseListItem`/`visibleProps`/`setSelectedItem`/`useBoardViews` em DatabaseListView.tsx: 16 matches
- Zero em-dash, UI 100% pt-BR (verificacao manual nos 3 arquivos novos).

## Desvios do Plano

**1. [Regra 1 - Bug] Cast `config as never` em useUpdateBoardViewConfig**

- **Encontrado durante:** Tarefa 4 (typecheck final)
- **Issue:** Supabase types geram `Json` como union recursivo narrow (`string | number | boolean | { [k]: Json } | Json[] | null`). Type checker rejeitava `Record<string, unknown>` como assignable.
- **Correcao:** Cast `{ config: config as never }` na linha do update. Comentario explicando o cast. A validacao real do shape e responsabilidade do caller (que sempre passa `{ visibleProps: string[], ...baseConfig }` controlado pelo TS).
- **Arquivos modificados:** `src/hooks/useBoardViews.ts`
- **Commit:** `82f8357` (junto com task 4)

**2. [Regra 5 - Conexao] Passar `activeViewId` do DatabaseViewRenderer pra DatabaseListView**

- **Encontrado durante:** Tarefa 4 (revisao do DatabaseViewRenderer)
- **Issue:** O plano definia `DatabaseListView` aceitando `activeViewId?: string | null` mas o DatabaseViewRenderer (que ja resolve activeView) nao passava esse id. Sem isso, a list view pegaria "primeira view list_detailed" em vez da view ativa do tabs (02-08).
- **Correcao:** `<DatabaseListView mode="database" activeViewId={activeView?.id ?? null} />` no DatabaseViewRenderer. Compatibilidade total com 02-08 DatabaseViewTabs.
- **Arquivos modificados:** `src/components/database/DatabaseViewRenderer.tsx`
- **Commit:** `82f8357` (junto com task 4)

**3. [Regra 2 - Critico] Adaptar plano pra usar `activeBoard.groups[]` em vez de items/columnValues raw**

- **Encontrado durante:** Tarefa 4 (leitura do BoardContext)
- **Issue:** O plano original supos que `useApp()` expoe `items: Item[]` e `columnValues: ColumnValue[]` em formato camelCase ja com `item.columnValues` como Record. Mas o BoardContext expoe esses como raw db (snake_case: `i.group_id`, `i.board_id`, `cv.item_id`, `cv.column_id`). O `activeBoard.groups[]` (memoized no BoardContext) e que ja vem transformado com `g.items[]` aninhados e `item.columnValues` como Record - pattern usado por BoardCalendar/BoardKanban.
- **Correcao:** DatabaseListView le `activeBoard.groups` em vez de `items + columnValues + groups` separados. Mesmo pattern dos outros componentes Board*.
- **Arquivos modificados:** `src/components/database/DatabaseListView.tsx`
- **Commit:** `82f8357`

## Issues Adiados

Nenhum critico. Itens conscientemente fora do escopo deste plano:
- **Virtualizacao (TanStack Virtual) para listas >50 items:** O critical_notes do prompt mencionou, mas a Page/Database tem max-h-[560px] com overflow-y-auto e items.length tipico em databases inline e baixo. Adiar pra otimizacao depois que tivermos databases com 200+ items reais. Tracked como TODO em deferred-items.md se necessario.
- **Edicao inline em chips:** O criterios_de_sucesso explicita "Edicao inline: NAO obrigatoria neste plano". Click no item abre ItemDetailPanel pra editar (pattern consistente).
- **Drag/drop pra reordenar items na lista:** Nao escopo. ItemDetailPanel tem reorder via groups.
- **Empty state com CTA pra criar item direto:** Plano define "Use a view Tabela para adicionar" como mensagem. Manter consistencia.

## Commits

| Tarefa | Hash | Mensagem |
|--------|------|----------|
| 1 | `4d1b26b` | feat(02-07): add useUpdateBoardViewConfig hook |
| 2 | `edd96c5` | feat(02-07): add DatabaseListItem (Notion-style list row) |
| 3 | `3d5c732` | feat(02-07): add DatabaseListViewConfig popover |
| 4 | `82f8357` | feat(02-07): rewrite DatabaseListView with real Notion-style layout |

## Self-Check: PASSOU

- src/hooks/useBoardViews.ts: ENCONTRADO (useUpdateBoardViewConfig presente)
- src/components/database/DatabaseListItem.tsx: ENCONTRADO
- src/components/database/DatabaseListViewConfig.tsx: ENCONTRADO
- src/components/database/DatabaseListView.tsx: ENCONTRADO (reescrito, nao mais stub)
- src/components/database/DatabaseViewRenderer.tsx: ENCONTRADO (activeViewId pass-through)
- Commit 4d1b26b: ENCONTRADO
- Commit edd96c5: ENCONTRADO
- Commit 3d5c732: ENCONTRADO
- Commit 82f8357: ENCONTRADO
- `npm run build`: PASSOU (0 erros novos)
- `npm run test`: PASSOU (199/199)
- `npx tsc --noEmit -p tsconfig.app.json`: PASSOU para arquivos modificados (sem novos erros)
- Dev server `npm run dev` HTTP 200, HMR limpo

## Proximos planos

- **02-08:** `DatabaseViewTabs` real - lista views do board (Tabela/Kanban/Calendario/Lista detalhada), tab ativa controla `activeViewId` passado pro DatabaseViewRenderer (que ja passa pra DatabaseListView neste plano). Botao "+" pra criar nova view. Sort/filters por view persistidos em `board_views.config` (DatabaseListViewConfig ja preserva outros campos via baseConfig).
- **02-11:** Polimento final - verificacao runtime end-to-end do bloco database em /page/:id, incluindo trocar entre as 4 views, configurar visibleProps na lista, abrir items via ItemDetailPanel, etc.
