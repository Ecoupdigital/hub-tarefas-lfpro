# LFPro Tasks (hub-tarefas-lfpro)

## O que e Isso

Aplicacao web de gestao de tarefas colaborativa para a LFPro. Workspace multi-board estilo Monday/ClickUp com visualizacoes em Tabela, Kanban, Calendario, Cards, Timeline e Dashboard. Sincronizacao em tempo real via Supabase Realtime, permissoes granulares (global/workspace/board), formularios publicos e motor de automacoes.

## Valor Central

Plataforma interna de produtividade da LFPro: substitui ferramentas externas (Monday/ClickUp/Asana) com controle total de dados, permissoes finas e integracao direta com o ecossistema da empresa.

## Requisitos

### Validados

<!-- Features detectadas no codebase atual -->

- [x] Autenticacao Supabase (email/senha) com rotas protegidas
- [x] Workspaces multi-tenant com membros e papeis
- [x] Boards com soft delete (`state`)
- [x] Grupos dentro de boards para organizar items
- [x] Subitems (items aninhados em items pai)
- [x] 20+ tipos de coluna: text, status, date, people, link, time_tracking, number, dropdown, checkbox, long_text, email, phone, rating, tags, progress, auto_number, creation_log, last_updated, file, color, location, formula, mirror, connect_boards, button
- [x] Visualizacoes: Tabela, Kanban, Calendario, Cards, Timeline, Dashboard (widgets)
- [x] Pagina MyWork (items do usuario cross-board)
- [x] Pagina TeamWork (items do time)
- [x] Compartilhamento publico de boards (SharedBoard)
- [x] Formularios publicos (PublicForm + Edge Function submit-form)
- [x] Motor de automacoes (useAutomationEngine + recipes)
- [x] Permissoes granulares: global admin, workspace admin, board admin, member, viewer
- [x] Custom roles
- [x] Teams (agrupamento de usuarios)
- [x] Templates de board
- [x] Duplicacao de board com opcoes (estrutura / com dados / com updates) via RPC
- [x] Activity Feed por item
- [x] Audit log
- [x] Updates em items com editor rich text (TipTap 3)
- [x] Reacoes emoji em updates
- [x] Notificacoes (in-app + Slack via Edge Function)
- [x] Presence (usuarios online no board)
- [x] Convite de usuario via Edge Function (invite-user)
- [x] Checagem de usuario ativo (Edge Function check-user-active)
- [x] Trash / restore de items
- [x] Undo / Redo de acoes
- [x] Batch actions em items
- [x] Filtros (FilterBuilder) e QuickColumnFilter
- [x] Group by
- [x] Drag and drop (dnd-kit) de items entre grupos / colunas Kanban
- [x] Realtime sync (subscricoes Supabase invalidam cache React Query)
- [x] Dependencias entre items
- [x] Conexoes entre items (cross-board)
- [x] Mirror columns (espelhar colunas de outros boards)
- [x] Formula cells
- [x] Conditional color rules
- [x] Anexos com bucket Supabase Storage
- [x] Onboarding automatico (workspace + board iniciais com colunas Status/People/Date)
- [x] Tema claro/escuro
- [x] Atalhos de teclado (useKeyboardShortcuts)
- [x] Virtualizacao de listas (TanStack Virtual)
- [x] Preferencias por usuario
- [x] Boards recentes e favoritos
- [x] Pastas de workspace
- [x] Resizing de colunas e coluna de nome
- [x] Permissoes por board (BoardPermissionsPanel)
- [x] Painel de integracoes (IntegrationsPanel)
- [x] Export CSV
- [x] i18n: UI em pt-BR

### Ativos

<!-- Adicionar objetivos com /up:planejar-fase ou /up:discutir-fase -->

(Nenhum ainda)

### Fora do Escopo

(A definir)

## Contexto

**Stack:**
- Frontend: React 18, TypeScript 5.8, Vite 5
- UI: shadcn-ui (Radix UI ~30 componentes) + Tailwind CSS 3
- Estado: TanStack React Query v5 (server) + React Context (UI global)
- Backend: Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- Rich text: TipTap 3 (starter-kit, link, underline, placeholder)
- Drag-drop: dnd-kit (core + sortable + utilities)
- Virtualizacao: @tanstack/react-virtual
- Roteamento: React Router v6
- Testes: Vitest + Testing Library + Playwright (config presente)
- Deploy: Vercel (`vercel.json`) + Docker (`Dockerfile`)

**Estrutura:**
- `src/pages/` - Home, Index, MyWork, TeamWork, SharedBoard, PublicForm, Settings, Auth, NotFound
- `src/components/board/` - 50+ componentes de board, incluindo 20+ Cells especializadas (`*Cell.tsx`)
- `src/components/board/{table,kanban,widgets}/` - subviews
- `src/components/{modals,forms,auth,onboarding,workspace,notifications,settings,templates,automations,import,dnd,shared,work}/` - modulos
- `src/components/ui/` - primitivos shadcn-ui (50+)
- `src/hooks/` - 35 hooks customizados (data, mutations, realtime, permissoes, automacoes, undo/redo, presence, etc.)
- `src/context/AppContext.tsx` - estado de UI global (board ativo, view, filtros, painel)
- `src/integrations/supabase/` - cliente + tipos gerados
- `src/types/board.ts` - interfaces TypeScript
- `supabase/migrations/` - 31 migrations versionadas
- `supabase/functions/` - 5 Edge Functions (check-user-active, invite-user, list-sessions, send-slack-notification, submit-form)

**Tamanho:** ~49k LOC em 263 arquivos TS/TSX

**RPCs Supabase:** `can_access_board`, `can_access_item`, `has_role`, `is_workspace_member`, `duplicate_board_with_options`

**Documentacao:** README.md, CLAUDE.md (instrucoes de desenvolvimento), docs/

## Restricoes

- **Stack fixa**: React 18 + Vite + Supabase + shadcn/Tailwind. Projeto existente em producao.
- **Idioma UI**: Portugues brasileiro (pt-BR) em todo texto visivel.
- **TypeScript** + ESLint configurados (rodar `npm run lint` antes de commits).
- **SPA pura** (sem SSR).
- **localStorage prefix**: `lfpro-`. CustomEvent prefix: `lfpro-`.
- **Soft delete** em boards via campo `state`.
- **Realtime** invalidando cache React Query - cuidado com side effects em mutations.
- **Node >= 22** (`engines` no package.json).
- **Sem em-dash** em texto/copy/comentarios (regra global do dono).
- **Cor primaria**: `hsl(29 45% 71%)` (warm gold LFPro). Fontes: Jost + Montserrat.

## Decisoes-Chave

| Decisao | Justificativa | Resultado |
|---------|---------------|-----------|
| Registrado via /up:iniciar | Adocao incremental do UP em projeto maduro existente | -- |
| column_values em JSON flexivel | Suportar 20+ tipos de coluna sem migrations por tipo | Schema simples, validacao no app |
| RPCs para permissoes | Logica de acesso multi-nivel centralizada no DB | `can_access_board`, `can_access_item`, `has_role` |
| Edge Functions para acoes sensiveis | Convite/email/slack fora do client | invite-user, send-slack-notification, submit-form |
| React Query + Realtime sync | Cache otimista + invalidacao automatica via Supabase channels | `useRealtimeSync.ts` |

---
*Ultima atualizacao: 2026-05-22 apos registro inicial via /up:iniciar*
