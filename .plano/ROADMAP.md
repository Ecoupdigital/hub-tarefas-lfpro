# Roadmap: LFPro Tasks (hub-tarefas-lfpro)

## Visao Geral

Hub colaborativo LFPro evolui de gestor de tarefas (boards + items) para plataforma híbrida tarefa+doc. Fase 01 adiciona modo "Página estilo Notion" via BlockNote, com cross-link bidirecional entre páginas e items. Fases futuras: subpáginas, database inline, comentários, AI, share público, collab realtime full.

## Fases

- [x] **Fase 0: Hub de Tarefas (existente)** - Boards multi-view, items, permissões, automações, formulários, etc.
- [ ] **Fase 1: Páginas estilo Notion (Docs Mode)** - Adicionar formato página rich-text via BlockNote, com cross-link a items.

## Detalhes das Fases

### Fase 0: Hub de Tarefas (existente)
**Status**: Existing
**Features**: Workspaces, boards, grupos, items, subitems, 20+ tipos de coluna, views (Tabela/Kanban/Calendar/Cards/Timeline/Dashboard), MyWork, TeamWork, SharedBoard, PublicForm, automações, permissões 3-niveis, audit log, updates rich-text, realtime, notificações, presence, dependências, mirror cells, formula cells, trash/restore, undo/redo, batch actions, templates, integrações.
**Plans**: N/A (pre-existente)

### Fase 1: Páginas estilo Notion (Docs Mode)
**Goal**: Usuários podem criar "páginas" (docs rich-text estilo Notion) ao lado de boards no mesmo workspace, escolhendo o tipo (Tarefas vs Página) no modal de criação. Páginas usam BlockNote, suportam blocos Notion-like, slash command, @mention de items e embed read-only de boards.
**Depends on**: Fase 0 (existente)
**Requirements**: [REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06, REQ-07, REQ-08]
**Success Criteria** (what must be TRUE):
  1. Usuário pode criar nova página via toggle no `CreateBoardModal` (Tarefas / Página)
  2. Páginas aparecem no sidebar do workspace ao lado de boards, diferenciadas por ícone
  3. Página abre com editor BlockNote estilizado com tokens LFPro (warm gold, Jost/Montserrat, dark mode)
  4. Todos os blocos do MVP funcionam: headings, parágrafos, listas, checklist, code, quote, callout, divider, toggle, image upload, tabela inline, embed vídeo/iframe
  5. Slash command `/` insere blocos default e custom (`/mencionar`, `/embedar board`)
  6. `@mention` de item cria chip clicável com nome+status do item; clique abre `ItemDetailPanel`
  7. Bloco `embed board` renderiza tabela read-only do board escolhido inline na página
  8. Conteúdo da página persiste em tabela `pages` como JSON BlockNote, com auto-save debounced
  9. Histórico de versões em `page_versions` permite restaurar versão anterior
  10. Permissões de página seguem o mesmo modelo de boards (RPC `can_access_page`)
  11. Soft delete (state) + Realtime sync + Trash/Restore funcionam pra páginas
  12. Edições simultâneas mostram presence ("X está editando"); last-write-wins
**Plans**: TBD

Plans:
- [x] 01-01: Schema + RPCs Supabase (tabela `pages`, `page_versions`, RLS, RPC `can_access_page`, realtime)
- [x] 01-02: Integração BlockNote no projeto (instalar, tematizar com tokens LFPro, base do editor)
- [x] 01-03: Tipo "Página" no `CreateBoardModal` + sidebar mista (lista boards + pages)
- [x] 01-04: CRUD de página (criar, abrir, editar, auto-save debounced, soft delete, restore)
- [x] 01-05: Extensões customizadas BlockNote — mention de item + slash menu pt-BR
- [ ] 01-05b: Embed de board read-only (block spec separado, escopo dividido de 01-05)
- [ ] 01-06: Permissões de página (PagePermissionsPanel espelhando BoardPermissionsPanel)
- [ ] 01-07: Versões / histórico (`page_versions`, painel de histórico, restore)
- [ ] 01-08: Presence + realtime sync da página + image upload no bucket `attachments`

## Progress

**Execution Order:**
Fases executam em ordem numérica: 1

| Fase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Hub de Tarefas | N/A | Existing | - |
| 1. Páginas estilo Notion | 5/9 | In Progress | - |
