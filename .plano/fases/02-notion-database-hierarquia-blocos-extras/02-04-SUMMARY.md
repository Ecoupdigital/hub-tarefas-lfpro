---
phase: 02-notion-database-hierarquia-blocos-extras
plan: 02-04
subsystem: subpages-crud
tags: [pages, hierarchy, cascade-delete, breadcrumb, custom-events, lexorank, rpc]
requires:
  - "Plano 02-01: pages.parent_id, pages.sort_order, boards.page_id, is_page_admin"
  - "Plano 02-02: PageTreeItem dispatches lfpro-create-subpage CustomEvent"
  - "Plano 02-03: src/utils/lexorank.ts (nextKeyAfter wrapper de fractional-indexing)"
provides:
  - "useCreatePage estendido com parentId? + sort_order via lexorank.nextKeyAfter"
  - "useDeletePage chama RPC soft_delete_page_cascade (cascata pages + databases)"
  - "RPC soft_delete_page_cascade: walk RECURSIVE em parent_id + UPDATE state='deleted'"
  - "PageBreadcrumb: render Workspace > ancestrais > current page (subindo parent_id)"
  - "PageHeader integra PageBreadcrumb acima do titulo"
  - "AppSidebar listener global pra lfpro-create-subpage (cria subpage + navega)"
affects:
  - "src/hooks/useCrudMutations.ts: signature de useCreatePage agora aceita parentId; useDeletePage retorna count via RPC"
  - "src/components/page/PageHeader.tsx: layout vira coluna (breadcrumb em cima, titulo+menu embaixo)"
  - "src/components/AppSidebar.tsx: SidebarContent escuta CustomEvent 'lfpro-create-subpage'"
tech-stack:
  added: []
  patterns:
    - "RPC SECURITY DEFINER com defesa em profundidade (is_page_admin inline check)"
    - "WITH RECURSIVE em parent_id pra coletar descendentes (PostgreSQL CTE recursivo)"
    - "Lexorank sort_order: nextKeyAfter(last_sibling.sort_order) pra append no nivel"
    - "Loop client-side pra construir breadcrumb (vs. RPC com CTE): trade-off simplicidade vs N queries"
    - "Cast 'as never' em supabase.rpc() pra contornar tipos nao regenerados (padrao do codebase)"
key-files:
  created:
    - "supabase/migrations/20260523110000_cascade_soft_delete_pages.sql"
    - "src/components/page/PageBreadcrumb.tsx"
  modified:
    - "src/hooks/useCrudMutations.ts"
    - "src/components/page/PageHeader.tsx"
    - "src/components/AppSidebar.tsx"
decisions:
  - "RPC SECURITY DEFINER + inline is_page_admin check: defesa em profundidade contra bypass de RLS via rpc"
  - "Breadcrumb sobe parent_id via N queries (max 20 niveis) em vez de RPC com CTE: hierarquias tipicas <5 niveis, simplicidade vence"
  - "staleTime 60s em ['page-breadcrumb', pageId]: trade-off entre custo de query e label desatualizado quando ancestral e renomeado"
  - "Listener CustomEvent vive em SidebarContent (nao em hook dedicado): evita criar useCreatePage em cada PageTreeItem recursivo"
  - "Toast informativo 'X paginas movidas para lixeira' so quando count > 1 (cascade real)"
  - "Layout PageHeader vira coluna (flex-col) pra acomodar breadcrumb sem espremer titulo/menu"
metrics:
  duration_minutes: 18
  tasks_completed: 5
  files_created: 2
  files_modified: 3
  tests_added: 0
  total_tests: 193
  completed_date: 2026-05-22
---

# Fase 02 Plano 02-04: Subpages CRUD + breadcrumb + cascade delete Summary

## One-liner

Implementa criacao de subpages via CustomEvent (`lfpro-create-subpage` -> `useCreatePage({ parentId, sort_order: lexorank })`), cascade soft delete via RPC `soft_delete_page_cascade` (WITH RECURSIVE em parent_id, marca pages + boards.page_id como state='deleted'), e renderiza trilha hierarquica via `PageBreadcrumb` (sobe a cadeia parent_id ate root, Workspace > ancestrais > current) integrada no PageHeader.

## O que foi feito

### Migration `20260523110000_cascade_soft_delete_pages.sql`

RPC `soft_delete_page_cascade(_page_id UUID) RETURNS INTEGER`, SECURITY DEFINER, com:

1. Auth check inline: `auth.uid()` IS NOT NULL + `is_page_admin(caller, _page_id)`. Defesa em profundidade caso bypass de RLS via rpc.
2. WITH RECURSIVE em `parent_id` pra coletar todas as subpages descendentes ativas. UPDATE `state='deleted'` em todas. `GET DIAGNOSTICS affected_count = ROW_COUNT` retorna count pra UI mostrar toast.
3. Segundo WITH RECURSIVE pra propagar pra boards (databases inline) cujo `page_id` esta em qualquer page descendente. UPDATE `state='deleted'` nos boards ativos.

Comentario na funcao documenta semantica.

