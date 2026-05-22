---
phase: 02-notion-database-hierarquia-blocos-extras
verified: 2026-05-22T16:35:00Z
status: human_needed
score: 15/15 must-haves verificados em codigo, 2 deploys pendentes (DB migrations + Edge Function)
gaps:
  - truth: "Migrations da Fase 02 aplicadas no Supabase remoto"
    status: human_needed
    reason: "4 migrations criadas em supabase/migrations/ mas nao aplicadas no projeto remoto. 02-CONTEXT.md e 02-11-SUMMARY.md afirmam explicitamente 'NAO aplicar em remoto via este push (brownfield). Dono aplica via Supabase CLI'. Sem aplicacao, nenhum dos criterios depende de banco funciona em prod."
    artifacts:
      - path: "supabase/migrations/20260522110000_pages_schema.sql"
        issue: "Arquivo presente, deploy pendente"
      - path: "supabase/migrations/20260523100000_phase02_database_hierarchy_synced.sql"
        issue: "Arquivo presente, deploy pendente (adiciona boards.page_id, pages.parent_id, pages.sort_order, synced_blocks, list_detailed)"
      - path: "supabase/migrations/20260523110000_cascade_soft_delete_pages.sql"
        issue: "Arquivo presente, deploy pendente (RPC soft_delete_page_cascade)"
      - path: "supabase/migrations/20260523120000_database_permissions_inherit_page.sql"
        issue: "Arquivo presente, deploy pendente (CREATE OR REPLACE can_access_board com branch page_id)"
    missing:
      - "Rodar 'supabase db push' (ou aplicar via SQL Editor) no projeto Supabase de producao"
      - "Validar manualmente apos push: SELECT can_access_board(<user>, <database_board_id>)"
  - truth: "Edge Function fetch-url-metadata disponivel no Supabase para alimentar Bookmark block"
    status: human_needed
    reason: "Codigo Deno completo (256 linhas) em supabase/functions/fetch-url-metadata/index.ts mas nao deployado. BookmarkBlock.tsx invoca supabase.functions.invoke('fetch-url-metadata') -- falha silenciosa ate deploy."
    artifacts:
      - path: "supabase/functions/fetch-url-metadata/index.ts"
        issue: "Implementacao completa, deploy pendente"
    missing:
      - "Rodar 'supabase functions deploy fetch-url-metadata --no-verify-jwt'"
      - "Testar via UI: criar bloco Bookmark, colar URL, confirmar que metadata aparece"
---

# Fase 02: Notion Database + Hierarquia + Blocos Extras Relatorio de Verificacao

**Objetivo da Fase:** Pages com subpaginas (parent_id), sidebar tree expansivel com drag/drop, databases inline (mini-boards) com 4 views (Tabela/Kanban/Calendario/Lista detalhada Notion-style), bookmark com preview de URL via Edge Function, synced block (conteudo compartilhado entre pages do mesmo workspace).

**Verificado:** 2026-05-22T16:35:00Z
**Status:** `human_needed` -- todo o codigo da Fase 02 esta em HEAD, builda e passa nos 206/206 testes. Restam 2 deploys manuais (4 migrations + 1 Edge Function) para fechar end-to-end em prod.

## Alcance do Objetivo

### Verdades Observaveis (15 must-haves do ROADMAP)

