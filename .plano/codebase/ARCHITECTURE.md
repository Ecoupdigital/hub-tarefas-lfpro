# Arquitetura

**Data da Analise:** 2026-05-22

## Visao Geral do Padrao

**Geral:** SPA (Single Page Application) com React 18 + Vite + TypeScript. Backend-as-a-Service via Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions). Sem SSR.

**Caracteristicas Chave:**
- Composicao de Contexts especializados (UI, Filter, Board, Tab, Selection, UndoRedo, Dashboard) ao inves de um Context monolitico. `AppContext.tsx` apenas agrega via `useApp()`.
- Camada de dados orientada por hooks: `useSupabaseData.ts` (leituras com React Query) + `useCrudMutations.ts` (escritas com `useMutation`).
- Sincronizacao em tempo real: `useRealtimeSync.ts` se inscreve em canais Postgres do Supabase e invalida o cache do React Query.
- Code splitting agressivo: todas as paginas e views pesadas (`BoardCalendar`, `BoardTimeline`, `BoardDashboard`, `BoardCards`, `ItemDetailPanel`, `CommandPalette`, `GlobalSearch`) sao carregadas via `React.lazy`.
- Permissoes em 3 niveis (global / workspace / board) checadas tanto no client (`usePermissions.ts`, `PermissionGate.tsx`, `useUserRole`) quanto no banco via RPCs (`can_access_board`, `can_access_item`, `has_role`, `is_workspace_member`).
- Motor de automacoes acionado por mutations: `useAutomationEngine.ts` exporta `executeAutomations()` que e chamado em hooks de `useCrudMutations` apos sucesso, com anti-loop por `Set` em nivel de modulo.

## Camadas

**Pages (`src/pages/`):**
- Proposito: Componentes-raiz montados pelo React Router.
- Localizacao: `src/pages/`
- Contem: `Index.tsx` (dashboard principal, montado em `/`, `/board/:boardId`, `/workspace/:workspaceId`, `/my-work`, `/team-work`), `Home.tsx` (landing/sumario), `Auth.tsx`, `Settings.tsx`, `MyWork.tsx`, `TeamWork.tsx`, `SharedBoard.tsx`, `PublicForm.tsx`, `NotFound.tsx`.
- Depende de: Components, Hooks, Contexts.
- Usado por: `App.tsx`.

**Contexts (`src/context/`):**
- Proposito: Estado de UI global, separado por responsabilidade.
- Localizacao: `src/context/`
- Contem:
  - `UIContext.tsx` — `activeBoardId`, `activeWorkspaceId`, `selectedItem`, `navStack`, `activeView` (table/kanban/timeline/calendar/dashboard/cards/charts/files), `sidebarCollapsed`, `zenMode`.
  - `FilterContext.tsx` — `searchQuery`, `advancedFilter`, `sort`, `hiddenColumns`, quick filters.
  - `BoardContext.tsx` — dados de board normalizados (workspaces, boards, groups, columns, items, columnValues, users) buscando via `useSupabaseData`; tambem registra `useRealtimeSync` e `usePreloadTabs`.
  - `TabContext.tsx` — multi-aba de boards (estilo navegador), com `ensureTab`, `switchTab`, `closeTab`, atalhos Ctrl+Tab/Ctrl+W.
  - `SelectionContext.tsx` — selecao multipla de items para batch actions.
  - `UndoRedoContext.tsx` — historico de acoes, limpo a cada troca de board.
  - `DashboardFilterContext.tsx` — filtros aplicados aos widgets de dashboard.
- Ordem dos providers (em `AppContext.tsx:90-102`): `UIProvider > FilterProvider > TabProvider > BoardProvider`. `BoardProvider` depende de `UIProvider` e `FilterProvider`.
- Depende de: Hooks de data e mutations.
- Usado por: `pages/Index.tsx`, componentes de board, sidebar.

