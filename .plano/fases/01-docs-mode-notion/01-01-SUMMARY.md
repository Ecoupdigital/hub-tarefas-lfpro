---
phase: 01-docs-mode-notion
plan: 01-01
subsystem: supabase
tags: [schema, rls, rpc, realtime, pages, types]
requires: []
provides:
  - supabase.pages
  - supabase.page_versions
  - supabase.page_permissions
  - rpc.can_access_page
  - rpc.is_page_admin
  - types.Page
  - types.PageVersion
  - types.PagePermission
  - types.PageRole
  - types.PageState
  - types.PageContent
  - types.WorkspaceEntry
affects:
  - src/integrations/supabase/types.ts (Database type estendido)
tech_stack:
  added: []
  patterns:
    - "RLS via RPC SECURITY DEFINER espelhando boards"
    - "Soft delete via coluna state ('active'|'archived'|'deleted')"
    - "Realtime publication ALTER PUBLICATION supabase_realtime ADD TABLE"
key_files:
  created:
    - supabase/migrations/20260522110000_pages_schema.sql
    - src/types/page.ts
    - src/test/page-types.test.ts
  modified:
    - src/integrations/supabase/types.ts
decisions:
  - "Tipos do Supabase estendidos manualmente em vez de regen via `supabase gen types --linked`, porque o schema ainda nao foi aplicado em remoto (brownfield: dono aplica via Coolify separadamente). Extensao manual reflete fielmente o schema da migration."
  - "Removida linha 1 'Initialising login role...' de types.ts (lixo capturado de stderr no gen anterior). Era pre-existente desde o initial commit e quebrava tsc --noEmit."
metrics:
  duration: "3min 27s"
  completed_at: "2026-05-22T11:33:43Z"
  tasks_completed: 5
  files_created: 3
  files_modified: 1
  commits: 4
---

# Fase 01 Plano 01-01: Schema + RPCs Supabase para Pages Summary

Migration SQL completa cria `pages` + `page_versions` + `page_permissions`, com RPCs `can_access_page` e `is_page_admin` espelhando exatamente a arquitetura de boards, RLS por papel, realtime publication, e tipos TypeScript de dominio em `src/types/page.ts` mais a extensao manual de `Database` em `src/integrations/supabase/types.ts`.

## O que foi entregue

| Tarefa | Output | Commit |
|--------|--------|--------|
| 1 | `supabase/migrations/20260522110000_pages_schema.sql` (180 linhas: 3 tabelas, 2 RPCs, 10 policies, 3 ALTER PUBLICATION, 7 indices, 1 trigger) | `437a13e` |
| 2 | Pulada (brownfield: nao aplicar migration aqui) — ver "Desvios" | -- |
| 3 | `src/integrations/supabase/types.ts` estendido com tipos de pages, page_versions, page_permissions, can_access_page, is_page_admin | `4750787` |
| 4 | `src/types/page.ts` (Page, PageVersion, PagePermission, PageRole, PageState, PageContent, WorkspaceEntry) | `03b01d5` |
| 5 | `src/test/page-types.test.ts` (2 testes do narrowing da union) | `be8637e` |

## Arquitetura aplicada

```
pages (workspace_id, folder_id?, title, content jsonb, state, icon?, cover_url?, position, ...)
  |-- page_versions (page_id, content jsonb, title?, created_by, created_at)
  |-- page_permissions (page_id, user_id, role in admin/editor/member/viewer)

RPC can_access_page(_user_id, _page_id)
   = membro_workspace OR permissao_explicita_na_pagina OR global_admin

RPC is_page_admin(_user_id, _page_id)
   = role 'admin' na page OR criador do workspace OR admin do workspace OR global admin

RLS pages: SELECT/UPDATE via can_access_page, INSERT via is_workspace_member, DELETE via is_page_admin
RLS page_versions: SELECT/INSERT via can_access_page (imutavel: sem UPDATE/DELETE)
RLS page_permissions: SELECT via can_access_page, INSERT/UPDATE/DELETE via is_page_admin

Realtime: ALTER PUBLICATION supabase_realtime ADD TABLE pages, page_versions, page_permissions
```

## Desvios do Plano

### Tarefa 2 — Aplicacao remota da migration (pulada)