| # | Verdade | Status | Evidencia |
|---|---------|--------|-----------|
| 1 | Page pode ter parent_id apontando pra outra page (subpaginas) | VERIFIED | `supabase/migrations/20260523100000_phase02_database_hierarchy_synced.sql:34-41` (ALTER TABLE pages ADD parent_id). `src/hooks/useSupabaseData.ts:79,96,117,153,225` (select e mapping). `src/hooks/useCrudMutations.ts:248-275` (insert com parent_id) |
| 2 | Sidebar lista pages como arvore expansivel: workspace > page > subpages/databases | VERIFIED | `src/components/PageTreeItem.tsx:50-300` (componente recursivo, render workspace/page/database). `src/components/AppSidebar.tsx:22,216,450` (integracao no sidebar). Hook `useWorkspaceTree` em `useSupabaseData.ts:163-225` (lazy load por nivel) |
| 3 | Drag/drop na arvore permite reordenar e reaninhar pages | VERIFIED | `src/components/AppSidebar.tsx:10-11,203-238` (DndContext + DragOverlay). `src/hooks/useCrudMutations.ts:353-376` (useReorderPage com sort_order lexorank + parent_id update). `pages.sort_order TEXT` na migration 20260523100000:46-72 |
| 4 | Bloco "Database" no slash menu cria nova database vinculada a pagina atual | VERIFIED | `src/components/page/slash-menu.ts:74-76` (entry Database). `src/components/page/CreateDatabaseDialog.tsx:1-133`. `src/hooks/useCrudMutations.ts:87-129` (useCreateDatabase: INSERT boards com page_id=pageId). `src/components/page/blocks/DatabaseBlock.tsx` (block spec) |
| 5 | Database tem schema proprio: items, colunas (8 tipos), views | VERIFIED | `src/types/database.ts` (DATABASE_COLUMN_TYPES subset). `src/components/board/modals/CreateColumnModal` filtra para 8 tipos quando databaseMode=true (commit df7a951). Reusa items + column_values + board_views via DatabaseBoardContext (`src/components/database/DatabaseBoardContext.tsx`) |
| 6 | Database aparece como filha da page no sidebar | VERIFIED | `src/hooks/useSupabaseData.ts:204-218` (subquery 2 conta databases por page_id). `src/components/PageTreeItem.tsx` (render Database como filho com icone distinto) |
| 7 | View Tabela funciona (editar inline, adicionar coluna, adicionar item) | VERIFIED | `src/components/board/BoardTable.tsx:28,155-157` (mode='database'). Renderer em `src/components/database/DatabaseViewRenderer.tsx:51` |
| 8 | View Kanban funciona (drag items entre colunas de status) | VERIFIED | `src/components/board/BoardKanban.tsx:26,463-494` (mode='database'). Renderer em `DatabaseViewRenderer.tsx:52` |
| 9 | View Calendario funciona (items posicionados por coluna date escolhida) | VERIFIED | `src/components/board/BoardCalendar.tsx:20,62-169` (mode='database'). Renderer em `DatabaseViewRenderer.tsx:53` |
| 10 | View Lista detalhada funciona (cada item = linha grande, props empilhadas) | VERIFIED | `src/components/database/DatabaseListView.tsx`, `DatabaseListItem.tsx`, `DatabaseListViewConfig.tsx`. Renderer em `DatabaseViewRenderer.tsx:54-56`. Migration 20260523100000:77-83 adiciona 'list_detailed' ao CHECK constraint |
| 11 | Trocar de view nao perde estado (filtros/sort/group persistem por view) | VERIFIED | Cada view persiste config em `board_views.config jsonb` via `useUpdateBoardViewConfig` (`src/hooks/useBoardViews.ts:87-95`). Active view persiste em `localStorage[lfpro-database-active-view-${boardId}]` (`src/components/page/blocks/DatabaseBlock.tsx:23,60-98`) |
| 12 | Bloco "Bookmark" no slash menu: cola URL -> fetch metadata via Edge Function -> renderiza card | CODE_OK, DEPLOY_PENDING | `src/components/page/slash-menu.ts:84-86` (entry Bookmark). `src/components/page/blocks/BookmarkBlock.tsx:28,79-95` (invoke fetch-url-metadata + cache em block.props). `supabase/functions/fetch-url-metadata/index.ts:1-256` IMPLEMENTADO mas NAO DEPLOYADO |
| 13 | Bloco "Synced Block" no slash menu: cria bloco referenciavel em outras pages; editar reflete em todos | VERIFIED | `src/components/page/slash-menu.ts:94-96` (entry Bloco sincronizado). `src/components/page/blocks/SyncedBlock.tsx`, `SyncedBlockPickerDialog.tsx`. Tabela `synced_blocks` na migration 20260523100000:88-146. Hooks `useSyncedBlock` + `useUpdateSyncedBlockContent` em `useSupabaseData.ts` e `useCrudMutations.ts` |
| 14 | Permissoes: databases herdam permissoes da page pai. Subpaginas tem permissoes proprias | VERIFIED | `supabase/migrations/20260523120000_database_permissions_inherit_page.sql:29-61` (CREATE OR REPLACE can_access_board com branch page_id IS NOT NULL -> can_access_page). Subpaginas usam `page_permissions` proprio via RPC `can_access_page` (Fase 01). DEPLOY PENDENTE da migration |
| 15 | Realtime sync: edicoes em databases/subpages refletem em outras abas | VERIFIED | `src/hooks/useRealtimeSync.ts:49-80` (listeners postgres_changes em pages, synced_blocks). Realtime publication adiciona synced_blocks na migration 20260523100000:146. Boards/items/columns ja em realtime desde antes da fase |