**Hooks (`src/hooks/`):**
- Proposito: Logica de dados, mutacoes, realtime, automacao, permissoes, presence, undo/redo, etc.
- Localizacao: `src/hooks/`
- Contem 35 arquivos. Categorias:
  - **Leitura/cache**: `useSupabaseData.ts` (~750 linhas, 26 hooks: `useProfiles`, `useWorkspaces`, `useAllBoards`, `useBoards`, `useGroups`, `useColumns`, `useItems`, `useSubitems`, `useColumnValues`, `useUpdates`, `useItemsInfinite`, `useGroupAggregations`, `useAllSubitems`, `useItemFull`, etc.)
  - **Mutacoes**: `useCrudMutations.ts` (~890 linhas, 28 hooks: `useCreateWorkspace`, `useCreateBoard`, `useCreateGroup`, `useCreateColumn`, `useDeleteItem`, `useMoveItem`, `useReorderItem`, `useBatchReorderItems`, `useMoveItemToGroup`, `useDuplicateBoardWithOptions`, etc.)
  - **Realtime**: `useRealtimeSync.ts` (workspace-wide), `useRealtimeFavorites`, `usePresence.ts`.
  - **Permissoes**: `usePermissions.ts` (board roles: admin/editor/member/viewer), `useCustomRoles.ts`.
  - **Auth**: `useAuth.tsx` — gerencia sessao Supabase Auth e prefetch de "Meu Trabalho".
  - **Automacoes**: `useAutomations.ts`, `useAutomationEngine.ts`, `useAutomationRecipes.ts`.
  - **Features**: `useTrash.ts`, `useTemplates.ts`, `useTeams.ts`, `useBoardForms.ts`, `useBoardShares.ts`, `useBoardViews.ts`, `useDashboardWidgets.ts`, `useDependencies.ts`, `useItemConnections.ts`, `useIntegrations.ts`, `useFileUpload.ts`, `useNotifications.ts`, `useReactions.ts`, `useActivityLog.ts`, `useAuditLog.ts`, `useMyWorkItems.ts`, `useUserPreferences.ts`, `useWorkspaceFolders.ts`, `useRecentBoards.ts`, `useBoardItemCounts.ts`, `useKeyboardShortcuts.ts`, `useUndoRedo.ts`, `usePreloadTabs.ts`.
  - **Utilitarios**: `use-toast.ts`, `use-mobile.tsx`.
- Depende de: `@/integrations/supabase/client`, React Query.
- Usado por: Contexts, Pages, Components.

**Components (`src/components/`):**
- Proposito: Apresentacao e interacao.
- Localizacao: `src/components/`
- Contem subpastas tematicas (`board/`, `modals/`, `ui/`, `forms/`, `auth/`, `onboarding/`, `workspace/`, `notifications/`, `settings/`, `templates/`, `automations/`, `import/`, `dnd/`, `shared/`, `work/`).
- Depende de: Hooks, Contexts, UI primitives.
- Usado por: Pages.

**Integrations (`src/integrations/supabase/`):**
- Proposito: Cliente Supabase tipado e tipos de banco gerados.
- Localizacao: `src/integrations/supabase/client.ts` (cria `supabase` com `createClient<Database>`, persiste sessao em `localStorage`), `src/integrations/supabase/types.ts` (Database type gerado a partir do schema).
- Usado por: Todos os hooks.

**Types (`src/types/`):**
- Proposito: Interfaces de dominio TypeScript.
- Localizacao: `src/types/board.ts`.
- Contem: `User`, `Workspace`, `Board`, `Group`, `Column`, `ColumnType` (26 tipos), `ColumnSettings`, `Item`, `SubItem`, `ColumnValue`, `ColumnValueData`, `ColumnTypeValueMap` (mapeia cada `ColumnType` ao seu valor tipado), `Update`, `UserRole`, `BoardPermission`, `BoardTemplate`.

**Utils (`src/utils/`):**
- Proposito: Funcoes puras de transformacao.
- Localizacao: `src/utils/`
- Contem: `applyTemplate.ts`, `exportCsv.ts`, `filterToPostgrest.ts` (traduz `FilterGroup` da UI para query PostgREST + `buildItemsQuery`, `ITEMS_PAGE_SIZE`), `formatActivityAction.ts`, `formulaParser.ts`, `groupBy.ts`, `hashUtils.ts`, `importData.ts`, `parseColumnValue.ts`.