- **Encontrado durante:** Leitura do `<success_criteria>` do prompt do orquestrador.
- **Issue:** O plano original instruia rodar `npx supabase db push --linked` (Tarefa 2). Mas o prompt do orquestrador (sucesso #brownfield) e a config do projeto (brownfield em producao em `gestor.lfpro.com.br` via Coolify) deixam claro que **nao se aplica migration por aqui**. Aplicacao em prod e responsabilidade do dono via Coolify.
- **Correcao:** Migration foi apenas escrita como arquivo SQL versionado. NAO foi aplicada em remoto.
- **Tipo:** `[Regra 4 - Arquitetural (auto-decisao via builder/yolo mode)]` — instrucao do orquestrador prevalece sobre o plano.
- **Consequencia para Tarefa 3:** Em vez de `supabase gen types --linked`, estendi `src/integrations/supabase/types.ts` manualmente. Isso reflete fielmente o schema da migration (o schema da migration e a source of truth). Quando a migration for aplicada em prod, um futuro regen via CLI vai dar mesmo resultado mais campos atuais que possam estar drift em remoto.

### Bug pre-existente corrigido em types.ts

- **Encontrado durante:** Tarefa 3 (apos as edicoes, `tsc --noEmit -p tsconfig.app.json` mostrava 4 erros TS1434/TS1128 na linha 1).
- **Issue:** Linha 1 de `src/integrations/supabase/types.ts` continha texto `Initialising login role...` (lixo do stderr do `supabase gen types` capturado no `> arquivo.ts` no commit inicial `8978d57`). Quebrava TypeScript check.
- **Correcao:** Linha 1 removida. `npm run build` passa sem regressao. Todos os outros 5 erros pre-existentes em `useTemplates.ts`/`applyTemplate.ts`/`groupBy.ts`/`importData.ts` continuam — fora do escopo desta tarefa (registrar em `deferred-items.md` da fase se relevante).
- **Tipo:** `[Regra 1 - Bug]` (correcao inline durante tarefa que ja tocava o arquivo).
- **Arquivos modificados:** `src/integrations/supabase/types.ts` (1 linha removida)
- **Commit:** `4750787` (combinado com a extensao dos tipos)

## Verificacoes

### Automated
- `grep -E "^CREATE TABLE|^CREATE OR REPLACE FUNCTION|^CREATE POLICY|^ALTER PUBLICATION|^ALTER TABLE|^CREATE INDEX|^CREATE TRIGGER" supabase/migrations/20260522110000_pages_schema.sql | wc -l` -> 29 statements estruturais
- `grep "—" supabase/migrations/20260522110000_pages_schema.sql` -> 0 em-dashes
- `npm run build` -> built in 10.68s (passou)
- `npx vitest run src/test/page-types.test.ts` -> 2 passed
- `grep -c "pages:\|page_versions:\|page_permissions:\|can_access_page\|is_page_admin" src/integrations/supabase/types.ts` -> 5 matches

### Must-haves (frontmatter)
- [x] Tabela `pages` com (id, workspace_id, folder_id, title, content, state, icon, cover_url, position, created_by, created_at, updated_at)
- [x] Tabela `page_versions` com (id, page_id, content, title, created_by, created_at)
- [x] RPC `can_access_page` espelha `can_access_board` (workspace member OU permissao OU global admin)
- [x] RPC `is_page_admin` espelha `is_board_admin` v2 (page admin OU workspace creator OU workspace admin OU global admin)
- [x] Tabela `page_permissions` com roles admin/editor/member/viewer
- [x] RLS bloqueia SELECT/INSERT/UPDATE/DELETE para nao-membros
- [x] Realtime publication inclui as 3 tabelas
- [x] Tipos TypeScript Database estendidos (manual em vez de regen, por contexto brownfield)

## Self-Check: PASSOU

- supabase/migrations/20260522110000_pages_schema.sql -> ENCONTRADO
- src/types/page.ts -> ENCONTRADO
- src/test/page-types.test.ts -> ENCONTRADO
- src/integrations/supabase/types.ts (modificado) -> ENCONTRADO
- Commit 437a13e -> ENCONTRADO
- Commit 4750787 -> ENCONTRADO
- Commit 03b01d5 -> ENCONTRADO
- Commit be8637e -> ENCONTRADO

## Pendente para o dono aplicar em producao

Aplicar a migration `20260522110000_pages_schema.sql` ao projeto Supabase remoto (`legvzsdbgyggubdomwxp`) via fluxo padrao de deploy (Coolify ou `supabase db push --linked` localmente). Antes do plano 01-04 (CRUD hooks) precisar funcionar contra producao, a migration precisa estar aplicada.

## Proximo plano

01-02 — Instalar BlockNote e construir o componente PageEditor (lado client). Pode comecar mesmo antes da migration estar em prod, pois nao depende do schema remoto ainda.