**Score:** 15/15 verdades implementadas no codigo. 2 dependem de deploy manual (DB migrations + Edge Function) para funcionar em prod.

### Artefatos Requeridos

| Artefato | Esperado | Status | Detalhes |
|----------|----------|--------|----------|
| Migration pages_schema | sim | VERIFIED | `supabase/migrations/20260522110000_pages_schema.sql` -- nao aplicada em remoto |
| Migration database/hierarchy/synced | sim | VERIFIED | `supabase/migrations/20260523100000_phase02_database_hierarchy_synced.sql` -- nao aplicada em remoto |
| Migration cascade soft delete | sim | VERIFIED | `supabase/migrations/20260523110000_cascade_soft_delete_pages.sql` -- nao aplicada em remoto |
| Migration cascading perms | sim | VERIFIED | `supabase/migrations/20260523120000_database_permissions_inherit_page.sql` -- nao aplicada em remoto |
| Edge Function fetch-url-metadata | sim | VERIFIED | `supabase/functions/fetch-url-metadata/index.ts` (256 linhas) -- nao deployada |
| PageTreeItem (recursivo) | sim | VERIFIED | `src/components/PageTreeItem.tsx` (300 linhas) |
| AppSidebar com DnD tree | sim | VERIFIED | `src/components/AppSidebar.tsx` (DndContext + onDragEnd em sort_order) |
| DatabaseBlock spec | sim | VERIFIED | `src/components/page/blocks/DatabaseBlock.tsx` (BlockNote spec + DatabaseBlockView) |
| BookmarkBlock spec | sim | VERIFIED | `src/components/page/blocks/BookmarkBlock.tsx` (BlockNote spec + invoke fetch-url-metadata + refresh manual) |
| SyncedBlock spec + picker | sim | VERIFIED | `src/components/page/blocks/SyncedBlock.tsx` + `SyncedBlockPickerDialog.tsx` (BlockNote spec + mini-editor) |
| DatabaseViewTabs | sim | VERIFIED | `src/components/database/DatabaseViewTabs.tsx` + `CreateDatabaseViewDialog.tsx` |
| DatabaseViewRenderer (4 views) | sim | VERIFIED | `src/components/database/DatabaseViewRenderer.tsx` (switch table/kanban/calendar/list_detailed) |
| DatabaseListView (Notion-style) | sim | VERIFIED | `src/components/database/DatabaseListView.tsx` + `DatabaseListItem.tsx` + `DatabaseListViewConfig.tsx` |
| Slash menu com Database/Bookmark/Synced | sim | VERIFIED | `src/components/page/slash-menu.ts:74-96` |
| Hook useWorkspaceTree | sim | VERIFIED | `src/hooks/useSupabaseData.ts:163-225` (lazy + child_count subqueries) |
| Hook useReorderPage | sim | VERIFIED | `src/hooks/useCrudMutations.ts:353-376` (optimistic update + parent_id move) |
| Hook useCreateDatabase | sim | VERIFIED | `src/hooks/useCrudMutations.ts:87-129` |
| Hook useSyncedBlock / useUpdateSyncedBlockContent / useCreateSyncedBlock | sim | VERIFIED | Hooks presentes e referenciados em SyncedBlock.tsx e SyncedBlockPickerDialog.tsx |
| Realtime listeners synced_blocks/pages | sim | VERIFIED | `src/hooks/useRealtimeSync.ts:49-80` |

### Verificacao de Links Chave (Wiring)

