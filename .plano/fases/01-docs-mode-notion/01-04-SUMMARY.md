---
phase: 01-docs-mode-notion
plan: 01-04
subsystem: page-crud
tags: [page, route, auto-save, debounce, trash, blocknote, react-query]
requires:
  - 01-01 (schema pages + tipos)
  - 01-02 (PageEditor BlockNote + tema)
  - 01-03 (hooks usePages/useCreatePage + sidebar)
provides:
  - "Rota /page/:pageId (lazy + protegida)"
  - "src/pages/Page.tsx (raiz da rota)"
  - "PageHeader (titulo editavel + indicador de save + menu)"
  - "usePageAutoSave (debounce 1.5s para content jsonb)"
  - "usePage (query single record)"
  - "useUpdatePageContent (mutation otimizada sem invalidar sidebar)"
  - "useRestorePage (state deleted -> active)"
  - "useDeletedPages + usePermanentDeletePage"
  - "Aba Paginas no TrashDrawer"
affects:
  - src/App.tsx
  - src/hooks/useSupabaseData.ts
  - src/hooks/useCrudMutations.ts
  - src/hooks/useTrash.ts
  - src/components/workspace/TrashDrawer.tsx
tech-stack:
  added: []
  patterns:
    - "setTimeout + clearTimeout dentro de useRef para debounce no React"
    - "Mutation que NAO invalida lista pai (evita refetch a cada save)"
    - "Cast Json -> PartialBlock[] na entrada do BlockNote"
key-files:
  created:
    - src/pages/Page.tsx
    - src/components/page/PageHeader.tsx
    - src/components/page/usePageAutoSave.ts
    - .plano/fases/01-docs-mode-notion/01-04-SUMMARY.md
  modified:
    - src/App.tsx
    - src/hooks/useSupabaseData.ts
    - src/hooks/useCrudMutations.ts
    - src/hooks/useTrash.ts
    - src/components/workspace/TrashDrawer.tsx
decisions:
  - "usePageAutoSave debounce 1.5s, titulo debounce 500ms (titulo e mais critico para feedback de digitacao)"
  - "useUpdatePageContent NAO invalida ['pages'] (lista do sidebar) — apenas ['page', id]. Evita re-render da sidebar a cada tecla."
  - "Flush no unmount via useEffect cleanup: garante que edicoes nao se percam se o usuario navegar antes do debounce expirar"
  - "Page.tsx renderiza standalone (sem AppSidebar/TopNavBar) para focar no editor; navegacao volta via deletePage success ou link manual /"
  - "PageHeader usa confirm() nativo para excluir; substituicao por AlertDialog do shadcn fica para polish futuro (TrashDrawer ja usa AlertDialog para permanent delete)"
  - "Cast (page.content as PartialBlock[] | null) ?? undefined — content vem como Json do Supabase types"
metrics:
  duration: "~15min"
  completed_at: "2026-05-22T11:51Z"
  tasks_completed: 9
  files_created: 3
  files_modified: 5
  commits: 8
  tests_passed: "188/188"
---

# Fase 01 Plano 01-04: CRUD de pagina com auto-save debounced — Summary

Conecta toda a infra criada nos planos anteriores (schema 01-01, editor BlockNote 01-02, hooks + sidebar 01-03) em uma experiencia funcional ponta-a-ponta. Apos este plano, um usuario LFPro consegue criar uma pagina via "+ Pagina" no modal, ser levado para `/page/:id`, digitar conteudo rich-text com slash commands, ver o indicador "Salvando..." virar "Salvo" sem clicar em nada, recarregar a aba e encontrar o conteudo intacto, excluir para a lixeira, restaurar do TrashDrawer e voltar a editar.

## Tarefas executadas

| # | Nome | Commit | Arquivos chave |
|---|------|--------|----------------|
| 1 | usePage hook | `1d04592` | src/hooks/useSupabaseData.ts |
| 2 | useUpdatePageContent + useRestorePage | `8d070aa` | src/hooks/useCrudMutations.ts |
| 3 | usePageAutoSave (debounce 1.5s) | `e91353f` | src/components/page/usePageAutoSave.ts |
| 4 | PageHeader (titulo + status + menu) | `9279f76` | src/components/page/PageHeader.tsx |
| 5 | Page.tsx (rota raiz) | `5652ea9` | src/pages/Page.tsx |
| 6 | Rota /page/:pageId em App.tsx | `8e29858` | src/App.tsx |
| 7 | useDeletedPages + usePermanentDeletePage | `f175b1c` | src/hooks/useTrash.ts |
| 8 | Aba Paginas no TrashDrawer | `4bd1f3c` | src/components/workspace/TrashDrawer.tsx |
| 9 | Verificacao funcional (build + tests) | (auto) | - |

