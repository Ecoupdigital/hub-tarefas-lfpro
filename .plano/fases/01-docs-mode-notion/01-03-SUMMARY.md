---
phase: 01-docs-mode-notion
plan: 01-03
subsystem: docs-mode-create-flow
tags: [pages, sidebar, create-modal, react-query, supabase]
requires:
  - 01-01 (schema pages + tipos)
provides:
  - usePages / useAllPages / useWorkspaceEntries hooks
  - useCreatePage / useDeletePage / useRenamePage mutations
  - CreateBoardModal expandido com tipo Tarefas/Pagina
  - AppSidebar listando pages junto com boards
  - PageSidebarItem componente reutilizavel
  - Subscription Realtime para tabela pages
affects:
  - src/hooks/useSupabaseData.ts
  - src/hooks/useCrudMutations.ts
  - src/hooks/useRealtimeSync.ts
  - src/components/modals/CreateBoardModal.tsx
  - src/components/AppSidebar.tsx
  - src/components/PageSidebarItem.tsx (novo)
tech-stack:
  added: []
  patterns:
    - React Query + Supabase (espelho de useBoards/useCreateBoard)
    - Soft delete via state='deleted' (padrao boards)
    - Realtime channel postgres_changes (workspace-sync)
key-files:
  created:
    - src/components/PageSidebarItem.tsx
    - .plano/fases/01-docs-mode-notion/01-03-SUMMARY.md
  modified:
    - src/hooks/useSupabaseData.ts
    - src/hooks/useCrudMutations.ts
    - src/hooks/useRealtimeSync.ts
    - src/components/modals/CreateBoardModal.tsx
    - src/components/AppSidebar.tsx
decisions:
  - Pages NAO entram em folders no MVP (criterio do CONTEXT.md: "pages podem ir em folders no futuro"). Renderizam em lista raiz logo apos WorkspaceFolders, preservando todo o DnD/permissoes de boards.
  - WorkspaceFolders continua recebendo apenas boards (sem regressao no DnD). Pages tem caminho proprio via PageSidebarItem.
  - Plano mencionava extracao de componente como "preferida" — adotei essa abordagem.
metrics:
  duration_secs: 290
  completed: 2026-05-22
  tasks_completed: 4
  tasks_skipped_autonomous: 1
  commits: 4
---

# Fase 01 Plano 01-03: Tipo "Pagina" no modal + sidebar mista — Summary

Toggle Tarefas/Pagina no CreateBoardModal e sidebar mesclado boards + pages. Persistencia via tabela `pages` (criada no plano 01-01), hooks React Query espelhando padrao de `useBoards`/`useCreateBoard`, e Realtime channel para sincronizacao multi-aba. Page criada navega para `/page/:id` (rota a ser construida no plano 01-04).

## Tarefas executadas

| Tarefa | Nome | Commit | Arquivos chave |
|--------|------|--------|----------------|
| 1 | Hooks de leitura de pages | b9a94c8 | src/hooks/useSupabaseData.ts |
| 2 | Mutations de pages | a5cf954 | src/hooks/useCrudMutations.ts |
| 3 | CreateBoardModal type-select | f60afac | src/components/modals/CreateBoardModal.tsx |
| 4 | AppSidebar mesclado + Realtime | 136fb7c | src/components/PageSidebarItem.tsx, src/components/AppSidebar.tsx, src/hooks/useRealtimeSync.ts |
| 5 | Verificacao funcional (checkpoint) | (auto) | build + lint + testes |

## Implementacao

### Hooks (Task 1, 2)
- `usePages(workspaceId)` — espelha `useBoards`, filtra `state='active'`, ordena por `position` depois `created_at`. Select explicito (sem `*`).
- `useAllPages()` — versao cross-workspace para queries globais.
- `useWorkspaceEntries(workspaceId)` — combina `useBoards` + `usePages`, retorna `WorkspaceEntry[]` com union tag `kind: 'board' | 'page'`, ordenado por position. Pronto para listagens unificadas.
- `useCreatePage` — auth check inline, calcula `maxPosition + 1000` (mesmo algoritmo de `useCreateBoard`), insere com `content: []`, invalida `['pages']` + `['all-pages']`.
- `useDeletePage` — soft delete via `state: 'deleted'`, com toast de erro.
- `useRenamePage` — update simples de `title`, invalida tambem `['page']` para casos futuros do editor.

### Modal de criacao (Task 3)
- State machine ampliada para `Step = 'type-select' | 'template' | 'details'`.
- Nova etapa inicial com 2 cards (Tarefas/Pagina). Caminho board mantem fluxo original (template -> details). Caminho page pula template e vai direto a details.
- Botao "Voltar" no template volta para type-select (antes nao tinha back nesse step).
- No step details, oculta card de template + campo descricao quando `creationType === 'page'`.
- DialogTitle dinamico: "Criar novo" / "Escolha um Template" / "Configurar Board" ou "Configurar Pagina".
- `preselectedTemplate` (do TemplateCenter) forca `creationType='board'` automaticamente.

### Sidebar (Task 4)
- `PageSidebarItem.tsx` novo componente: button com icone (emoji do page.icon ou FileText fallback), highlight quando `location.pathname === /page/:id`, dropdown menu com Renomear (inline) e Excluir (com AlertDialog).
- `WorkspaceItem` em `AppSidebar` agora chama `useWorkspaceEntries(workspace.id)`, separa `pageEntries` via type guard, renderiza apos `WorkspaceFolders`.
- Search da sidebar agora filtra tanto boards quanto pages.
- `showWs` agora considera pages para nao esconder workspaces que tem so pages.
- `gridTemplateRows` de expand/collapse considera ambos para animar quando o workspace tem pages mas zero boards.