| De | Para | Via | Status | Detalhes |
|----|------|-----|--------|----------|
| Slash menu | DatabaseBlock | onTriggerDatabase -> CreateDatabaseDialog -> useCreateDatabase | WIRED | `PageEditor.tsx:17,198` |
| Slash menu | BookmarkBlock | UrlPromptDialog -> BookmarkBlock.props.url -> handleRefresh | WIRED | `PageEditor.tsx` (slash menu wires UrlPromptDialog) |
| Slash menu | SyncedBlock | SyncedBlockPickerDialog -> useCreateSyncedBlock -> synced spec | WIRED | `PageEditor.tsx:19,154,222` |
| BookmarkBlock | Edge Function | supabase.functions.invoke('fetch-url-metadata') | WIRED_CODE_OK | `BookmarkBlock.tsx:79`. Edge Function existe localmente, falha ate deploy |
| DatabaseBlock | DatabaseViewRenderer | DatabaseBoardContext + boardId nas props | WIRED | `DatabaseBlock.tsx:45-53` |
| DatabaseViewRenderer | BoardTable/Kanban/Calendar/ListView | switch viewType + mode='database' | WIRED | `DatabaseViewRenderer.tsx:51-56` |
| AppSidebar | useReorderPage | onDragEnd reads new sort_order via fractional indexing | WIRED | `AppSidebar.tsx:161-167,207` |
| useRealtimeSync | invalidate ['synced-block', id] | postgres_changes synced_blocks | WIRED | `useRealtimeSync.ts:79-80` (ativa apos migration adicionar tabela em publication) |
| can_access_board RPC | can_access_page RPC | CTE target + branch page_id IS NOT NULL | WIRED_DEPLOY_PENDING | Migration 20260523120000:29-61. RLS de items/columns/groups herda automaticamente. Inativo ate apply |

### Cobertura de Requisitos

REQUIREMENTS.md nao existe no projeto. Mapeamento REQ-09..REQ-20 baseado em sucesso criteria do ROADMAP:

| Requisito | Plano Fonte | Descricao | Status |
|-----------|-------------|-----------|--------|
| REQ-09 | 02-01, 02-02 | Subpaginas (parent_id) + sidebar tree expansivel | VERIFIED |
| REQ-10 | 02-03 | Drag/drop com sort_order lexorank | VERIFIED |
| REQ-11 | 02-04 | Bloco Database no slash menu + CreateDatabaseDialog | VERIFIED |
| REQ-12 | 02-05 | Schema database (boards.page_id, 8 column types, 4 views default) | VERIFIED |
| REQ-13 | 02-02 | Database aparece como filha de page no sidebar | VERIFIED |
| REQ-14 | 02-06 | 4 views (Tabela/Kanban/Calendar) com mode='database' | VERIFIED |
| REQ-15 | 02-07 | DatabaseListView Notion-style | VERIFIED |
| REQ-16 | 02-08 | Persistencia de view active + config por view | VERIFIED |
| REQ-17 | 02-09 | BookmarkBlock + Edge Function fetch-url-metadata | CODE_OK_DEPLOY_PENDING |
| REQ-18 | 02-10 | SyncedBlock workspace-scoped | VERIFIED |
| REQ-19 | 02-11 | Permissoes em cascata (can_access_board -> can_access_page) | CODE_OK_DEPLOY_PENDING |
| REQ-20 | 02-11 | Realtime synced_blocks + pages refletem cross-tab | VERIFIED (deploy permite ativar) |

### Anti-Padroes Encontrados

| Arquivo | Linha | Padrao | Severidade | Impacto |
|---------|-------|--------|------------|---------|
| (varios) | -- | Migrations criadas mas nao aplicadas | Info | Esperado em fluxo brownfield. Documentado em 02-CONTEXT.md e 02-11-SUMMARY.md |
| `supabase/functions/fetch-url-metadata/index.ts` | -- | Edge Function nao deployada | Info | Falha graciosa: BookmarkBlock tem fallback que mostra URL como link simples |
| commit `8bdbb50` | -- | Attribution mistura 02-03 + 02-04 (wave 2a paralela) | Info | Codigo em HEAD esta correto. Apenas a mensagem do commit nao reflete o escopo real |