**Lib (`src/lib/`):**
- Proposito: Utilitarios de UI compartilhados pelo shadcn.
- Localizacao: `src/lib/utils.ts` (`cn` para merge de classes Tailwind via `clsx` + `tailwind-merge`).

**Data (`src/data/`):**
- Proposito: Dados estaticos.
- Localizacao: `src/data/boardTemplates.ts` (templates iniciais de board).

## Fluxo de Dados

**Fluxo de Leitura:**

1. Componente chama hook em `useSupabaseData.ts` (ex.: `useItems(boardId)`).
2. React Query consulta cache pela `queryKey` (ex.: `['items', boardId]`); se ausente/stale, dispara `queryFn` que chama `supabase.from('items').select(...)`.
3. Dados retornam ao componente. Cache fica disponivel para todos os consumidores da mesma `queryKey`.
4. Em paralelo, `useRealtimeSync.ts` (registrado em `BoardContext.tsx:71`) mantem canal `workspace-sync` aberto. Toda mudanca em `items`, `groups`, `columns`, `column_values`, `boards` resulta em `qc.invalidateQueries(...)` com o `board_id` do payload.
5. React Query refaz fetch automaticamente. Componentes re-renderizam com dados novos.

**Fluxo de Escrita:**

1. Componente chama hook de `useCrudMutations.ts` (ex.: `useUpdateColumnValue().mutate(...)`).
2. `mutationFn` executa upsert/insert/update/delete no Supabase.
3. `onSuccess` invalida queries relacionadas (ex.: `['column_values', boardId]`).
4. Se aplicavel, `mutationFn` chama `executeAutomations({ type, boardId, itemId, ... })` em fire-and-forget.
5. `useAutomationEngine.ts` busca `automations` ativas para o board com `trigger_type === event.type`, valida config, executa actions, registra em `automation_logs` (status `success`/`error`/`skipped`).
6. Realtime nas outras abas/usuarios recebe o `postgres_changes` e invalida o cache local. Convergencia em ~ms.
7. Acoes desfaziveis sao empilhadas no `UndoRedoContext` antes do commit.

**Sincronizacao URL <-> Contexto** (em `pages/Index.tsx:117-151`):
- URL muda (`/board/:boardId`) -> `useEffect` chama `ensureTab(boardId)` e salva em `localStorage` (`lfpro-last-board-id`).
- Context tem board mas URL nao tem -> `navigate(/board/${activeBoardId})`.
- Aba ativa muda no `TabContext` -> URL e atualizada.

**Gerenciamento de Estado:**
- **Server state**: TanStack React Query v5 (cache, refetch, invalidation, optimistic updates, infinite queries para items).
- **UI state global**: React Context dividido por dominio (UI, Filter, Board, Tab, Selection, UndoRedo, Dashboard, BoardChange).
- **Local state**: `useState`/`useReducer` dentro de componentes.
- **Persistencia**: `localStorage` com prefixo `lfpro-` (ex.: `lfpro-last-board-id`, preferencias, sidebar collapsed). Auth session persistida pelo cliente Supabase.

## Abstracoes Chave

**Cell Components (Padrao Strategy):**
- Proposito: Cada tipo de coluna tem um componente especializado em `src/components/board/*Cell.tsx`. Selecao feita via switch em `src/components/board/table/renderCellByType.tsx`.
- Convencao: nome `<Tipo>Cell.tsx`. Props padrao: `{ value, onChange, ...opts }`.
- Exemplos: `StatusCell.tsx`, `PeopleCell.tsx`, `DateCell.tsx`, `LinkCell.tsx`, `TimeTrackingCell.tsx`, `CheckboxCell.tsx`, `NumberCell.tsx`, `DropdownCell.tsx`, `LongTextCell.tsx`, `EmailCell.tsx`, `PhoneCell.tsx`, `RatingCell.tsx`, `TagsCell.tsx`, `ProgressCell.tsx`, `AutoNumberCell.tsx`, `FormulaCell.tsx` (lazy), `TimelineCell.tsx`, `ConnectBoardsCell.tsx`, `MirrorCell.tsx`, `VoteCell.tsx`, `ColorCell.tsx`, `ButtonCell.tsx`, `LocationCell.tsx`, `FileCell.tsx`, `TextCell.tsx`.
- Mapeamento ColumnType -> valor tipado em `src/types/board.ts` via `ColumnTypeValueMap`.

