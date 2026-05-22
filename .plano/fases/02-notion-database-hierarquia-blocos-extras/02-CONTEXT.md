# Fase 02: Notion Database + Hierarquia + Blocos extras - Contexto

**Reunido:** 2026-05-22
**Status:** Pronto para planejamento

<domain>
## Limite da Fase

Estender o sistema de Pages (Fase 01) com:
1. **Subpáginas:** `pages.parent_id` permite páginas aninhadas.
2. **Database inline (mini-board):** Bloco BlockNote que cria/referencia um board com `page_id` setado. Reusa toda a infra de boards (items, columns, column_values, RLS, RPCs, realtime).
3. **Sidebar tree expansível:** `AppSidebar` estendido pra renderizar árvore Workspace > Pages > (Subpages | Databases). Drag/drop reordena e reaninha dentro do workspace.
4. **4 views por database:** Tabela, Kanban, Calendário (reusam `BoardTable`/`BoardKanban`/`BoardCalendar` com flag `mode='database'`), Lista detalhada Notion-style (componente novo `DatabaseListView`).
5. **Bloco Bookmark:** Cola URL → Edge Function `fetch-url-metadata` extrai title/desc/og:image/favicon → renderiza card com preview clicável. Metadata cacheada no JSON do bloco.
6. **Bloco Synced:** Conteúdo compartilhado entre pages do mesmo workspace via tabela `synced_blocks`. Edita em qualquer lugar = reflete em todos.

**Fora do dominio (vai para fases futuras):**
- Drag/drop entre workspaces (só dentro do workspace no MVP)
- AI commands em blocos
- Comentários inline em blocos
- Export PDF / share público
- Database com formulas, mirror, connect_boards (subset 8 tipos no MVP)
- Live Collab CRDT
- Templates de database
- Sub-databases (database dentro de database)
- Permissões granulares por synced block (workspace-scoped no MVP)

</domain>

<decisions>
## Decisões de Implementação

### Schema da Database
- **Reusar `boards` com `page_id`:** Adicionar coluna `boards.page_id` (FK pages, nullable). Quando `page_id` IS NOT NULL, é uma "database inline" (não aparece em listagens normais de board). Quando NULL, é board tradicional (comportamento atual preservado).
  - Razão: reusa items, column_values, board_views, RPCs (`can_access_board`), RLS, padrão de realtime, todas as Cell components. Minimiza schema novo. Trade-off aceito: tabela `boards` mistura 2 concerns.
- **Items reusam `items` + `column_values`:** Consequência direta.
- **Subset de 8 tipos de coluna no MVP:** `text`, `status`, `date`, `people`, `number`, `checkbox`, `dropdown`, `long_text`. UI de criar coluna oculta os outros 12 tipos quando o board é database (`page_id IS NOT NULL`).
- **Database TEM grupos** (espelha boards). Items vivem em grupos. Group BY virtual continua disponível nas views.
- **Realtime espelhando boards:** Mesmo canal Supabase Realtime `boards` invalida cache. Sem listener novo.

### Hierarquia (subpáginas) e Sidebar
- **`pages.parent_id`:** FK auto-referente. NULL = root no workspace. NOT NULL = subpage.
- **`pages.sort_order`:** float pra ordenação manual (drag/drop atualiza, evita reordenar batch). Usa estratégia "ordem fracionária" (entre A=1.0 e B=2.0, novo item vira 1.5).
- **Estender `AppSidebar`:** Substituir lista plana de boards/pages por estrutura tree. Manter `WorkspaceFolders` e dnd-kit existentes (que já lidam com boards). Pages/databases entram como filhos expansíveis do workspace e podem ter próprios filhos. Componente `PageTreeItem` recursivo.
- **Drag/drop:** Reordenar entre irmãos + aninhar dentro de outra page. Apenas dentro do mesmo workspace no MVP. Reusa `@dnd-kit` (já instalado).
- **Performance:** Lazy load por nível. Hook `useWorkspaceTree(workspaceId, parentId)` query React Query com key `['pages-tree', workspaceId, parentId]`. Expansão de nó dispara nova query para children. Item collapsed não busca filhos.
- **Ícones lucide distintos:**
  - Boards: `Grid3x3`
  - Pages (root): `FileText`
  - Subpages: `FileText` (indentado visualmente)
  - Databases (inline): `Database`
  - Indentação visual: 16px por nível.

### Views da Database
- **Reusar componentes de board:** `BoardTable`, `BoardKanban`, `BoardCalendar` recebem prop opcional `mode?: 'board' | 'database'` (default `'board'`). Quando `'database'`:
  - Não renderiza `BoardHeader` (já tá fora do contexto de tabs)
  - Não renderiza `TabBar`
  - Container reduzido, sem fullscreen
  - `ItemDetailPanel` continua abrindo via `selectedItem` no contexto, mas no contexto da database (Page.tsx + AppContext compartilhado)
- **Lista detalhada (NOVO componente `DatabaseListView`):**
  - Cada item renderiza como bloco grande
  - Título do item: tamanho `text-lg`, font heading, clicável (abre `ItemDetailPanel`)
  - Abaixo do título: linha horizontal com chips/badges das props visíveis (status pill, data, avatares people, número, checkbox)
  - Espaçamento vertical `py-3 border-b` entre items
  - Props mostradas configuráveis por view (default: status + date + people)
