---
phase: 02-notion-database-hierarquia-blocos-extras
plan: 02-02
subsystem: sidebar-tree
tags: [sidebar, hierarchy, pages-tree, lazy-load, react-query, realtime]
requires:
  - "Plano 02-01: pages.parent_id, pages.sort_order, boards.page_id, PageTreeNode type"
provides:
  - "usePagesTree(workspaceId, parentId, enabled): query React Query lazy com child_count agregado"
  - "useDatabasesForPage(pageId, enabled): boards inline ancorados numa page"
  - "Componente PageTreeItem recursivo (page + subpages + databases inline) com expand/collapse"
  - "Componente DatabaseSidebarItem (folha da arvore, navega pra /page/:parent#db=:id)"
  - "AppSidebar substitui lista plana de PageSidebarItem por arvore lazy via WorkspaceRootPages"
  - "Realtime: pages e boards (com page_id) invalidam pages-tree e databases-for-page"
affects:
  - "src/components/AppSidebar.tsx: WorkspaceItem agora renderiza arvore recursiva"
  - "src/hooks/useSupabaseData.ts: 2 hooks novos"
  - "src/hooks/useRealtimeSync.ts: handlers de pages e boards estendidos com invalidacoes da arvore"
tech-stack:
  added: []
  patterns:
    - "Lazy load por nivel via React Query enabled-gated"
    - "child_count agregado em memoria (subquery duas vezes + reduce) pra evitar render de chevron sem filhos"
    - "Estado de expansao persistido em localStorage com prefix lfpro-"
    - "CustomEvent lfpro-create-subpage como ponto de extensao consumido por Plano 02-04"
    - "Indentacao via paddingLeft style inline (level * 16) ao inves de classes Tailwind dinamicas"
key-files:
  created:
    - "src/components/DatabaseSidebarItem.tsx"
    - "src/components/PageTreeItem.tsx"
  modified:
    - "src/hooks/useSupabaseData.ts"
    - "src/components/AppSidebar.tsx"
    - "src/hooks/useRealtimeSync.ts"
decisions:
  - "Mantemos PageSidebarItem no codebase (sem deletar) pois Plano 02-04 pode reusar pra fluxo de criacao. PageTreeItem nao herda dele porque o recursivo precisa de mais estado (expanded/child queries)"
  - "child_count e agregado em memoria com 2 subqueries (pages + boards) ao inves de RPC postgres, mantendo plano simples e custos baixos por nivel (datasets pequenos)"
  - "WorkspaceRootPages dispara usePagesTree(ws, null, expanded) ao inves de fetch eager; arvore inteira so carrega conforme usuario expande nos"
  - "DatabaseSidebarItem navega pra /page/:parent#db=:id (hash anchor) ao inves de rota nova /database/:id, deixando a Page parente como container natural (decisao da Fase 02 CONTEXT.md: database e bloco dentro da page)"
  - "Realtime de boards invalida pages-tree broad (sem workspace/parent especifico) porque payload nao traz parent_id da page parente; trade-off aceito pois invalidacao broad em react-query e barato"
metrics:
  duration_minutes: 22
  tasks_completed: 5
  files_created: 2
  files_modified: 3
  tests_added: 0
  total_tests: 193
  completed_date: 2026-05-22
---

# Fase 02 Plano 02-02: Sidebar tree expansivel Summary

## One-liner

Substitui a lista plana de pages no AppSidebar por uma arvore expansivel recursiva (PageTreeItem) com lazy load por nivel via React Query (usePagesTree), suportando subpages e databases inline (boards.page_id), com child_count agregado em memoria, estado de expansao em localStorage e invalidacao realtime de pages-tree/databases-for-page.

## O que foi feito

### Hooks novos (`src/hooks/useSupabaseData.ts`)

1. **`usePagesTree(workspaceId, parentId, enabled = true)`** — Retorna `PageTreeNode[]` para os filhos diretos de um node (ou root quando `parentId === null`). Faz query principal em `pages` + duas subqueries de agregacao (pages com mesmo parent + boards com page_id IN pageIds) e calcula `child_count` em memoria. Lazy via `enabled` flag (queryKey: `['pages-tree', workspaceId, parentId]`).

2. **`useDatabasesForPage(pageId, enabled = true)`** — Retorna boards com `page_id = pageId` e `state = 'active'`. Ordena por `position` + `created_at`. QueryKey: `['databases-for-page', pageId]`.

Import `PageTreeNode` adicionado ao topo do arquivo. Sem mudanca aos selects ja existentes.

### Componentes novos

1. **`src/components/DatabaseSidebarItem.tsx`** — Folha da arvore representando database inline. Click navega pra `/page/:parentPageId#db=:databaseId` (hash anchor). Renderiza icone Lucide `Database` (com tint do `color` do board) ou emoji se `icon` setado. Indentacao via `paddingLeft: level * 16 + 8`.

2. **`src/components/PageTreeItem.tsx`** — No recursivo da arvore:
   - Chevron expand/collapse aparece quando `child_count > 0`
   - Click no titulo navega pra `/page/:id`
   - Estado de expansao em `localStorage` key `lfpro-page-expanded-:id`
   - Lazy: ao expandir, dispara `usePagesTree(ws, node.id, true)` + `useDatabasesForPage(node.id, true)`
   - Dropdown: "Nova subpagina" dispara `CustomEvent('lfpro-create-subpage', { workspaceId, parentId })` consumido pelo Plano 02-04, "Renomear" inline, "Excluir" com AlertDialog
   - Filtro de busca propagado via prop `searchQuery` (esconde nos sem match e sem filhos)
   - Recursivo: cada subpage renderiza outro PageTreeItem com `level + 1`; databases sao folhas

