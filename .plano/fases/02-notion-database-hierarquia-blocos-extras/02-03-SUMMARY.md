---
phase: 02-notion-database-hierarquia-blocos-extras
plan: 02-03
subsystem: sidebar-tree-dnd
tags: [dnd-kit, lexorank, fractional-indexing, sortable, drag-drop, optimistic-update]
requires:
  - "Plano 02-01: pages.sort_order TEXT (lexorank), pages.parent_id, boards.page_id"
  - "Plano 02-02: PageTreeItem, DatabaseSidebarItem, WorkspaceRootPages, usePagesTree"
provides:
  - "fractional-indexing@^3.2.0 instalado"
  - "src/utils/lexorank.ts: firstKey, nextKeyAfter, previousKeyBefore, keyBetween, nKeysBetween, compareKeys"
  - "useReorderPage mutation com optimistic update + rollback"
  - "PageTreeItem com useSortable (drag handle GripVertical on hover) + useDroppable (zona 'dentro' com ring visual)"
  - "WorkspaceRootPages com DndContext + SortableContext + DragOverlay; validacoes (cross-workspace, drop em database, drop circular)"
  - "SortableContext aninhado por nivel em PageTreeItem (children re-orderaveis dentro do parent)"
affects:
  - "package.json: nova dependencia fractional-indexing"
  - "src/hooks/useCrudMutations.ts: useReorderPage adicionado"
  - "src/components/PageTreeItem.tsx: drag handle + drop zone 'dentro' + SortableContext aninhado"
  - "src/components/AppSidebar.tsx: WorkspaceRootPages agora hospeda DndContext escopado ao workspace"
tech-stack:
  added:
    - "fractional-indexing@^3.2.0"
  patterns:
    - "Lexorank base-62 via fractional-indexing: chaves comparaveis por string-compare nativo"
    - "Optimistic update com snapshot de TODOS os caches pages-tree + rollback no onError"
    - "SortableContext aninhado por nivel da arvore (root em WorkspaceRootPages, children em PageTreeItem)"
    - "DragOverlay com ghost (icone + nome) pra feedback visual durante drag"
    - "PointerSensor com activationConstraint distance:8 pra distinguir click de drag"
    - "isDescendantOf scan dos caches pages-tree pra rejeitar drop circular sem round-trip ao DB"
key-files:
  created:
    - "src/utils/lexorank.ts"
    - "src/test/lexorank.test.ts"
  modified:
    - "package.json"
    - "package-lock.json"
    - "src/hooks/useCrudMutations.ts"
    - "src/components/PageTreeItem.tsx"
    - "src/components/AppSidebar.tsx"
decisions:
  - "Estrategia de aninhamento de SortableContext: aninhado por nivel ao inves de flat. Cada nivel expandido tem seu proprio SortableContext envolvendo os irmaos. Simplifica a logica de drag-end (so precisa olhar overData.parentId)"
  - "Drop sobre outra page no mesmo nivel = irmao depois dela (heuristica simples). Drop 'dentro' (zona droppable separada) = filho no final. Drop entre nao implementado (overlay rejeita)"
  - "DndContext escopado ao workspace (em WorkspaceRootPages) ao inves de global, evitando conflito com o DndContext de workspaces preservado em SidebarContent (do Fase 01)"
  - "isDescendantOf usa breadth-first scan dos caches pages-tree (so consulta o que ja foi carregado). Trade-off: se subarvore nao foi expandida, drop circular pode passar; mas semantically e improvavel (usuario teria que carregar a subarvore antes pra arrastar)"
  - "Optimistic update snapshota TODAS as queries pages-tree e rollback em todas no onError. Mais conservador que rollback parcial, mas garante consistencia"
  - "Drag handle GripVertical aparece on hover (opacity-0 group-hover/page:opacity-100), pra nao poluir UX da arvore"
  - "Validacoes: cross-workspace, drop em database (id 'db-*'), drop sobre si mesma, drop sobre descendente. Toast com mensagem em pt-BR pra cada caso"