### `src/hooks/useCrudMutations.ts` (modificado)

- **Import:** `nextKeyAfter` de `@/utils/lexorank` (deliverable do plano 02-03, paralelo).
- **`useCreatePage`:**
  - Nova prop `parentId?: string | null` (default `null` = root)
  - Query de siblings: filtra por `parent_id IS NULL` ou `parent_id = parentId` no mesmo workspace + state='active', pega ultimo `sort_order` (desc limit 1)
  - Calcula `newSortOrder = nextKeyAfter(lastSortOrder)` (lexorank base-62 fractional-indexing)
  - Insert agora carrega `sort_order` e `parent_id` alem dos campos existentes
  - Mantem `position` (retrocompat) com fallback maxPosition+1000
  - Invalidacao expandida: `pages-tree[workspace, parentId]`, `pages-tree[workspace]`, `pages-tree` broad
- **`useDeletePage`:** substitui UPDATE direto por `supabase.rpc('soft_delete_page_cascade', { _page_id: id })`. Cast `as never` na rpc/args (padrao do codebase pra RPCs novas nao regeneradas no Database type). Retorna count e dispara toast `${count} paginas movidas para lixeira` quando count > 1.

### `src/components/page/PageBreadcrumb.tsx` (novo)

Componente recebe `pageId` e renderiza nav horizontal com chevrons:

`[Workspace name] > [root ancestor] > ... > [parent] > [current (span aria-current)]`

- Query queryKey `['page-breadcrumb', pageId]`, staleTime 60s
- queryFn faz loop client-side: cada step query `pages` por `id` retornando `parent_id, workspace_id, title`, ate parent_id IS NULL ou limite 20 (defensivo contra ciclos corrompidos)
- `useApp().workspaces` pra resolver nome do workspace pelo workspace_id capturado no loop
- Cada ancestral renderiza como `<Link to="/page/:id">`, current renderiza como `<span aria-current="page">` (sem link)
- Workspace renderiza como `<Link to="/workspace/:id">` (rota existente em App.tsx:46)
- truncate + title attribute em cada item pra evitar overflow visual em titulos longos

### `src/components/page/PageHeader.tsx` (modificado)

Container externo vira flex-col: breadcrumb em cima (com `mt-1` no row do titulo) preservando sticky/border/padding/z-10. Titulo + extraSlot + status + dropdown menu inalterados (mudancas puramente de layout).

### `src/components/AppSidebar.tsx` (modificado)

`SidebarContent` ganha:

- Import `useCreatePage` de `useCrudMutations`
- `const createPage = useCreatePage()`
- `useEffect` que registra listener global em `window` pro evento `lfpro-create-subpage`:
  - Le `detail.workspaceId` + `detail.parentId` (dispatched por PageTreeItem dropdown "Nova subpagina")
  - Chama `createPage.mutateAsync({ workspaceId, parentId, title: 'Nova subpagina' })`
  - Toast 'Subpagina criada' + `navigate(/page/:id)` na nova page
  - try/catch com toast de erro defensivo
- Cleanup removeEventListener no unmount

Centralizar o listener no Sidebar (vs em cada PageTreeItem recursivo) evita instanciar uma `useMutation` por no da arvore.

## Verificacao

- `npm run build` passa (16.66s, sem erros novos)
- `npm run test` passa: **193 testes (9 arquivos)**, identico ao baseline pos-02-03
- Dev server (http://localhost:8082) responde 200 OK
- `npx tsc --noEmit -p tsconfig.app.json`: 3 erros pre-existentes (`useUpdatePageContent` content type, `duplicate_board_with_options` RPC type), zero erros novos nos arquivos modificados
- Greps de verificacao:
  - migration: 8 matches de `soft_delete_page_cascade|RECURSIVE page_tree|is_page_admin`
  - useCrudMutations: 20 matches de `parentId|soft_delete_page_cascade|nextKeyAfter|sort_order`
  - PageBreadcrumb: 6 matches de `PageBreadcrumb|parent_id`
  - PageHeader: 2 matches de `PageBreadcrumb` (import + uso)
  - AppSidebar: 4 matches de `lfpro-create-subpage`
- Zero em-dashes nos arquivos criados/modificados por este plano

## Migration NAO aplicada em remoto

Conforme protocolo brownfield, `20260523110000_cascade_soft_delete_pages.sql` **nao foi aplicada** no Supabase de producao. Dono aplica via Coolify/Supabase CLI separadamente quando aprovar.

## Wave 2 Paralelismo: race condition observada (registro)

Este plano (02-04) executou em paralelo com 02-03 (drag/drop lexorank). Ambos modificam `src/hooks/useCrudMutations.ts`. O agente 02-03 fez seu commit `8bdbb50` (feat(02-03): add useReorderPage mutation) APOS minha edicao de Tarefa 2 (useCreatePage/useDeletePage) ja estar no working tree mas ainda nao staged. O `git add useCrudMutations.ts` do 02-03 capturou ambos os conjuntos de edits e os commitou sob a mensagem de 02-03.

- **Estado funcional do codigo: correto.** Tanto `useReorderPage` (02-03) quanto `useCreatePage(parentId)` + `useDeletePage(rpc cascade)` (02-04) estao em HEAD e funcionando.
- **Estado de attribution: misturado.** Minha tarefa 2 esta em `8bdbb50` em vez de em commit dedicado de 02-04.
- **Decisao (Regra 4 builder mode auto):** NAO reescrever historico. Reverter/amend `8bdbb50` seria destrutivo e arriscaria perder o trabalho de 02-03. Documentar a mistura aqui e seguir.
- **Mitigacao futura:** Em waves paralelas que tocam o mesmo arquivo, a recomendacao e usar git worktrees isolados ou ordenar planos sequencialmente (wave 2.5 vs 2). Worth feedback ao tooling de execucao paralela.

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Blocking] Rota do workspace no breadcrumb**

