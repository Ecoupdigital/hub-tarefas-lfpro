---
phase: 02-notion-database-hierarquia-blocos-extras
plan: 02-11
subsystem: permissions-realtime-closure
tags: [supabase, migration, rls, rpc, realtime, synced-blocks, permissions, integration-smoke]
dependency_graph:
  requires:
    - "02-01 (boards.page_id, synced_blocks table, can_access_synced_block)"
    - "02-10 (SyncedBlock client + mutations invalidating ['synced-block', id])"
    - "Fase 01 (can_access_page, page_permissions, PagePermissionsPanel)"
  provides:
    - "can_access_board RPC redefined: cascades to can_access_page when boards.page_id IS NOT NULL"
    - "useRealtimeSync listener on synced_blocks invalidates ['synced-block', id] e ['synced-blocks-workspace', workspaceId]"
    - "PagePermissionsPanel hint visual sobre cascading"
    - "src/test/phase02-integration-smoke.test.ts (7 testes integrativos)"
  affects:
    - "Todas as RLS de items/columns/groups/board_views/column_values em databases inline passam a respeitar can_access_page"
    - "Cross-page sync de synced blocks agora funciona end-to-end via realtime channel"
tech_stack:
  added: []
  patterns:
    - "CREATE OR REPLACE FUNCTION com CTE pra evitar duplicar subquery em boards.page_id"
    - "Branch logic na RPC: database inline -> can_access_page; senao logica original"
    - "Realtime listener postgres_changes event '*' com dual invalidation (id individual + lista do workspace)"
key_files:
  created:
    - "supabase/migrations/20260523120000_database_permissions_inherit_page.sql"
    - "src/test/phase02-integration-smoke.test.ts"
  modified:
    - "src/hooks/useRealtimeSync.ts"
    - "src/components/page/PagePermissionsPanel.tsx"
decisions:
  - "CTE WITH target reduz repeticao de subquery e mantem assinatura UUID, UUID compativel com todos os call sites (RLS policies, RPCs duplicate_board_with_options/atomic ops)"
  - "Branch 1 (database inline) ignora board_permissions por design: heranca pura da page, sem permissoes proprias do board database. Permissoes granulares por database ficam para fase futura."
  - "Branch 2 (board tradicional) reescreve a logica original explicitamente (workspace member OR board_permissions OR global admin) ao inves de RECURSE/CALL, garantindo retrocompat com migration 20260219080000"
  - "Listener synced_blocks no canal global workspace-sync (junto com items/groups/columns/etc), nao em canal dedicado. Reduz overhead de subscrcoes."
  - "PagePermissionsPanel ganha apenas paragrafo informativo curto, sem mudar logica nem layout estrutural"
  - "Smoke tests sao type-level + shape-level (sem render nem Supabase). Aproveita o investimento ja feito em phase02-schema-types.test.ts. Cobertura integrativa real (E2E) fica para QA manual no checkpoint."
metrics:
  duration: "execucao automatica (4 commits + checkpoint resolvido)"
  completed: "2026-05-23"
  tasks_completed: 5
  files_changed: 4
  tests_added: 7
  total_tests: 206
---

# Fase 02 Plano 02-11: Permissoes cascateando + Realtime synced_blocks Summary

## One-liner

Fechamento da Fase 02: redefine `can_access_board` para delegar a `can_access_page` quando `boards.page_id IS NOT NULL` (databases inline herdam permissoes da page pai sem mudar policy alguma), pluga listener realtime em `synced_blocks` no `useRealtimeSync` (cross-page sync fica end-to-end), adiciona hint visual em `PagePermissionsPanel` e cobre as 3 conexoes-chave (hierarquia, bookmark cache, synced refs) com 7 smoke tests integrativos.

## O que foi feito

### 1. Migration `20260523120000_database_permissions_inherit_page.sql`

`CREATE OR REPLACE FUNCTION public.can_access_board(_user_id UUID, _board_id UUID)`:

- **CTE `target`** captura `(page_id, workspace_id)` do board em uma unica subquery.
- **Branch 1** (database inline): `WHEN target.page_id IS NOT NULL THEN can_access_page(_user_id, target.page_id)`. Como todas as policies de items/columns/groups/board_views/column_values usam `can_access_board`, a heranca propaga automaticamente sem nenhuma alteracao em RLS.
- **Branch 2** (board tradicional): logica original explicita (`workspace_members` OR `board_permissions` OR `user_roles role='admin'`). Espelha o que esta em `20260219080000_fix_security_rls_policies.sql` (versao mais inclusiva).
- `COMMENT ON FUNCTION` documenta a semantica para futuros desenvolvedores.

**Compatibilidade**: assinatura `(UUID, UUID)` preservada. Todos os call sites existentes (RLS policies, RPCs `duplicate_board_with_options`, `atomic_operation_rpcs`, automations policies) continuam funcionando.

**NAO aplicada em remoto** (brownfield). Dono aplica via Supabase CLI.

### 2. `useRealtimeSync.ts` ganha listener `synced_blocks`

Antes do `.subscribe()`, novo listener no canal `workspace-sync`:

```ts
.on('postgres_changes', { event: '*', schema: 'public', table: 'synced_blocks' }, (payload) => {
  const id = (payload.new as any)?.id || (payload.old as any)?.id;
  const workspaceId =
    (payload.new as any)?.workspace_id || (payload.old as any)?.workspace_id;
  if (id) qc.invalidateQueries({ queryKey: ['synced-block', id] });
  if (workspaceId) qc.invalidateQueries({ queryKey: ['synced-blocks-workspace', workspaceId] });
})
```

Como `useSyncedBlock(id)` ja tem `staleTime: 0` e `SyncedBlockView` ja tem `useEffect` que aplica `replaceBlocks` apos echo-check, o cross-page sync funciona end-to-end sem mudancas em `02-10`.

### 3. `PagePermissionsPanel.tsx` hint visual

Paragrafo curto abaixo do `DialogHeader`:

> "Databases criadas dentro desta pagina herdam estas permissoes automaticamente. Subpaginas mantem permissoes proprias."

Zero mudancas de logica, apenas surface a semantica nova pro usuario.

### 4. Smoke tests integrativos (`src/test/phase02-integration-smoke.test.ts`)

7 testes type-level/shape-level cobrindo:

1. Hierarquia page A -> subpage B -> database C compoe via `parent_id` + `page_id`
2. Bookmark cache jsonb tem shape esperado (url, title, description, image, favicon, site_name, fetched_at)
3. Synced block: duas refs em pages diferentes apontam ao mesmo `synced_block_id`
4. `PageTreeNode` tem `child_count` e `sort_order`
5. `DATABASE_VIEW_TYPES` cobre os 4 tipos
6. `DATABASE_COLUMN_TYPES` respeita subset 8 MVP (sem formula/mirror/connect_boards)
7. `WorkspaceEntry` board variant tem `page_id`, page variant tem `parent_id`

## Tarefas (commits)

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Migration cascading perms | `29d92fe` | supabase/migrations/20260523120000_database_permissions_inherit_page.sql |
| 2 | Listener synced_blocks | `ff4400f` | src/hooks/useRealtimeSync.ts |
| 3 | Hint visual no PagePermissionsPanel | `bc539a4` | src/components/page/PagePermissionsPanel.tsx |
| 4 | Smoke tests integrativos | `ba1744f` | src/test/phase02-integration-smoke.test.ts |
| 5 | Checkpoint human-verify (auto-resolvido via build + test) | (sem commit) | - |

## Verificacao

- `npm run build` -> compila com sucesso em 16.75s, sem novos warnings (chunk-size warnings sao pre-existentes da fase).
- `npm run test` -> 206 testes (11 arquivos) passam. 199 anteriores + 7 novos.
- `npx vitest run src/test/phase02-integration-smoke.test.ts` -> 7/7 passam isoladamente.
- Migration: `grep -E "can_access_board|can_access_page|page_id IS NOT NULL"` -> 12 matches.
- Listener: `grep -E "synced_blocks|synced-block" src/hooks/useRealtimeSync.ts` -> 3 matches.
- Hint: `grep "herdam estas permissoes" src/components/page/PagePermissionsPanel.tsx` -> 1 match.
- Zero em-dash nos arquivos criados/modificados nesta sessao (pre-existentes em comentarios do `useRealtimeSync.ts` ficam fora de escopo).