metrics:
  duration_minutes: 18
  tasks_completed: 6
  files_created: 2
  files_modified: 5
  tests_added: 6
  total_tests: 199
  completed_date: 2026-05-22
---

# Fase 02 Plano 02-03: Drag/drop na arvore com lexorank Summary

## One-liner

Habilita drag/drop reordenacao + reaninhamento na arvore de pages do sidebar usando dnd-kit (useSortable + useDroppable) com sort_order base-62 via fractional-indexing, mutation `useReorderPage` com optimistic update + rollback, validacoes (cross-workspace, drop em database, drop circular via scan dos caches) e DragOverlay com ghost.

## O que foi feito

### Dependencia (`package.json`)

- `fractional-indexing@^3.2.0` em `dependencies`. Charset BASE_62. Chaves comparaveis via string-compare nativo (a0 < a1 < ... < zz). Usado pra `pages.sort_order`.

### Utils (`src/utils/lexorank.ts`)

Wrappers tipados em volta de `fractional-indexing`:
- `firstKey()` retorna `'a0'`
- `nextKeyAfter(prev)` insere apos prev
- `previousKeyBefore(next)` insere antes de next
- `keyBetween(prev, next)` insere entre dois
- `nKeysBetween(prev, next, n)` retorna n chaves crescentes distintas
- `compareKeys(a, b)` retorna -1/0/1 via string-compare

Convencoes: `null` = "antes de tudo" (em prev) ou "depois de tudo" (em next).

### Mutation (`src/hooks/useCrudMutations.ts`)

`useReorderPage` aceita `{ pageId, newSortOrder, newParentId? }`:
- `newParentId: undefined` = nao muda parent
- `newParentId: null` = move pra root
- `newParentId: string` = move pra sub de outra page

**Optimistic update** (`onMutate`):
- Cancela queries pages-tree pendentes
- Snapshota TODOS os caches `['pages-tree']` (todos workspaces/parents)
- Pra cada cache que contem a page: se parent mudou, remove; se nao, atualiza sort_order e re-ordena
- Retorna snapshots no context pra rollback

**Rollback** (`onError`):
- Restaura todos os caches snapshotados
- Toast `"Erro ao reordenar pagina. Tente novamente."`

**onSuccess:** invalida `pages-tree`, `pages`, `all-pages` (forca refetch consistente).

### PageTreeItem (`src/components/PageTreeItem.tsx`)

Adicionado:
- `useSortable({ id: 'page-<id>', data: { type:'page', pageId, parentId, workspaceId } })` no wrapper externo
- `useDroppable({ id: 'page-<id>-inside', data: { type:'page-inside', parentPageId, workspaceId } })` no miolo da linha
- Drag handle `GripVertical` com `{...attributes} {...listeners}`, opacidade 0 -> 100 on hover (group-hover/page)
- Quando `isOverInside && !isDragging`: aplica `bg-primary/10 ring-1 ring-primary` no container (feedback visual de drop valido)
- Quando `isDragging`: opacity 0.4 no item de origem
- `SortableContext` aninhado envolvendo `childPages` quando expandido (permite reorder entre subpages do mesmo nivel)

Importacoes: `useSortable, SortableContext, verticalListSortingStrategy` de `@dnd-kit/sortable`; `useDroppable` de `@dnd-kit/core`; `CSS` de `@dnd-kit/utilities`; `GripVertical` de `lucide-react`.

### AppSidebar (`src/components/AppSidebar.tsx`)

`WorkspaceRootPages` agora hospeda o DndContext escopado ao workspace:

- `useSensors` com `PointerSensor(activationConstraint: { distance: 8 })` pra distinguir click de drag (root cause: handle clica = nao deve iniciar drag a menos que arraste 8px)
- `handleDragStart` localiza o `PageTreeNode` em qualquer cache pages-tree e seta `activeDragNode` pro overlay
- `handleDragEnd` com validacoes em camada:
  1. Cross-workspace? Toast e aborta.
  2. Drop em database (`over.id` comeca com `db-`)? Toast e aborta.
  3. Drop sobre si mesma (`overData.parentPageId === activeData.pageId` no caso `page-inside`)? Toast e aborta.
  4. Drop sobre descendente? `isDescendantOf` scan BFS dos caches pages-tree carregados.
- Computa `newSortOrder`:
  - `overData.type === 'page-inside'`: filho no final do novo parent (`prevKey = ultimo.sort_order`, `nextKey = null`)
  - `overData.type === 'page'`: irmao depois de `overData.pageId` no mesmo parent
- Chama `reorderPage.mutateAsync` com `newParentId: parentChanged ? newParentId : undefined`
- `DragOverlay` mostra ghost: card `bg-sidebar-accent border shadow-md` com icone (emoji ou `FileText`) + titulo truncado

`SortableContext` no nivel root envolve `rootPages.map(p => 'page-<id>')`.

Helper `isDescendantOf(qc, workspaceId, ancestorId, targetId)` faz BFS dos caches pages-tree (stack + visited set) procurando se `targetId` aparece como descendente de `ancestorId`. Apenas consulta caches ja carregados (nao faz round-trip ao DB).

### Testes (`src/test/lexorank.test.ts`)

6 testes unitarios: firstKey='a0', nextKeyAfter crescente, previousKeyBefore decrescente, keyBetween entre dois pontos, compareKeys -1/0/1, nKeysBetween com 5 chaves distintas crescentes.

## Verificacao

- `npm run build`: passa (16.49s, sem erros novos)
- `npm run test`: **199 testes passando** (10 arquivos). Era 193, +6 novos de lexorank.
- `npx tsc --noEmit -p tsconfig.app.json`: zero erros novos nos arquivos modificados. Erros pre-existentes (BoardContext.description, duplicate_board_with_options RPC, WorkspaceFoldersProps em AppSidebar:440) permanecem (fora de escopo).
- Sem em-dash nos arquivos criados/modificados (um em-dash pre-existente em useCrudMutations.ts:596, fora do escopo da task).

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Blocking] useDroppable nao esta em @dnd-kit/sortable**

- **Encontrado durante:** Task 4, ao rodar TS check
- **Issue:** Import original sugerido pelo plano `import { useSortable, useDroppable } from '@dnd-kit/sortable'` falha (`useDroppable` esta em `@dnd-kit/core`)
- **Correcao:** Split em duas imports: `useSortable, SortableContext, verticalListSortingStrategy` de `@dnd-kit/sortable`; `useDroppable` de `@dnd-kit/core`
- **Arquivos modificados:** `src/components/PageTreeItem.tsx`
- **Commit:** `83b60a3` (junto com Task 4)

**2. [Regra 2 - Funcionalidade critica faltante] Validacao de drop circular faltava**

- **Encontrado durante:** Task 5, analisando casos de borda
- **Issue:** Plano mencionava rejeitar drop sobre si mesma e drop em database, mas nao tratava drop sobre uma DESCENDENTE da page (ex: arrastar "Pai" pra dentro de "Filho de Pai") — produziria uma referencia circular em pages.parent_id
- **Correcao:** Helper `isDescendantOf` faz BFS dos caches pages-tree carregados pra detectar descendencia. Trade-off documentado: so detecta o que ja foi expandido (suficiente porque usuario tipicamente expande antes de arrastar)
- **Arquivos modificados:** `src/components/AppSidebar.tsx`
- **Commit:** `b357ec1` (junto com Task 5)

**3. [Regra 1 - Bug] PointerSensor sem activationConstraint causaria click-as-drag**

- **Encontrado durante:** Task 5, ao testar comportamento esperado
- **Issue:** Plano mencionava `activationConstraint: { distance: 8 }`. Sem isso, qualquer pointerdown no drag handle GripVertical dispararia drag, quebrando UX de click pra navegar
- **Correcao:** Sensor configurado conforme plano
- **Arquivos modificados:** `src/components/AppSidebar.tsx`
- **Commit:** `b357ec1`