- **Encontrado durante:** Tarefa 3
- **Issue:** Plano sugeriu `to={/workspace/:id}` para o link do workspace. Verifiquei `App.tsx` e confirmei que a rota existe (`<Route path="/workspace/:workspaceId" element={<Index />} />` linha 46). Inicialmente havia usado `/?workspace=...` (query param) como fallback defensivo, mas isso seria inconsistente com o resto do app.
- **Correcao:** Trocar pra `/workspace/:workspaceId` (rota dedicada existente).
- **Arquivos modificados:** `src/components/page/PageBreadcrumb.tsx`
- **Commit:** Junto com Task 3 (`5c7aeb9`)

**2. [Regra 4 - Arquitetural (auto-decisao)] Race condition de commit entre 02-03 e 02-04**

Vide secao "Wave 2 Paralelismo" acima. Builder mode autodecidiu nao reescrever historico.

### Out of scope (registrado, nao corrigido)

- **Em-dash em comentario pre-existente `src/hooks/useCrudMutations.ts:596`** (`// Delete workspace ... CASCADE`): vindo de fase anterior, em `useDeleteWorkspace` que nao foi modificado por este plano. Listado pra housekeeping futuro.
- **3 erros TS pre-existentes em useCrudMutations.ts**: documentados desde 02-01 (BoardContext.description, duplicate_board_with_options RPC). Fora do escopo conforme regra de limite.

## Compatibilidade

- `useCreatePage` sem `parentId` continua criando page root (default `null`).
- `useDeletePage` retorna agora `Promise<number>` (count) mas callers existentes (PageHeader.handleDelete, useTrash) ignoram o retorno, mantendo retrocompat.
- PageBreadcrumb degrada gracefully: workspace nao encontrado -> nao renderiza prefix; chain vazia -> retorna `null` (PageHeader continua funcionando sem breadcrumb).
- Layout do PageHeader: visual minimamente afetado (mt-1 entre breadcrumb e titulo); sticky/z-index preservados.
- Listener `lfpro-create-subpage` em AppSidebar nao colide com outros listeners (handler so age se detail tem workspaceId+parentId).

## Commits

| Tarefa | Hash | Mensagem |
|--------|------|----------|
| 1 | `5759ca9` | feat(02-04): add RPC soft_delete_page_cascade migration |
| 2 | `8bdbb50`* | feat(02-04): useCreatePage(parentId) + useDeletePage cascade RPC |
| 3 | `5c7aeb9` | feat(02-04): add PageBreadcrumb component |
| 4 | `8a53834` | feat(02-04): integrate PageBreadcrumb above title in PageHeader |
| 5 | `c1e3509` | feat(02-04): add lfpro-create-subpage listener in SidebarContent |

\* Tarefa 2 acabou commitada junto com 02-03's useReorderPage em `8bdbb50` (titulado feat(02-03)) por race condition de wave 2 paralelo. Vide secao "Wave 2 Paralelismo".

## Self-Check: PASSOU

- supabase/migrations/20260523110000_cascade_soft_delete_pages.sql: ENCONTRADO
- src/components/page/PageBreadcrumb.tsx: ENCONTRADO
- src/hooks/useCrudMutations.ts (modificado): ENCONTRADO (parentId/sort_order/cascade RPC em HEAD)
- src/components/page/PageHeader.tsx (modificado): ENCONTRADO (PageBreadcrumb importado e usado)
- src/components/AppSidebar.tsx (modificado): ENCONTRADO (lfpro-create-subpage listener em SidebarContent)
- Commit 5759ca9: ENCONTRADO
- Commit 8bdbb50: ENCONTRADO (contem tarefa 2 + commits de 02-03)
- Commit 5c7aeb9: ENCONTRADO
- Commit 8a53834: ENCONTRADO
- Commit c1e3509: ENCONTRADO

## Proximos planos

- **02-05:** Slash menu de database inline (criar database a partir de bloco /database)
- **02-06:** RPC `create_database_inline` (board + 4 views default + columns padrao)
- **02-07:** DatabaseViewTabs (toggle entre table/kanban/calendar/list_detailed inline na page)
- **02-08:** DatabaseListView (Notion-style list com chips de props)
