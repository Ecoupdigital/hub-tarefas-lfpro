# Roadmap: LFPro Tasks (hub-tarefas-lfpro)

## Visao Geral

Hub colaborativo LFPro evolui de gestor de tarefas (boards + items) para plataforma híbrida tarefa+doc. Fase 01 adiciona modo "Página estilo Notion" via BlockNote, com cross-link bidirecional entre páginas e items. Fases futuras: subpáginas, database inline, comentários, AI, share público, collab realtime full.

## Fases

- [x] **Fase 0: Hub de Tarefas (existente)** - Boards multi-view, items, permissões, automações, formulários, etc.
- [x] **Fase 1: Páginas estilo Notion (Docs Mode)** - Adicionar formato página rich-text via BlockNote, com cross-link a items.

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
- [x] 01-05b: Embed de board read-only (block spec separado, escopo dividido de 01-05)
- [x] 01-06: Permissões de página (PagePermissionsPanel espelhando BoardPermissionsPanel)
- [x] 01-07: Versões / histórico (`page_versions`, painel de histórico, restore)
- [x] 01-08: Presence + realtime sync da página + image upload no bucket `attachments`

## Progress

**Execution Order:**
Fases executam em ordem numérica: 1

| Fase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Hub de Tarefas | N/A | Existing | - |
| 1. Páginas estilo Notion | 9/9 | Complete | 2026-05-22 |
| 2. Notion Database + Hierarquia + Blocos extras | 11/11 | Complete | 2026-05-23 |

### Fase 2: Notion Database + Hierarquia + Blocos extras

**Goal**: Pages podem conter subpáginas e databases inline (mini-boards com items/colunas próprios). Sidebar renderiza árvore expansível mostrando hierarquia completa (workspace > page > subpages/databases). Databases têm múltiplas views (Tabela, Kanban, Calendário, Lista detalhada estilo Notion). Blocos extras: bookmark (URL com preview card) e synced block (mesmo conteúdo em múltiplas pages).
**Depends on**: Fase 1
**Requirements**: [REQ-09, REQ-10, REQ-11, REQ-12, REQ-13, REQ-14, REQ-15, REQ-16, REQ-17, REQ-18, REQ-19, REQ-20]
**Success Criteria** (what must be TRUE):
  1. Page pode ter parent_id apontando pra outra page (subpáginas)
  2. Sidebar lista pages como árvore expansível: workspace > page > subpages/databases
  3. Drag/drop na árvore permite reordenar e reaninhar pages
  4. Bloco "Database" no slash menu cria nova database vinculada à página atual
  5. Database tem schema próprio: items, colunas (tipos: text, status, date, people, number, select, checkbox), views
  6. Database aparece como filha da page no sidebar
  7. View Tabela funciona (editar inline, adicionar coluna, adicionar item)
  8. View Kanban funciona (drag items entre colunas de status)
  9. View Calendário funciona (items posicionados por coluna date escolhida)
  10. View Lista detalhada funciona (cada item ocupa linha grande com props empilhadas embaixo do nome — estilo Notion list view)
  11. Trocar de view não perde estado (filtros/sort/group persistem por view)
  12. Bloco "Bookmark" no slash menu: cola URL → fetch metadata (title, descrição, favicon, og:image) via Edge Function → renderiza card com preview clicável
  13. Bloco "Synced Block" no slash menu: cria bloco que pode ser referenciado em outras pages; editar em um lugar reflete em todos
  14. Permissões: databases herdam permissões da page pai. Subpáginas têm permissões próprias (espelham pages MVP)
  15. Realtime sync: edições em databases/subpages refletem em outras abas
**Plans**:
- [x] 02-01: Schema fundacional (boards.page_id, pages.parent_id+sort_order, synced_blocks, view list_detailed) + tipos TS
- [x] 02-02: Sidebar tree expansivel (usePagesTree + PageTreeItem + DatabaseSidebarItem)
- [x] 02-03: Drag/drop na arvore com lexorank (`useReorderPage` + dnd-kit)
- [x] 02-04: Subpages CRUD + breadcrumb + cascade delete (RPC `soft_delete_page_cascade`)
- [x] 02-05: Bloco Database no BlockNote (criacao via slash menu + render inline com stubs)
- [x] 02-06: Views Tabela/Kanban/Calendar com mode='database' + DatabaseBoardContext + filtro 8 tipos
- [x] 02-07: `DatabaseListView` (Notion list view real)
- [x] 02-08: `DatabaseViewTabs` + persistencia de view ativa
- [x] 02-09: Edge Function `fetch-url-metadata` + Bloco Bookmark
- [x] 02-10: Bloco Synced (synced_blocks)
- [x] 02-11: Permissoes + Realtime de synced_blocks (fechamento)

### Fase 3: Views Notion-style com toggle de estilo

**Goal**: Cada view da database (Tabela, Kanban, Calendário, Lista) ganha variante visual Notion-style nativa, construída do zero como componente novo (NotionTableView, NotionKanbanView, NotionCalendarView, NotionListView). Toggle no header da view (LFPro / Notion) persistido em `board_views.config.style`. Estilo Notion usa paleta cinza neutra (sem warm gold). Estilo LFPro mantém comportamento atual (reusa Board* com mode='database').
**Depends on**: Fase 2
**Requirements**: [REQ-21, REQ-22, REQ-23, REQ-24, REQ-25, REQ-26, REQ-27, REQ-28]
**Success Criteria** (what must be TRUE):
  1. Header de cada view tem switch LFPro / Notion visível
  2. Toggle persiste em `board_views.config.style` (default 'lfpro')
  3. NotionTableView renderiza tabela com cabeçalho cinza, rows compactas, hover row, props com ícones por tipo, edit inline (sem popover)
  4. NotionKanbanView renderiza kanban com cards limpos (nome + 2-3 props), colunas com header subtle + contador
  5. NotionCalendarView renderiza grid de mês cheio, eventos como pílulas coloridas com texto truncado, hover mostra detalhe, toggle Semana/Mês
  6. NotionListView renderiza linhas com nome inline + props em chips (paleta cinza)
  7. Estilo Notion usa cinzas neutros (sem warm gold)
  8. Trocar estilo não perde dados (apenas re-renderiza)
  9. Estilo LFPro continua funcionando (variantes não se quebram entre si)
**Plans**: TBD