## Implementacao por camada

### Query layer (Task 1)
`usePage(pageId)` espelha o padrao de `useBoard`-style: single record, `enabled: !!pageId`, `staleTime: 30s` (mais baixo que listas porque a propria page muda muito durante a edicao). Select explicito de todos os campos relevantes ao editor (`content`, `state`, `icon`, `cover_url`, etc.).

### Mutation layer (Task 2 + 7)
- `useUpdatePageContent({ pageId, content })` recebe blocks como `unknown[]` (matching o `Block[]` do BlockNote sem importar tipos do pacote em arquivo de hook). **Crucial: invalida apenas `['page', pageId]`, NAO `['pages']`** — assim a sidebar nao re-renderiza a cada keystroke.
- `useRestorePage(id)` flip de `state: 'deleted' -> 'active'`. Invalida `pages`, `all-pages` e `trash-pages`.
- `useDeletedPages()` lista da lixeira (state='deleted'), select minimal (id, workspace_id, title, icon, updated_at).
- `usePermanentDeletePage(id)` hard delete (cascata via FK no schema).

### Auto-save hook (Task 3)
`usePageAutoSave({ pageId, debounceMs = 1500 })` mantem:
- `pendingRef` com o ultimo `Block[]` aguardando flush
- `timerRef` com o setTimeout ativo
- `status` (`idle | pending | saving | saved | error`) que o PageHeader le

Fluxo:
1. Editor chama `schedule(blocks)` -> status vira `pending`, timer reseta
2. Apos 1.5s sem mudancas -> `flush()` -> status `saving` -> mutation -> status `saved`
3. 2s depois status volta para `idle` (badge "Salvo" some)
4. Em erro -> status `error` permanente ate proxima mudanca
5. No unmount, se ha pendente, flush imediato (evita perder edicao se navegar antes do debounce)

### UI layer (Task 4, 5)
- `PageHeader`: input controlado para titulo, com debounce proprio de 500ms (rename via `useRenamePage`). Guarda `lastPersistedRef` para evitar mutations redundantes quando blur dispara depois do debounce. Dropdown com Historico/Permissoes (disabled, plano 01-06/01-07) e Excluir (confirm + navigate("/")).
- `Page.tsx`: tela cheia (sem sidebar), 4 estados: loading, nao encontrada, arquivada, ativa. Cast `Json -> PartialBlock[]` na entrada.

### Routing (Task 6)
Rota `/page/:pageId` adicionada dentro de `ProtectedApp`, lazy via `React.lazy`. Herda o `ProtectedRoute` que ja embrulha todo o ProtectedApp em `App.tsx`. Suspense raiz cuida do fallback.

### Trash UI (Task 8)
Aba "Paginas" adicionada ao `TrashDrawer` entre Boards e Arquivados. Reusa o pattern dos demais tabs: icone (FileText), contador no badge, search filtrando titulo, hover-actions de Restaurar + Excluir permanentemente. AlertDialog dedicado para confirmacao do permanent delete.

## Verificacao funcional

| Check | Resultado |
|-------|-----------|
| `npm run build` | PASSOU (15.47s, 0 erros, gera dist/assets/Page-*.js como chunk separado) |
| `npm run test` | PASSOU (188/188 em 8 arquivos) |
| `npx tsc --noEmit -p tsconfig.app.json` | PASSOU (0 erros nos arquivos novos/modificados) |
| `curl http://localhost:8080/` | HTTP 200 |
| `curl http://localhost:8080/page/test` | HTTP 200 (SPA fallback) |
| Sem em-dash em arquivos do plano | OK (grep retornou vazio) |
| UI em pt-BR | OK (toda string visivel — "Salvando...", "Salvo", "Mover esta pagina para a lixeira?", "Paginas", "Pagina arquivada", etc.) |
| Rota dentro de ProtectedRoute | OK (ProtectedApp inteiro esta dentro do ProtectedRoute) |
| Auto-save invalida apenas page query | OK (codigo nao invalida ['pages'] em useUpdatePageContent) |

## Verificacao automatizada (criterios do plano)

- `grep -E "usePage\b" src/hooks/useSupabaseData.ts` -> match em linha 109 ("usePage = (pageId?:")
- `grep -E "useUpdatePageContent|useRestorePage" src/hooks/useCrudMutations.ts | wc -l` -> 2
- `grep -E "PagePage|/page/:pageId" src/App.tsx | wc -l` -> 2
- `grep -E "useDeletedPages|trash-pages" src/hooks/useTrash.ts | wc -l` -> 2
- `grep -E "useDeletedPages|restorePage" src/components/workspace/TrashDrawer.tsx | wc -l` -> 11