- **Config de view persiste em `board_views`** (tabela já existe!). Adicionar tipos: `'list_detailed'` ao enum/string aceito. Campos existentes (filters, sort, group_by, columns_visible) reaproveitados.
- **Criar 4 views ao criar database:** Sistema cria Tabela, Kanban, Calendário, Lista detalhada simultaneamente quando database é criada. Usuário tem todas disponíveis na hora via tabs.
- **Tabs de view dentro da database:** Componente `DatabaseViewTabs` similar ao TabBar dos boards mas reduzido (sem close, sem rename inline — só selecionar e botão "+" pra criar view nova manualmente depois).

### Bookmark
- **Edge Function nova `fetch-url-metadata`:** Deno function em `supabase/functions/fetch-url-metadata/`. Recebe `{url}`. Faz fetch HTML (com timeout 10s + UA realista pra evitar bot blocks). Parse OpenGraph + Twitter Cards + favicon (manual ou `cheerio` portado). Retorna `{title, description, image, favicon, site_name}`.
- **Cache:** Metadata vai pro JSON do próprio bloco BlockNote. Props do bloco: `{url, title, description, image, favicon, site_name, fetched_at}`. Não re-fetcha em re-render.
- **Refresh manual:** Botão "Atualizar preview" no bloco re-chama Edge Function.
- **Fallback gracioso:** Se Edge Function falha, mostra só URL como link + ícone genérico.

### Synced Block
- **Tabela nova `synced_blocks`:** Colunas `id`, `content jsonb` (array de blocos BlockNote), `workspace_id` (FK), `created_by`, `created_at`, `updated_at`. RLS: SELECT/INSERT/UPDATE pra workspace members.
- **Bloco no editor:** Tipo `synced` com props `{synced_block_id}`. Render busca content via hook `useSyncedBlock(id)`. Editar abre dialog/inline com mini-editor que persiste em `synced_blocks.content`.
- **Realtime:** Canal `synced_blocks` invalida `['synced_block', id]` em qualquer mudança. Bloco em todas as pages re-renderiza com novo conteúdo.
- **Permissões:** Workspace-scoped. Apenas members do workspace podem ler/editar. Tentativa de referenciar synced block de outro workspace renderiza placeholder "Bloco não acessível".

### Critério do Claude
- Definir formato exato de `sort_order` (float vs integer com reordenação batch) ao planejar — float é mais simples mas pode acumular precisão. Recomendar lexorank string se complexidade aceitavel.
- Definir UX exata de "criar database" via slash menu: dialog rápido (nome + ícone) vs criação inline com nome editável depois.
- Definir comportamento ao deletar page com subpages/databases (cascade soft delete? confirmar?).
- Definir UX de "tabs de view" — horizontal scroll, dropdown overflow, etc.
- Definir comportamento do drag/drop quando arrastando page pra dentro de database (impossível) — rejeitar drop com feedback visual.

</decisions>

<specifics>
## Ideias Específicas

- **Notion como referência visual e funcional.** Manter look LFPro (warm gold, Jost/Montserrat).
- **Database = "board com page_id"** é o insight chave. Permite Fase 2 ser massivamente menor que se fosse schema separado.
- **Lista detalhada é o único componente de view REALMENTE novo.** Tabela/Kanban/Calendário reusam Board* atuais.
- **Reuso máximo de infra existente:**
  - Tabela `board_views` pra config de view
  - `useCrudMutations` pra board/item operations (estender pra suportar `mode='database'`)
  - `useRealtimeSync` pra realtime (canais existentes cobrem boards/items)
  - `dnd-kit` pra drag/drop da árvore
  - `AppSidebar` + `WorkspaceFolders` pra sidebar (estender)
  - `Edge Functions` padrão de Deno em `supabase/functions/` pra `fetch-url-metadata`
  - Bucket `attachments` (se precisar de upload de imagens dentro de synced blocks, reusa o já existente)
- **Hierarquia inspirada em Notion:**
  - Workspace > Page > Subpage > Subpage
  - Workspace > Page > Database
  - Database NÃO contém Pages (database só contém items)
- **Recomendação: lexorank pra `sort_order`** (string base-36, comparável). Evita problemas de precisão de float depois de muitas reordenações.

</specifics>

<deferred>
## Ideias Adiadas

- **Drag/drop entre workspaces:** Mover page de workspace A pra workspace B. Edge cases de permissões e item ownership. Fase futura: "Cross-workspace operations".
- **AI commands no editor:** `/ai escreva`, `/ai resuma`, `/ai database` (gerar database a partir de prompt). Fase IA dedicada.
- **Comentários inline em blocos:** Selecionar texto e comentar. Fase futura: "Doc Comments".
- **Export PDF / Share público:** Botões em pages e databases. Fase futura: "Page Sharing".
- **Formulas, Mirror, Connect_boards em databases:** Subset 8 tipos no MVP é suficiente. Fase futura: "Database Power Features".
- **Live Collab CRDT (Yjs):** Cursores ao vivo, merge automático. Mantemos last-write-wins. Fase futura: "Live Collab".
- **Templates de database:** "Criar database a partir de template" (Eventos, Tarefas Q2, OKRs). Fase futura: "Database Templates".
- **Sub-databases:** Database dentro de database (linked database, view filtrada). Fase futura: "Linked Databases".
- **Permissões granulares por synced block:** Workspace-scoped no MVP. Fase futura: "Synced Block Permissions".
- **Embeds extras tipo Notion** (Figma, Loom, Spotify, Maps): Bookmark cobre genericamente via iframe quando aplicável.

</deferred>

---

*Fase: 02-notion-database-hierarquia-blocos-extras*
*Contexto reunido: 2026-05-22*
