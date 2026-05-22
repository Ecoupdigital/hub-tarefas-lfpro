---
phase: 02-notion-database-hierarquia-blocos-extras
plan: 02-01
subsystem: schema-foundation
tags: [supabase, migration, types, database-inline, hierarchy, synced-blocks]
requires:
  - "Fase 01: tabela pages, RLS, can_access_page, is_workspace_member, update_updated_at"
provides:
  - "boards.page_id: discriminador board tradicional vs database inline"
  - "pages.parent_id + pages.sort_order: hierarquia + ordenacao lexorank"
  - "synced_blocks table + RLS + can_access_synced_block RPC + realtime publication"
  - "board_views.view_type aceita list_detailed"
  - "Tipos TS estendidos: Page (parent_id, sort_order), Board (page_id), SyncedBlock, PageTreeNode, DatabaseColumnType, DatabaseViewType, isDatabase"
  - "Database type estendido em src/integrations/supabase/types.ts com nova table, nova RPC e novos campos"
affects:
  - "src/hooks/useSupabaseData.ts: selects de boards/pages incluem novos campos"
  - "src/test/page-types.test.ts: WorkspaceEntry com novos campos obrigatorios"
tech-stack:
  added: []
  patterns:
    - "Lexorank base-62 (fractional-indexing) pra ordenacao manual"
    - "FK auto-referente com ON DELETE SET NULL (parent_id) pra evitar cascade destrutivo"
    - "Index parcial WHERE col IS NOT NULL pra otimizar queries dominantes (boards sem page_id)"
    - "Extensao manual de Database type espelhando padrao Fase 01"
key-files:
  created:
    - "supabase/migrations/20260523100000_phase02_database_hierarchy_synced.sql"
    - "src/types/database.ts"
    - "src/test/phase02-schema-types.test.ts"
  modified:
    - "src/types/page.ts"
    - "src/types/board.ts"
    - "src/integrations/supabase/types.ts"
    - "src/hooks/useSupabaseData.ts"
    - "src/test/page-types.test.ts"
decisions:
  - "boards.page_id ON DELETE CASCADE: database inline some quando page e deletada (database e dependente da page)"
  - "pages.parent_id ON DELETE SET NULL: subpages viram root quando parent e deletada (conservador, evita perda silenciosa)"
  - "sort_order TEXT NOT NULL DEFAULT 'a0' com backfill por position+created_at (chaves 'a000000','a000001'...)"
  - "Subset 8 tipos de coluna no MVP de database (text, status, date, people, number, checkbox, dropdown, long_text)"
  - "list_detailed adicionado ao CHECK constraint via DROP+ADD (postgres nao tem ALTER CONSTRAINT)"
  - "synced_blocks workspace-scoped (sem permissoes granulares no MVP)"
  - "Extensao manual de Database type (padrao Fase 01) ao inves de regenerar via CLI"
metrics:
  duration_minutes: 12
  tasks_completed: 5
  files_created: 3
  files_modified: 5
  tests_added: 5
  total_tests: 193
  completed_date: 2026-05-23
---

# Fase 02 Plano 02-01: Schema fundacional - Database inline + Hierarquia + Synced blocks Summary

## One-liner

Estende schema da Fase 01 para suportar database inline (boards.page_id), hierarquia de pages (parent_id + sort_order lexorank), synced blocks (tabela workspace-scoped com RLS via is_workspace_member) e view 'list_detailed' (Notion-style) em uma migration atomica, com extensao manual paralela do tipo Database TypeScript.

## O que foi feito

### Migration `20260523100000_phase02_database_hierarchy_synced.sql`

1. **boards.page_id UUID nullable** com FK pra pages(id) ON DELETE CASCADE. Index parcial `idx_boards_page_id WHERE page_id IS NOT NULL` mantem queries normais de board (page_id IS NULL) sem penalidade. Comentario na coluna documenta semantica (NULL = board tradicional, NOT NULL = database inline).

2. **pages.parent_id UUID nullable** com FK auto-referente ON DELETE SET NULL. Index `idx_pages_parent_id` para queries de filhos. Quando parent e deletada, subpages viram root (conservador, evita perda silenciosa).

3. **pages.sort_order TEXT NOT NULL DEFAULT 'a0'** (lexorank base-62 fractional-indexing). Index composto `idx_pages_sort_order (workspace_id, parent_id, sort_order)` pra arvore ordenada. Backfill via CTE com `row_number() OVER (PARTITION BY workspace_id, parent_id ORDER BY position, created_at)` gera chaves crescentes 'a000000', 'a000001', etc. Campo `position` mantido (retrocompat ate Plano 02-03).

4. **board_views.view_type CHECK expandido**: DROP CONSTRAINT + ADD CONSTRAINT incluindo 'list_detailed' alem dos 5 originais (table, kanban, calendar, timeline, dashboard).

5. **synced_blocks table**: id UUID PK, workspace_id (FK workspaces ON DELETE CASCADE), content JSONB DEFAULT '[]', created_by, timestamps. Trigger `synced_blocks_set_updated_at` reusa `public.update_updated_at()`. RLS via 4 policies usando `is_workspace_member(auth.uid(), workspace_id)`. RPC `can_access_synced_block(_user_id, _synced_block_id)` espelha can_access_board (SECURITY DEFINER, STABLE). Adicionada a `supabase_realtime` publication.

### Tipos TypeScript