## Desvios do Plano

Nenhum desvio funcional. Pequenas adicoes alem do plano:

1. **`usePermanentDeletePage` adicionado em useTrash.ts** (Task 7). O plano so pedia `useDeletedPages`, mas como o TrashDrawer permite excluir permanentemente boards e items, faz sentido manter paridade para pages. Sem isso a aba Paginas seria assimetrica (so restore, sem hard delete).
2. **AlertDialog para confirmar permanent delete de page** (Task 8). Coerente com o pattern existente de boards/items. O plano nao mencionava confirm, mas omitir seria UX inconsistente.
3. **`lastPersistedRef` em PageHeader** (Task 4). O plano nao especificava, mas sem isso o `onBlur` dispararia rename redundante apos o debounce ja ter salvo (toast duplicado). Optimization simples que evita confusao para o usuario.
4. **Guard `if (!pageId) return` em `flush` do usePageAutoSave**. O hook recebe `pageId: string` mas em Page.tsx passamos `pageId ?? ''`. O guard evita chamar mutation com id vazio caso o hook seja montado durante uma transicao de rota.

Nenhuma mudanca de arquitetura, nenhum bug pre-existente corrigido. Plano executou linear.

## Issues Adiados (fora de escopo)

- **AlertDialog do shadcn substituindo `confirm()` em PageHeader.handleDelete**: o `confirm` nativo funciona mas e visualmente inconsistente com TrashDrawer. Fica para um plano de polish UI.
- **Indicador de "X esta editando" via usePresence**: o CONTEXT.md menciona usePresence como reuse esperado, mas isso pertence a um plano futuro de presence/collab (fora do MVP single-user atual).
- **Snapshot em `page_versions`**: o schema do 01-01 ja criou a tabela, mas a logica de salvar snapshot a cada N saves fica para o plano 01-06 (Historico de versoes).
- **Auto-criar primeira pagina no onboarding**: o onboarding atual cria board. Estender para criar uma page exemplo fica para polish.
- **Embeds e mentions**: ja previstos no plano 01-05.

## Self-Check: PASSOU

Arquivos criados:
- ENCONTRADO: src/pages/Page.tsx
- ENCONTRADO: src/components/page/PageHeader.tsx
- ENCONTRADO: src/components/page/usePageAutoSave.ts
- ENCONTRADO: .plano/fases/01-docs-mode-notion/01-04-SUMMARY.md

Arquivos modificados:
- ENCONTRADO: src/App.tsx (PagePage import + rota)
- ENCONTRADO: src/hooks/useSupabaseData.ts (usePage)
- ENCONTRADO: src/hooks/useCrudMutations.ts (useUpdatePageContent + useRestorePage)
- ENCONTRADO: src/hooks/useTrash.ts (useDeletedPages + usePermanentDeletePage)
- ENCONTRADO: src/components/workspace/TrashDrawer.tsx (aba Paginas)

Commits encontrados:
- ENCONTRADO: 1d04592 (usePage hook)
- ENCONTRADO: 8d070aa (mutations)
- ENCONTRADO: e91353f (usePageAutoSave)
- ENCONTRADO: 9279f76 (PageHeader)
- ENCONTRADO: 5652ea9 (Page.tsx)
- ENCONTRADO: 8e29858 (App.tsx rota)
- ENCONTRADO: f175b1c (useTrash hooks)
- ENCONTRADO: 4bd1f3c (TrashDrawer aba)

Criterios de sucesso do prompt:
- [x] Rota `/page/:pageId` registrada em src/App.tsx, protegida (ProtectedRoute)
- [x] src/pages/Page.tsx busca pagina pelo id, mostra PageEditor com content carregado
- [x] usePageAutoSave persiste content jsonb com debounce ~1.5s na tabela `pages`
- [x] PageHeader: titulo editavel inline, indicador de save, botao opcoes (com Historico/Permissoes/Excluir)
- [x] Soft delete (state='deleted') via menu de opcoes
- [x] Restore de pagina via TrashDrawer estendido (aba Paginas)
- [x] Loading state e error state tratados (loading screen + "nao encontrada" + "arquivada")
- [x] Sem em-dash em codigo/comentarios
- [x] `npm run build` passa
- [x] `npm run test` passa (188/188)
- [x] UI em pt-BR

## Proximo plano

01-05 — Custom blocks: mention (@item) e embed de board read-only no PageEditor. Tudo o que esse plano consome (rota + editor + auto-save) ja esta em pe.