**Board Views (Padrao Strategy de visualizacao):**
- Proposito: O mesmo board renderiza em multiplas vistas. `UIContext.activeView` decide qual.
- Implementacao em `src/components/board/`:
  - `BoardTable.tsx` (tabela com grupos colapsaveis, suporte a subitems, virtualizado).
  - `BoardKanban.tsx` (+ `kanban/DroppableKanbanColumn.tsx`, `KanbanCard.tsx`, `KanbanColumnHeader.tsx`, `KanbanToolbar.tsx`, helpers em `kanbanHelpers.ts`, tipos em `KanbanTypes.ts`).
  - `BoardCalendar.tsx` (lazy).
  - `BoardTimeline.tsx` (lazy).
  - `BoardCards.tsx` (lazy).
  - `BoardDashboard.tsx` (lazy) + widgets em `widgets/`.

**Modais de Criacao:**
- Convencao: `Create<Entidade>Modal.tsx` em `src/components/modals/`.
- Existentes: `CreateWorkspaceModal.tsx`, `CreateBoardModal.tsx`, `CreateGroupModal.tsx`, `CreateColumnModal.tsx`, `EditColumnModal.tsx`. Outros modais especificos ficam ao lado do componente que os usa.

**Filter System:**
- `src/components/board/FilterBuilder.tsx` define `FilterGroup`, `FilterRule`, `FilterOperator`, `FilterCombinator` + `evaluateFilterGroup` (avaliacao client-side).
- `src/utils/filterToPostgrest.ts` traduz `FilterGroup` em query PostgREST + paginacao (`ITEMS_PAGE_SIZE`).
- `src/components/board/QuickColumnFilter.tsx` filtros rapidos por coluna.

**Automation Engine:**
- Entrada: `executeAutomations(event: AutomationEvent)` em `src/hooks/useAutomationEngine.ts:35`.
- Eventos: `column_change`, `status_change`, `person_assigned`, `item_created`, etc. (tipos em `useAutomations.ts`).
- Anti-loop: `Set<string>` em escopo de modulo (`executingAutomations`).
- Fire-and-forget: nunca lanca; todos os erros sao logados em `automation_logs` no Supabase.

**Permissoes (3 niveis):**
- **Global**: `user_roles` table, `useUserRole()` em `src/components/shared/PermissionGate.tsx` + `hasPermission()` com hierarquia `admin(4) > member(3) > viewer(2) > guest(1)`.
- **Workspace**: `workspace_members` table, RPC `is_workspace_member`.
- **Board**: `board_permissions` table, roles `admin`/`editor`/`member`/`viewer`, hooks `useBoardRole`, `useCanEdit`, `useCanAdmin` em `src/hooks/usePermissions.ts`.
- RPCs Supabase para checagem server-side: `can_access_board`, `can_access_item`, `has_role`, `is_workspace_member`.
- Componente helper: `<PermissionGate requiredRole="admin">...</PermissionGate>` em `src/components/shared/PermissionGate.tsx`.

**Realtime Channels:**
- `workspace-sync` (em `useRealtimeSync.ts`): canal global escutando `items`, `groups`, `columns`, `column_values`, `boards`. Debounce de 2s para `column_values`.
- `favorites-global` (em `useRealtimeFavorites`): sincroniza favoritos cross-tab.
- `usePresence.ts`: canal por board para presence (usuarios online).

**Drag and Drop:**
- Biblioteca: dnd-kit.
- Provider: `src/components/dnd/DndProvider.tsx`.
- Sortable wrapper: `src/components/dnd/SortableItem.tsx`.
- Overlay no table: `src/components/board/table/DragOverlayRow.tsx`.

## Pontos de Entrada

**Bootstrap:**
- `src/main.tsx`: chama `initThemeCustomization()` (carrega tema salvo) e monta `<App />` em `#root` com `createRoot`.