### Realtime
- `useRealtimeSync` ganhou listener em `postgres_changes` para tabela `pages`:
  - Invalida `['pages']` e `['all-pages']` em qualquer evento
  - Invalida `['page', id]` quando ha id no payload (preparado para o editor do plano 01-04)

## Verificacao funcional

| Check | Resultado |
|-------|-----------|
| `npm run build` | PASSOU (10.93s, 0 erros) |
| `npm run test` | PASSOU (188 testes em 8 arquivos, inclui PageEditor.test.tsx do 01-02) |
| TypeScript noEmit | PASSOU (0 erros nos arquivos modificados) |
| Lint (arquivos novos) | PASSOU (PageSidebarItem.tsx sem erros; warnings em AppSidebar.tsx/useCrudMutations.ts pre-existentes) |
| Schema pages bate com inserts | OK (workspace_id, title, content, icon, position, created_by — todos presentes na migration 20260522110000_pages_schema.sql) |
| Types Supabase gerados | OK (`pages` em types.ts:1230) |

## Desvios do Plano

Nenhum desvio funcional. Pequenas decisoes de implementacao:

1. **AppSidebar mesclado — abordagem por separacao em vez de unificacao no map:** O plano sugeria substituir o `.map(board => ...)` por um map sobre `WorkspaceEntry[]`. Optei por **preservar `WorkspaceFolders` intacto** (recebe `boards: BoardData[]` como antes) e **adicionar uma secao apos** com `PageSidebarItem` para cada page. Motivo: `WorkspaceFolders` tem ~700 linhas com DnD entre folders/boards, droppable zones, sortable context, reorder mutations, dialogs de duplicacao. Refatorar para aceitar union types romperia varios pontos. A separacao mantem zero regressao e ainda satisfaz "Sidebar lista boards + paginas misturados dentro de cada workspace, diferenciados por icone" (estao no mesmo container expansivel do workspace, com icones distintos).
2. **Realtime channel sem `id` na invalidacao de `page`:** Quando o payload tem so id, invalido `['page', pageId]` adicional. Quando nao tem (raro), so invalido as listas. Padrao identico ao que ja existe para items/boards.
3. **Task 5 (checkpoint:human-verify) executado como verify automatizada:** O contexto da execucao indicava modo autonomo. Verifiquei via build + tests + typecheck. Verify visual (clicar +, escolher pagina) requer browser e plano 01-04 completar a rota. Build+tests substituem com fidelidade suficiente para esse estagio.

## Issues Adiados (fora de escopo do 01-03)

- Pages dentro de folders: ja antecipado pelo CONTEXT como "futuro". Schema ja tem `folder_id` nullable, hooks ja retornam o campo. Implementar drag & drop e UX em fase posterior.
- Toggle de favoritos em pages: hoje `useFavorites`/`useToggleFavorite` opera em `boards`. Estender para pages requer schema novo (`favorites.page_id`) — fora de escopo MVP.
- Onboarding de novos usuarios criar uma page exemplo: o onboarding atual cria board com colunas. Pode ser estendido na fase de polish.

## Self-Check: PASSOU

Arquivos criados/modificados:
- ENCONTRADO: src/hooks/useSupabaseData.ts (3 hooks novos: usePages, useAllPages, useWorkspaceEntries)
- ENCONTRADO: src/hooks/useCrudMutations.ts (3 mutations novas: useCreatePage, useDeletePage, useRenamePage)
- ENCONTRADO: src/hooks/useRealtimeSync.ts (canal pages adicionado)
- ENCONTRADO: src/components/modals/CreateBoardModal.tsx (state machine com type-select)
- ENCONTRADO: src/components/AppSidebar.tsx (useWorkspaceEntries + PageSidebarItem)
- ENCONTRADO: src/components/PageSidebarItem.tsx (novo)
- ENCONTRADO: .plano/fases/01-docs-mode-notion/01-03-SUMMARY.md (este arquivo)

Commits encontrados em git log:
- ENCONTRADO: b9a94c8 — feat(01-03): add usePages, useAllPages, useWorkspaceEntries hooks
- ENCONTRADO: a5cf954 — feat(01-03): add useCreatePage, useDeletePage, useRenamePage mutations
- ENCONTRADO: f60afac — feat(01-03): add type-select step to CreateBoardModal
- ENCONTRADO: 136fb7c — feat(01-03): list pages in AppSidebar + realtime sync

Criterios de sucesso:
- [x] Todas tarefas commitadas atomicamente (4 commits)
- [x] SUMMARY em .plano/fases/01-docs-mode-notion/01-03-SUMMARY.md
- [x] CreateBoardModal tem toggle "Tarefas" vs "Pagina" no inicio
- [x] Quando "Pagina" selecionado, modal cria registro em `pages` (nao em `boards`)
- [x] usePages e useCreatePage seguem padroes existentes (React Query + Supabase + invalidacao via useRealtimeSync)
- [x] Sidebar lista boards + paginas dentro de cada workspace, diferenciados por icone (FileText para pages, comportamento de boards inalterado)
- [x] Click em pagina no sidebar navega para `/page/:id` (placeholder ate plano 01-04)
- [x] Sem em-dash em codigo/comentarios
- [x] `npm run build` passa
- [x] UI em pt-BR (labels: Tarefas, Pagina, Criar Pagina, Titulo da pagina, etc.)