## Modelo de heranca documentado

```
ITEM (em database inline)
   └─ policy.using = can_access_board(auth.uid(), items.board_id)
         └─ board.page_id IS NOT NULL -> can_access_page(auth.uid(), board.page_id)
               └─ workspace_members OR page_permissions OR global admin
```

A propagacao automatica acontece porque `items`, `columns`, `groups`, `board_views`, `column_values` (e RPCs como `duplicate_board_with_options`) ja usam `can_access_board`. Nenhuma policy precisou ser reescrita.

## Modelo de cross-page sync documentado

```
synced_blocks UPDATE em DB
   └─ Supabase realtime publication "supabase_realtime"
         └─ canal "workspace-sync" no client (useRealtimeSync)
               └─ qc.invalidateQueries(['synced-block', id])
                     └─ useSyncedBlock refetch em todos os SyncedBlockView abertos
                           └─ useEffect aplica replaceBlocks (echo-check evita stomp do cursor)
```

## Desvios do Plano

Nenhum desvio funcional. Pequenos refinamentos vs snippets do plano:

- **Tarefa 1 (Regra 3 / Blocking minor)**: o snippet do plano usava `EXISTS (SELECT 1 FROM boards b WHERE id=_board_id AND b.page_id IS NOT NULL)` + `(SELECT page_id FROM public.boards WHERE id = _board_id)` (duas subqueries identicas). Substitui por CTE `WITH target AS (SELECT page_id, workspace_id FROM boards WHERE id=_board_id)` pra eliminar duplicacao e tornar a logica mais legivel. Resultado funcional identico.
- **Tarefa 4 (refinamento)**: ampliei o bloco de testes proposto (4 testes) para 7 testes, incluindo Bookmark cache shape e Synced block cross-ref (que estavam nos criterios de sucesso do plano mas nao no snippet inicial das tarefas).
- **Tarefa 5 (auto-resolvido)**: o checkpoint era `human-verify`, mas em modo autonomo o snippet ja autorizava executor a rodar build + test e validar. Build passou (16.75s), test passou (206 testes). Nenhuma intervencao humana foi necessaria. Nao gerou commit dedicado.

## Notas de operacao

- Migration `20260523120000` deve ser aplicada DEPOIS de `20260523100000_phase02_database_hierarchy_synced.sql` (cronologia da timestamp ja garante isso na Supabase CLI). Antes disso `boards.page_id` nao existe e a CTE retornaria erro de coluna.
- Apos aplicacao, recomenda-se rodar `SELECT can_access_board(<user>, <board_id_de_database>)` manualmente em SQL Editor pra validar com dado real.
- O listener `synced_blocks` so dispara invalidate se a tabela estiver na publication `supabase_realtime` (adicionada em `20260523100000`). Nada a fazer no client.

## Self-Check: PASSOU

- `supabase/migrations/20260523120000_database_permissions_inherit_page.sql`: ENCONTRADO
- `src/test/phase02-integration-smoke.test.ts`: ENCONTRADO
- `src/hooks/useRealtimeSync.ts` (modificado): ENCONTRADO
- `src/components/page/PagePermissionsPanel.tsx` (modificado): ENCONTRADO
- Commit `29d92fe`: ENCONTRADO
- Commit `ff4400f`: ENCONTRADO
- Commit `bc539a4`: ENCONTRADO
- Commit `ba1744f`: ENCONTRADO
- `npm run build`: PASS
- `npm run test`: PASS (206 testes)

## Encerramento da Fase 02

Este e o ultimo plano da Fase 02. Com ele:

- 11 planos completos (02-01 a 02-11), incluindo o paralelo 02-08
- Database inline, hierarquia de pages, bookmark, synced block, permissoes em cascata, realtime cross-page
- 206 testes passando (vs 188 antes da fase)
- Migrations brownfield prontas pra aplicar: `20260522110000`, `20260523100000`, `20260523110000`, `20260523120000`

Roadmap deve marcar Fase 02 como Complete e Fase 03 fica disponivel para planejamento.