**App Root:**
- `src/App.tsx`: monta `QueryClientProvider > TooltipProvider > Toaster + Sonner > BrowserRouter > Suspense > Routes`.
- Define:
  - `ProtectedRoute` (em `App.tsx:21-32`): redireciona para `/auth` se nao autenticado.
  - `AuthRoute` (em `App.tsx:34-39`): redireciona para `/` se ja autenticado.
  - `ProtectedApp` (em `App.tsx:41-52`): aplica `AppProvider` (que monta UIProvider > FilterProvider > TabProvider > BoardProvider) e roteia rotas internas.
- Rotas publicas: `/auth`, `/form/:slug` (PublicForm), `/shared/:token` (SharedBoard).
- Rotas protegidas: `/`, `/board/:boardId`, `/workspace/:workspaceId`, `/my-work`, `/team-work`, `/settings/*`.

**Pagina Principal:**
- `src/pages/Index.tsx`: dashboard. Le params de URL, sincroniza com `UIContext`, monta `AppSidebar`, `TopNavBar`, `TabBar`, `BoardHeader`, view ativa, `ItemDetailPanel`, e providers locais `SelectionProvider`/`UndoRedoProvider`. Componente `BoardChangeHandler` limpa undo/redo quando o board ativo muda. `DefaultViewApplier` aplica view padrao salva por board.

**Edge Functions (server-side):**
- `supabase/functions/check-user-active/` — verifica se um email ja existe como usuario ativo.
- `supabase/functions/invite-user/` — envia convite de usuario.
- `supabase/functions/list-sessions/` — lista sessoes ativas do usuario.
- `supabase/functions/send-slack-notification/` — envia notificacao Slack.
- `supabase/functions/submit-form/` — recebe submissoes de formularios publicos.

## Tratamento de Erros

**Estrategia:**
- **Boundary global**: `src/components/shared/ErrorBoundary.tsx` envolve trechos sensiveis (`pages/Index.tsx` o usa em volta das views).
- **Mutations**: `useCrudMutations.ts` propaga erros e usa `sonner` (toast) para feedback.
- **Automation engine**: nunca propaga erros (fire-and-forget em `useAutomationEngine.ts:49-51`); registra em `automation_logs`.
- **Realtime**: erros de canal sao silenciosos (Supabase reconecta automaticamente).
- **Auth**: `loading` flag controla redirects para evitar piscar de tela.

## Preocupacoes Transversais

**Logging:**
- `activity_log` table + `useActivityLog.ts` — eventos por board.
- `audit_log` + `useAuditLog.ts` — auditoria de mudancas sensiveis.
- `automation_logs` — execucoes do motor de automacoes.
- `integration_logs` — chamadas a integracoes externas (`20260219081000_create_integration_logs.sql`).

**Validacao:**
- Schema: validacao no banco via RLS + constraints.
- Cliente: type narrowing via `ColumnTypeValueMap` e validacao ad-hoc em cada Cell.
- Forms publicos: `react-hook-form` + Zod em `src/components/forms/FormBuilder.tsx`.

**Autenticacao:**
- Supabase Auth (email/senha). Sessao em `localStorage` (`src/integrations/supabase/client.ts:9`).
- Hook `useAuth.tsx`: estado `{ user, session, loading, signOut }`, escuta `supabase.auth.onAuthStateChange`. Faz prefetch de `MyWork` apos login.
- Rotas protegidas centralizadas em `App.tsx`.

**Tema e Aparencia:**
- `initThemeCustomization` em `src/components/settings/ThemeCustomizer.tsx` aplica tema antes do primeiro render.
- Cor primaria warm gold LFPro: `hsl(29 45% 71%)` (claro) / `hsl(29 50% 76%)` (escuro).
- Fontes: Jost (body) + Montserrat (headings).
- Dark mode via classe CSS, variaveis em `src/index.css`.

**Internacionalizacao:**
- Toda UI em pt-BR. Sem framework de i18n; strings hardcoded.
- `date-fns` com `locale: ptBR` para formatacao de datas.

**Atalhos de Teclado:**
- `src/hooks/useKeyboardShortcuts.ts` (global) + handlers locais em `Index.tsx` (Zen mode F11/Cmd+Shift+F, Ctrl+W, Ctrl+Tab).
- `src/components/UndoRedoKeyboardHandler.tsx` para Ctrl+Z / Ctrl+Shift+Z.