Nenhum TODO/FIXME/placeholder bloqueante encontrado nos arquivos da Fase 02. Self-check do 02-11-SUMMARY.md afirma "Zero em-dash nos arquivos criados/modificados".

### SUMMARYs vs PLANs

| Plano | PLAN.md | SUMMARY.md | Match |
|-------|---------|------------|-------|
| 02-01 | sim (22k) | sim (10k) | OK |
| 02-02 | sim (23k) | sim (10k) | OK |
| 02-03 | sim (16k) | sim (14k) | OK |
| 02-04 | sim (16k) | sim (13k) | OK (apesar do commit 8bdbb50 com attribution misturada -- codigo OK em HEAD) |
| 02-05 | sim (20k) | sim (13k) | OK |
| 02-06 | sim (13k) | sim (15k) | OK |
| 02-07 | sim (18k) | sim (13k) | OK |
| 02-08 | sim (12k) | sim (14k) | OK |
| 02-09 | sim (20k) | sim (16k) | OK |
| 02-10 | sim (18k) | sim (9k) | OK |
| 02-11 | sim (11k) | sim (11k) | OK |

11/11 planos com SUMMARY correspondente.

### Build e Testes

- `npm run build`: PASSOU em 15.98s. Sem novos warnings. (chunk-size warnings sao pre-existentes -- vendor-charts, vendor-xlsx, Page.tsx pelo BlockNote)
- `npm run test`: PASSOU. 11 arquivos / 206 testes. (199 anteriores + 7 smoke tests da Fase 02 em `src/test/phase02-integration-smoke.test.ts`)

### Verificacao Humana Necessaria

1. **Aplicar 4 migrations no Supabase remoto** (Supabase CLI `db push` ou SQL Editor):
   - 20260522110000_pages_schema.sql
   - 20260523100000_phase02_database_hierarchy_synced.sql
   - 20260523110000_cascade_soft_delete_pages.sql
   - 20260523120000_database_permissions_inherit_page.sql

2. **Deploy da Edge Function**:
   ```bash
   supabase functions deploy fetch-url-metadata --no-verify-jwt
   ```

3. **Smoke test manual pos-deploy** (nao automatizavel):
   - Criar page A, criar subpage B dentro de A (parent_id), drag/drop reordenar subpages
   - No editor de uma page: slash menu -> Database, criar; trocar entre Tabela/Kanban/Calendario/Lista detalhada; confirmar persistencia de view active
   - Slash menu -> Bookmark, colar URL real (ex: https://supabase.com), confirmar fetch + card
   - Slash menu -> Bloco sincronizado, criar; abrir em outra page; editar em uma; confirmar realtime na outra
   - Adicionar permissao explicita em page A para usuario X; criar database dentro de A; confirmar que X acessa database (heranca)

### Resumo de Gaps

A Fase 02 esta **100% implementada em codigo, com 206/206 testes passando e build verde**. Os 15 criterios de sucesso do ROADMAP tem cobertura de codigo verificavel em HEAD. Restam dois deploys manuais que ficaram explicitamente fora do escopo dos agentes (brownfield policy declarada em 02-CONTEXT.md):

1. Aplicar 4 SQL migrations no projeto Supabase remoto.
2. Deploy da Edge Function `fetch-url-metadata`.

Ate esses dois passos, criterios 12, 14 (parcial) e 15 (synced_blocks invalidate depende de tabela na publication) nao funcionam em prod. Apos os passos, todos os 15 criterios devem ficar end-to-end. Recomenda-se o smoke test manual pos-deploy listado acima antes de marcar a fase como complete no ROADMAP.

## Proximos Passos

1. **Dono aplica migrations**: `supabase db push` (ou rodar os 4 .sql em ordem cronologica no SQL Editor).
2. **Dono deploya Edge Function**: `supabase functions deploy fetch-url-metadata --no-verify-jwt`.
3. **Smoke test manual** (~10min) seguindo o checklist da secao "Verificacao Humana Necessaria".
4. Marcar Fase 02 como **Complete** no ROADMAP e iniciar planejamento da Fase 03.