### `src/components/AppSidebar.tsx` modificado

- Import substituido: `PageSidebarItem` saiu, `PageTreeItem` + `usePagesTree` entraram
- Novo helper `WorkspaceRootPages` definido antes de `SortableWorkspaceItem`: dispara `usePagesTree(workspaceId, null, expanded)` apenas quando workspace esta expandido, e mapeia cada page root pra `PageTreeItem` com `level=0`
- Bloco `{filteredPages.length > 0 && ...}` substituido por `<WorkspaceRootPages />` (a logica de filtragem por busca agora vive dentro de PageTreeItem)
- `WorkspaceFolders` (boards tradicionais) preservado intacto, mantendo retrocompat de boards sem `page_id`
- `useWorkspaceEntries` mantido apenas pro gate `showWs` (decidir se renderiza o workspace quando ha busca ativa). pageEntries continua extraindo pages root pra esse calculo
- Limpado em-dash de comentario adjacente (linha 150) pra conformidade com regra global

### `src/hooks/useRealtimeSync.ts` modificado

Listener de `pages` agora invalida `['pages-tree', workspaceId, parentId]` (nivel afetado) e `['pages-tree', workspaceId, null]` (root, pois child_count do parent pode mudar) alem das ja existentes `['pages']`, `['all-pages']`, `['page', pageId]`.

Listener de `boards` agora le `payload.new/old.page_id`; se setado, invalida `['databases-for-page', pageId]` e `['pages-tree']` (broad pois child_count pode mudar). Boards sem page_id continuam invalidando apenas `['boards']`.

## Verificacao

- `npm run build` passa (16.52s, sem erros novos)
- `npm run test` passa: **193 testes (9 arquivos)**, identico ao baseline pos-02-01
- `npx tsc --noEmit -p tsconfig.app.json`: 5 erros pre-existentes (auditados via `git stash`), zero erros novos nos arquivos modificados
- Dev server (http://localhost:8080) responde 200 OK
- Zero em-dashes em todos os arquivos modificados/criados
- Sem `any` em PageTreeItem (cumpre criterio do done)

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 1 - Bug] Em-dash pre-existente em comentario de AppSidebar.tsx**

- **Encontrado durante:** Tarefa 4, ao rodar `grep -c '—'` apos modificacao
- **Issue:** Linha 150 tinha um em-dash em comentario inline (vindo do Plano 01-03). Apesar de pre-existente, esta no mesmo bloco logico que o codigo modificado.
- **Correcao:** Em-dash trocado por virgula (`— ambos` -> `, ambos`)
- **Arquivos modificados:** `src/components/AppSidebar.tsx`
- **Commit:** Junto com Task 4 (`aa49156`)

### Out of scope (registrado, nao corrigido)

- **Em-dash em comentarios JSDoc de `src/hooks/useRealtimeSync.ts`** (linhas 6 e 92): Pre-existentes na Fase 01-03. Fora do escopo desta tarefa (regra de limite). Listado pra ser limpo em fase futura de housekeeping.
- **Erros TS pre-existentes em useSupabaseData.ts** (5 erros relacionados a BoardSort overloads + duplicate_board_with_options RPC): herdados das fases anteriores, fora do escopo.

## Compatibilidade

- Boards tradicionais (boards com `page_id IS NULL`) continuam aparecendo via `WorkspaceFolders` sem nenhuma mudanca de comportamento.
- `PageSidebarItem` segue exportado e pode ser usado em modais de criacao (Plano 02-04). Nenhum import quebrou.
- Workspace que ainda nao foi expandido nao dispara nenhuma query nova (lazy de verdade).
- Workspace sem nenhuma page root renderiza vazio (sem chevron, sem placeholder), mantendo UX limpa.

## Commits

| Tarefa | Hash | Mensagem |
|--------|------|----------|
| 1 | `33694a9` | feat(02-02): add usePagesTree + useDatabasesForPage hooks |
| 2 | `9a45b53` | feat(02-02): add DatabaseSidebarItem (database inline no sidebar) |
| 3 | `4732bc4` | feat(02-02): add PageTreeItem (no recursivo da arvore de pages) |
| 4 | `aa49156` | feat(02-02): switch AppSidebar para arvore de pages via PageTreeItem |
| 5 | `3d91d3e` | feat(02-02): realtime invalidate pages-tree + databases-for-page |

## Self-Check: PASSOU

- src/hooks/useSupabaseData.ts: ENCONTRADO
- src/components/DatabaseSidebarItem.tsx: ENCONTRADO
- src/components/PageTreeItem.tsx: ENCONTRADO
- src/components/AppSidebar.tsx: ENCONTRADO
- src/hooks/useRealtimeSync.ts: ENCONTRADO
- Commit 33694a9: ENCONTRADO
- Commit 9a45b53: ENCONTRADO
- Commit 4732bc4: ENCONTRADO
- Commit aa49156: ENCONTRADO
- Commit 3d91d3e: ENCONTRADO

## Proximos planos

- **02-03:** Drag/drop de pages na arvore (dnd-kit), reordenacao via lexorank, reparenting entre nodes do mesmo workspace
- **02-04:** Modal/fluxo de criacao de subpagina consumindo `CustomEvent('lfpro-create-subpage')`. Estende `useCreatePage` pra aceitar `parent_id` + computa `sort_order` lexorank
- **02-05+:** Criacao de database inline via slash menu (RPC `create_database_inline`), tabs de views, ListView Notion-style