- **`src/types/database.ts` (novo)**: DatabaseColumnType (union de 8), DATABASE_COLUMN_TYPES (array readonly), DatabaseViewType (4 tipos), DATABASE_VIEW_TYPES, DATABASE_VIEW_LABELS pt-BR ('Tabela', 'Kanban', 'Calendario', 'Lista detalhada'), isDatabase type guard, DatabaseBoard interface.
- **`src/types/page.ts`**: Page ganha parent_id (string | null) e sort_order (string). Novos tipos: SyncedBlock, PageTreeNode (com child_count pra renderizar chevron). WorkspaceEntry estendido: board variant carrega page_id, page variant carrega parent_id e sort_order.
- **`src/types/board.ts`**: Board ganha page_id opcional (`string | null`).
- **`src/integrations/supabase/types.ts`**: Database type estendido com page_id em boards (+ Relationship pra pages), parent_id e sort_order em pages (+ Relationship auto pra pages), tabela synced_blocks completa (Row/Insert/Update/Relationships), RPC can_access_synced_block em Functions.

### Atualizacoes downstream (Regra 3 - blocking)

- **`src/hooks/useSupabaseData.ts`**: selects de `useBoards`, `useAllBoards`, `usePages`, `useAllPages`, `usePage` agora incluem os novos campos. `useWorkspaceEntries` mapeia page_id (boards) e parent_id+sort_order (pages) para cada entry, com fallback null/`'a0'`.
- **`src/test/page-types.test.ts`**: entries de teste atualizados com page_id (board) e parent_id+sort_order (page) pra satisfazer novos campos obrigatorios da WorkspaceEntry union.

### Smoke tests novos (`src/test/phase02-schema-types.test.ts`)

5 testes cobrindo: contagem e ordem de DATABASE_COLUMN_TYPES, DATABASE_VIEW_TYPES + DATABASE_VIEW_LABELS, isDatabase com page_id null/undefined/uuid, shapes de Page/PageTreeNode/SyncedBlock, e WorkspaceEntry variants.

## Verificacao

- `npm run build` passa (16.29s, 0 erros novos)
- `npm run test` passa: **193 testes (9 arquivos)** — 188 anteriores + 5 novos
- `npx tsc --noEmit -p tsconfig.app.json` nao introduz erros relacionados aos novos campos. Erros pre-existentes (BoardContext.description, duplicate_board_with_options RPC) permanecem (fora de escopo).
- Migration estruturalmente valida: 9 statements estruturais chave presentes (boards.page_id, pages.parent_id, pages.sort_order, synced_blocks CREATE TABLE, can_access_synced_block FUNCTION, board_views_view_type_check x3, 4 RLS policies, realtime ADD TABLE).
- Zero em-dash em todos os arquivos escritos.

## Migration NAO aplicada em remoto

Conforme protocolo brownfield, a migration **nao foi aplicada** no Supabase de producao. Dono aplica via Coolify/Supabase CLI separadamente quando aprovar. Tipos TypeScript estao em paridade com o schema esperado pos-aplicacao.

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Blocking] Adicao de campos obrigatorios em WorkspaceEntry quebraria call sites existentes**

- **Encontrado durante:** Tarefa 3, ao adicionar `page_id`/`parent_id`/`sort_order` aos variants do WorkspaceEntry.
- **Issue:** `useWorkspaceEntries` em useSupabaseData.ts e `page-types.test.ts` construiam entries sem os novos campos obrigatorios. TypeScript reclamaria. Adicionalmente, os selects de `useBoards`/`useAllBoards`/`usePages`/`useAllPages`/`usePage` nao traziam as novas colunas do banco.
- **Correcao:**
  - selects atualizados pra incluir `page_id` (boards) e `parent_id, sort_order` (pages)
  - `useWorkspaceEntries` mapeia novos campos (com fallback `?? null` / `?? 'a0'`)
  - `page-types.test.ts` atualizado com novos campos
- **Arquivos modificados:** `src/hooks/useSupabaseData.ts`, `src/test/page-types.test.ts`
- **Commit:** `4fa944e` (junto com extensao dos tipos page.ts/board.ts)

Nenhum outro desvio. Erros TypeScript pre-existentes (BoardContext.description, duplicate_board_with_options RPC) sao fora de escopo conforme regra de limite (issues nao causados pelas mudancas da tarefa).

## Commits

| Tarefa | Hash | Mensagem |
|--------|------|----------|
| 1 | `d7eba5e` | feat(02-01): add migration for database inline + hierarchy + synced blocks |
| 2 | `26671a6` | feat(02-01): add database types module (DatabaseColumnType, DatabaseViewType, isDatabase) |
| 3 | `4fa944e` | feat(02-01): extend Page, Board, WorkspaceEntry types for Phase 02 |
| 4 | `c497eb6` | feat(02-01): extend Supabase Database type for Phase 02 schema |
| 5 | `71347c7` | test(02-01): add smoke tests for Phase 02 schema types |

## Self-Check: PASSOU

- supabase/migrations/20260523100000_phase02_database_hierarchy_synced.sql: ENCONTRADO
- src/types/database.ts: ENCONTRADO
- src/test/phase02-schema-types.test.ts: ENCONTRADO
- src/types/page.ts (modificado): ENCONTRADO
- src/types/board.ts (modificado): ENCONTRADO
- src/integrations/supabase/types.ts (modificado): ENCONTRADO
- src/hooks/useSupabaseData.ts (modificado): ENCONTRADO
- src/test/page-types.test.ts (modificado): ENCONTRADO
- Commit d7eba5e: ENCONTRADO
- Commit 26671a6: ENCONTRADO
- Commit 4fa944e: ENCONTRADO
- Commit c497eb6: ENCONTRADO
- Commit 71347c7: ENCONTRADO

## Proximos planos

- **02-02:** Onboarding/criacao de database inline via slash menu + RPC `create_database_inline` (cria board + 4 board_views + page_id setado).
- **02-03:** Migrar UI de sidebar pra usar `sort_order` e construir arvore via `useWorkspaceTree`.
- **02-11:** Realtime sync inclui canal `synced_blocks`.