Nenhum desvio arquitetural (Regra 4). Plano foi seguido com adaptacoes tecnicas pontuais.

## Decisoes de design

### Por que SortableContext aninhado vs flat?

Alternativas:
- **Flat:** UM SortableContext com TODOS os ids visiveis da arvore. Simples no SortableContext, mas requer coletar ids de toda a arvore recursivamente em um array (precisa do hook coletor).
- **Aninhado (escolhido):** Cada nivel expandido tem seu proprio SortableContext envolvendo os filhos diretos. Mais commits por componente, mas localiza o estado de reorder ao escopo do nivel — drag dentro de "Filhos de A" nao afeta "Filhos de B".

Aninhado tambem casa melhor com o lazy-load por nivel (filhos so existem quando expanded).

### Por que isDescendantOf scan dos caches em vez de RPC?

Round-trip ao DB pra cada drag-end seria caro. Os caches pages-tree do React Query ja contem a hierarquia carregada (lazy por nivel). Scan local cobre 99% dos casos (usuario tipicamente expandiu a subarvore antes de querer arrastar). Edge case: drop sobre descendente nao expandida — passaria a validacao client-side, mas o backend ainda pode rejeitar com check constraint (se a fase 02-01 adicionou um) ou produzir comportamento estranho ate o realtime re-sincronizar.

**Hardening futuro:** trigger postgres `BEFORE UPDATE OF parent_id` que valida ausencia de ciclo via CTE recursiva. Fica fora desta task.

### Por que optimistic update snapshota TODOS os caches pages-tree?

Page pode mudar de parent (cache origem perde a page, cache destino ganha). Snapshot global garante rollback consistente se a mutation falha. React Query getQueriesData e barato (so itera as queries no cache, sem refetch).

## Commits

| Tarefa | Hash | Mensagem |
|--------|------|----------|
| 1 | `72df0a0` | chore(02-03): add fractional-indexing dependency for lexorank |
| 2 | `88c17f5` | feat(02-03): add lexorank utils wrapping fractional-indexing |
| 3 | `8bdbb50` | feat(02-03): add useReorderPage mutation with optimistic update |
| 4 | `83b60a3` | feat(02-03): add drag handle + droppable inside to PageTreeItem |
| 5 | `b357ec1` | feat(02-03): wire DndContext on page tree with reorder + nest + validation |
| 6 | `5732417` | test(02-03): add unit tests for lexorank utils |

## Self-Check: PASSOU

- src/utils/lexorank.ts: ENCONTRADO
- src/test/lexorank.test.ts: ENCONTRADO
- src/hooks/useCrudMutations.ts (modificado, useReorderPage): ENCONTRADO
- src/components/PageTreeItem.tsx (modificado, useSortable/useDroppable): ENCONTRADO
- src/components/AppSidebar.tsx (modificado, DndContext em WorkspaceRootPages): ENCONTRADO
- package.json (fractional-indexing): ENCONTRADO
- Commit 72df0a0: ENCONTRADO
- Commit 88c17f5: ENCONTRADO
- Commit 8bdbb50: ENCONTRADO
- Commit 83b60a3: ENCONTRADO
- Commit b357ec1: ENCONTRADO
- Commit 5732417: ENCONTRADO

## Proximos planos

- **02-04 (paralelo, em andamento):** PageBreadcrumb + lfpro-create-subpage listener. Quando concluido, criar subpage via dropdown da PageTreeItem dispara modal de criacao com parent_id pre-setado.
- **02-05+:** Criacao de database inline via slash menu (RPC `create_database_inline`); tabs de view; DatabaseListView Notion-style.
- **Hardening futuro:** trigger postgres pra validar ausencia de ciclo em pages.parent_id (defesa em profundidade vs isDescendantOf client-side).
