# Estrutura do Codebase

**Data da Analise:** 2026-05-22

## Layout de Diretorios

```
hub-tarefas-lfpro/
├── src/
│   ├── main.tsx                # Bootstrap: createRoot + initThemeCustomization
│   ├── App.tsx                 # Router, providers globais, ProtectedRoute/AuthRoute
│   ├── App.css
│   ├── index.css               # Variaveis CSS, dark mode, tema LFPro
│   ├── vite-env.d.ts
│   │
│   ├── pages/                  # Componentes-raiz montados pelo Router
│   │   ├── Index.tsx           # Dashboard principal (board ativo + views)
│   │   ├── Home.tsx            # Landing/visao geral
│   │   ├── Auth.tsx            # Login / signup
│   │   ├── Settings.tsx        # /settings/*
│   │   ├── MyWork.tsx          # Items do usuario cross-board
│   │   ├── TeamWork.tsx        # Items do time
│   │   ├── SharedBoard.tsx     # /shared/:token (publico)
│   │   ├── PublicForm.tsx      # /form/:slug (publico)
│   │   └── NotFound.tsx
│   │
│   ├── context/                # Contexts especializados (UI global)
│   │   ├── AppContext.tsx      # Agregador: AppProvider + useApp
│   │   ├── UIContext.tsx       # activeBoardId/View, selectedItem, navStack, zenMode
│   │   ├── FilterContext.tsx   # searchQuery, advancedFilter, sort, hiddenColumns
│   │   ├── BoardContext.tsx    # Dados normalizados (boards, groups, columns, items)
│   │   ├── TabContext.tsx      # Multi-aba de boards (Ctrl+Tab)
│   │   ├── SelectionContext.tsx # Selecao multipla para batch actions
│   │   ├── UndoRedoContext.tsx # Historico de acoes (Ctrl+Z/Y)
│   │   └── DashboardFilterContext.tsx
│   │
│   ├── hooks/                  # 35 hooks customizados
│   │   ├── useSupabaseData.ts  # 26 hooks de leitura (React Query)
│   │   ├── useCrudMutations.ts # 28 hooks de mutacao
│   │   ├── useRealtimeSync.ts  # Canal workspace-sync + invalidacao de cache
│   │   ├── useAuth.tsx         # Sessao Supabase + prefetch
│   │   ├── usePermissions.ts   # Roles por board (admin/editor/member/viewer)
│   │   ├── useAutomationEngine.ts # Motor de automacoes (fire-and-forget)
│   │   ├── useAutomations.ts
│   │   ├── useAutomationRecipes.ts
│   │   ├── useNotifications.ts
│   │   ├── useReactions.ts
│   │   ├── useTrash.ts
│   │   ├── useTemplates.ts
│   │   ├── useTeams.ts
│   │   ├── useBoardForms.ts
│   │   ├── useBoardShares.ts
│   │   ├── useBoardViews.ts
│   │   ├── useBoardItemCounts.ts
│   │   ├── useDashboardWidgets.ts
│   │   ├── useDependencies.ts
│   │   ├── useItemConnections.ts
│   │   ├── useIntegrations.ts
│   │   ├── useFileUpload.ts
│   │   ├── useActivityLog.ts
│   │   ├── useAuditLog.ts
│   │   ├── useMyWorkItems.ts
│   │   ├── useUserPreferences.ts
│   │   ├── useWorkspaceFolders.ts
│   │   ├── useRecentBoards.ts
│   │   ├── useCustomRoles.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── usePreloadTabs.ts
│   │   ├── usePresence.ts
│   │   ├── useUndoRedo.ts
│   │   ├── use-toast.ts
│   │   └── use-mobile.tsx
│   │
│   ├── components/
│   │   ├── AppSidebar.tsx
│   │   ├── TopNavBar.tsx
│   │   ├── NavLink.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── GlobalSearch.tsx
│   │   ├── UndoRedoKeyboardHandler.tsx
│   │   │
│   │   ├── board/              # 50+ componentes do board (ver detalhe abaixo)
│   │   │   ├── BoardTable.tsx
│   │   │   ├── BoardKanban.tsx
│   │   │   ├── BoardCalendar.tsx
│   │   │   ├── BoardTimeline.tsx
│   │   │   ├── BoardCards.tsx
│   │   │   ├── BoardDashboard.tsx
│   │   │   ├── BoardHeader.tsx
│   │   │   ├── BoardPermissionsPanel.tsx
│   │   │   ├── ItemDetailPanel.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   ├── AuditLogModal.tsx
│   │   │   ├── BatchActionsBar.tsx
│   │   │   ├── ConditionalColorRules.tsx
│   │   │   ├── DependencyManager.tsx
│   │   │   ├── DuplicateBoardDialog.tsx
│   │   │   ├── EmojiReactions.tsx
│   │   │   ├── FilterBuilder.tsx
│   │   │   ├── QuickColumnFilter.tsx
│   │   │   ├── GroupBySelector.tsx
│   │   │   ├── GroupFooter.tsx
│   │   │   ├── IntegrationsPanel.tsx
│   │   │   ├── SavingIndicator.tsx
│   │   │   ├── ShareBoardDialog.tsx
│   │   │   ├── TabBar.tsx
│   │   │   ├── TabBridge.tsx
│   │   │   ├── TimeScrollPicker.tsx
│   │   │   ├── TimeTrackingDetailModal.tsx
│   │   │   ├── ViewSelector.tsx
│   │   │   ├── ZenMode.tsx
│   │   │   ├── *Cell.tsx        # 25 cells, uma por ColumnType
│   │   │   ├── table/           # Subview tabela
│   │   │   │   ├── renderCellByType.tsx
│   │   │   │   ├── TableGroupSection.tsx
│   │   │   │   ├── TableItemRow.tsx
│   │   │   │   ├── SubitemRow.tsx
│   │   │   │   ├── DragOverlayRow.tsx
│   │   │   │   └── useColumnResize.ts
│   │   │   ├── kanban/          # Subview kanban
│   │   │   │   ├── DroppableKanbanColumn.tsx
│   │   │   │   ├── KanbanCard.tsx
│   │   │   │   ├── KanbanColumnHeader.tsx
│   │   │   │   ├── KanbanToolbar.tsx
│   │   │   │   ├── kanbanHelpers.ts
│   │   │   │   ├── kanbanStyles.ts
│   │   │   │   └── KanbanTypes.ts
│   │   │   └── widgets/         # Widgets do dashboard
│   │   │       ├── WidgetContainer.tsx
│   │   │       ├── WidgetRenderer.tsx
│   │   │       ├── WidgetConfigPanel.tsx
│   │   │       ├── WidgetFilterBuilder.tsx
│   │   │       ├── ActivityWidget.tsx
│   │   │       ├── ChartTypeSelector.tsx
│   │   │       ├── MetricSelector.tsx
│   │   │       ├── NumbersWidget.tsx
│   │   │       ├── ProgressWidget.tsx
│   │   │       ├── TableWidget.tsx
│   │   │       └── TextWidget.tsx
│   │   │
│   │   ├── modals/             # Modais Create*Modal.tsx
│   │   │   ├── CreateWorkspaceModal.tsx
│   │   │   ├── CreateBoardModal.tsx
│   │   │   ├── CreateGroupModal.tsx
│   │   │   ├── CreateColumnModal.tsx
│   │   │   └── EditColumnModal.tsx
│   │   │
│   │   ├── ui/                 # shadcn-ui primitivos (50+)
│   │   │   ├── button.tsx, dialog.tsx, popover.tsx, dropdown-menu.tsx, ...
│   │   │
│   │   ├── auth/
│   │   │   ├── ForgotPassword.tsx
│   │   │   └── UserProfile.tsx
│   │   │
│   │   ├── forms/
│   │   │   └── FormBuilder.tsx
│   │   │
│   │   ├── automations/
│   │   │   ├── AutomationBuilder.tsx
│   │   │   ├── AutomationList.tsx
│   │   │   ├── AutomationLogs.tsx
│   │   │   ├── AutomationRecipes.tsx
│   │   │   └── ConditionBuilder.tsx
│   │   │
│   │   ├── dnd/
│   │   │   ├── DndProvider.tsx
│   │   │   └── SortableItem.tsx
│   │   │
│   │   ├── import/
│   │   │   ├── ImportModal.tsx
│   │   │   └── ColumnMapper.tsx
│   │   │
│   │   ├── notifications/
│   │   │   └── NotificationBell.tsx
│   │   │
│   │   ├── onboarding/
│   │   │   └── OnboardingChecklist.tsx
│   │   │
│   │   ├── settings/
│   │   │   ├── AdminSettings.tsx
│   │   │   ├── AppearanceSettings.tsx
│   │   │   ├── AuditLogPanel.tsx
│   │   │   ├── BoardSettings.tsx
│   │   │   ├── BrandingSettings.tsx
│   │   │   ├── CustomRolesPanel.tsx
│   │   │   ├── NotificationSettings.tsx
│   │   │   ├── PasswordPolicyPanel.tsx
│   │   │   ├── ProfileSettings.tsx
│   │   │   ├── SessionManagement.tsx
│   │   │   ├── ShortcutSettings.tsx
│   │   │   └── ThemeCustomizer.tsx
│   │   │
│   │   ├── shared/             # Reusaveis cross-feature
│   │   │   ├── EmojiColorPicker.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── FilePreview.tsx
│   │   │   ├── HighlightText.tsx
│   │   │   ├── LoadingScreen.tsx
│   │   │   ├── MentionInput.tsx
│   │   │   ├── PermissionGate.tsx
│   │   │   ├── RichTextEditor.tsx
│   │   │   └── SkipLink.tsx
│   │   │
│   │   ├── templates/
│   │   │   └── TemplateCenter.tsx
│   │   │
│   │   ├── work/               # Componentes de MyWork/TeamWork
│   │   │   ├── WorkColumnSelector.tsx
│   │   │   └── WorkExtraCell.tsx
│   │   │
│   │   └── workspace/
│   │       ├── InviteModal.tsx
│   │       ├── MemberManager.tsx
│   │       ├── TeamsManager.tsx
│   │       ├── TrashDrawer.tsx
│   │       ├── WebhookManager.tsx
│   │       ├── WorkspaceFolders.tsx
│   │       ├── WorkspaceMemberManager.tsx
│   │       ├── WorkspaceOverview.tsx
│   │       └── WorkspaceSettings.tsx
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts       # supabase singleton (createClient)
│   │       └── types.ts        # Tipos gerados do schema (Database)
│   │
│   ├── types/
│   │   └── board.ts            # Workspace, Board, Group, Column, Item, ColumnType...
│   │
│   ├── utils/
│   │   ├── applyTemplate.ts
│   │   ├── exportCsv.ts
│   │   ├── filterToPostgrest.ts # FilterGroup -> PostgREST query
│   │   ├── formatActivityAction.ts
│   │   ├── formulaParser.ts
│   │   ├── groupBy.ts
│   │   ├── hashUtils.ts
│   │   ├── importData.ts
│   │   └── parseColumnValue.ts
│   │
│   ├── lib/
│   │   └── utils.ts            # cn() helper (clsx + tailwind-merge)
│   │
│   ├── data/
│   │   └── boardTemplates.ts   # Templates iniciais hardcoded
│   │
│   └── test/                   # Testes Vitest
│       ├── setup.ts
│       ├── example.test.ts
│       ├── filter.test.ts
│       ├── tab-context.test.ts
│       ├── utils.test.ts
│       ├── work-components.test.ts
│       └── dateTimeSupport.test.ts
│
├── supabase/
│   ├── migrations/             # 31 migrations SQL versionadas (yyyymmdd...sql)
│   ├── functions/              # 5 Edge Functions
│   │   ├── check-user-active/
│   │   ├── invite-user/
│   │   ├── list-sessions/
│   │   ├── send-slack-notification/
│   │   └── submit-form/
│   ├── config.toml
│   └── .temp/
│
├── public/                     # Assets estaticos
├── docs/                       # Documentacao adicional
├── .plano/                     # UP framework (PROJECT.md, codebase/, config.json)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── components.json             # shadcn-ui config
├── eslint.config.js
├── vitest.config.ts
├── playwright.config.ts
├── vercel.json
├── Dockerfile
├── CLAUDE.md
└── README.md
```

## Propositos dos Diretorios

**`src/pages/`:**
- Proposito: Componentes-raiz montados pelo React Router (1 por rota).
- Contem: Apenas componentes-pagina, sem logica reutilizavel.
- Arquivos chave: `Index.tsx` (dashboard principal, 4 rotas), `Auth.tsx`, `Settings.tsx`, `MyWork.tsx`, `TeamWork.tsx`, `SharedBoard.tsx`, `PublicForm.tsx`.

**`src/context/`:**
- Proposito: Estado de UI global dividido por dominio (UI, Filter, Board, Tab, Selection, UndoRedo, Dashboard).
- Contem: 1 arquivo por Context. Cada um exporta `<Nome>Provider` + `use<Nome>` hook.
- Arquivo agregador: `AppContext.tsx` (compatibilidade com codigo antigo via `useApp()`).

**`src/hooks/`:**
- Proposito: Toda logica de dados, mutacoes, realtime, automacao, permissoes, presence, undo/redo, etc.
- Contem: 35 hooks customizados. Dois "mega-hooks" carregam quase tudo do dominio: `useSupabaseData.ts` (leituras) e `useCrudMutations.ts` (mutacoes).
- Convencao de nome: `use<Algo>.ts` (TypeScript puro) ou `use<Algo>.tsx` se renderiza JSX (`useAuth.tsx`).

**`src/components/`:**
- Proposito: Apresentacao e interacao. Subdividido por feature/dominio.
- Subpastas (15): `board/`, `modals/`, `ui/`, `auth/`, `forms/`, `automations/`, `dnd/`, `import/`, `notifications/`, `onboarding/`, `settings/`, `shared/`, `templates/`, `work/`, `workspace/`.
- Componentes nao-categorizados ficam em `src/components/` (ex.: `AppSidebar.tsx`, `TopNavBar.tsx`, `CommandPalette.tsx`, `GlobalSearch.tsx`).

**`src/components/board/`:**
- Proposito: Tudo relacionado a board (views, headers, cells, painel de detalhes).
- Contem: ~55 arquivos diretos + 3 subpastas (`table/`, `kanban/`, `widgets/`).
- Arquivos chave: `BoardTable.tsx`, `BoardKanban.tsx`, `BoardCalendar.tsx`, `BoardTimeline.tsx`, `BoardCards.tsx`, `BoardDashboard.tsx`, `ItemDetailPanel.tsx`, `FilterBuilder.tsx`.
- 25 Cell components (`*Cell.tsx`), um por `ColumnType` definido em `src/types/board.ts`.

**`src/components/modals/`:**
- Proposito: Modais de criacao reutilizaveis.
- Convencao de nome: `Create<Entidade>Modal.tsx` ou `Edit<Entidade>Modal.tsx`.
- Existentes: `CreateWorkspaceModal.tsx`, `CreateBoardModal.tsx`, `CreateGroupModal.tsx`, `CreateColumnModal.tsx`, `EditColumnModal.tsx`. Modais especificos de feature (ex.: `DuplicateBoardDialog.tsx`, `ImportModal.tsx`) ficam dentro da pasta da feature.

**`src/components/ui/`:**
- Proposito: Primitivos shadcn-ui (Radix-based). Nao customizar diretamente sem necessidade.
- Contem: ~50 componentes (button, dialog, popover, dropdown-menu, command, form, calendar, etc.).
- Adicionado via CLI shadcn (`components.json` na raiz). Modificacoes ad-hoc sao toleradas mas evitar.

**`src/components/shared/`:**
- Proposito: Componentes reusaveis cross-feature (boundary, gates, pickers, editors).
- Arquivos chave: `ErrorBoundary.tsx`, `PermissionGate.tsx`, `RichTextEditor.tsx` (TipTap), `MentionInput.tsx`, `LoadingScreen.tsx`.

**`src/components/automations/`:**
- Proposito: UI do motor de automacoes (builder visual, recipes, logs).
- Engine de execucao em `src/hooks/useAutomationEngine.ts`.

**`src/integrations/supabase/`:**
- Proposito: Cliente Supabase tipado + tipos gerados.
- Arquivos: `client.ts` (singleton com persistencia em localStorage), `types.ts` (auto-gerado).
- Importar como `import { supabase } from '@/integrations/supabase/client'`.

**`src/types/`:**
- Proposito: Tipos de dominio (apenas `board.ts`).
- Conteudo: interfaces (`Workspace`, `Board`, `Group`, `Column`, `Item`, `SubItem`, `ColumnSettings`, `ColumnValue`, `Update`, `BoardPermission`, `BoardTemplate`), union types (`ColumnType`, `UserRole`), value types por coluna, `ColumnTypeValueMap` (mapeamento ColumnType -> tipo de valor).

**`src/utils/`:**
- Proposito: Funcoes puras, sem React, sem side-effects de UI.
- Arquivos: 9 utilitarios (CSV export, filter -> PostgREST, formula parser, groupBy, hash, import, etc.).

**`src/lib/`:**
- Proposito: Helpers de UI minimos (vem do template shadcn).
- Contem: `utils.ts` com `cn()` (`clsx` + `tailwind-merge`).

**`src/data/`:**
- Proposito: Dados estaticos versionados (templates de board).
- Apenas `boardTemplates.ts`.

**`src/test/`:**
- Proposito: Testes Vitest co-localizados aqui (nao espalhados).
- Setup: `setup.ts` registrado em `vitest.config.ts`.

**`supabase/migrations/`:**
- Proposito: Schema versionado. 31 migrations.
- Convencao: `YYYYMMDDHHMMSS_<descricao>.sql` (timestamp + slug em snake_case).

**`supabase/functions/`:**
- Proposito: Edge Functions Deno (5 functions: check-user-active, invite-user, list-sessions, send-slack-notification, submit-form).

## Localizacoes Chave

**Entry Points:**
- `src/main.tsx`: Bootstrap (createRoot + init de tema).
- `src/App.tsx`: Router + providers globais (QueryClient, Tooltip, Toasters, BrowserRouter, AppProvider).

**Configuracao:**
- `vite.config.ts`: Vite + alias `@` -> `./src` + porta 8080.
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`: TS config.
- `tailwind.config.ts`: Tema (cor primaria warm gold, fontes Jost + Montserrat).
- `components.json`: shadcn-ui config.
- `eslint.config.js`: ESLint flat config.
- `vitest.config.ts`: Vitest + jsdom + setup.ts.
- `playwright.config.ts`: E2E (config presente).
- `vercel.json` + `Dockerfile`: Deploy.
- `supabase/config.toml`: Supabase local config.

**Logica Core:**
- `src/hooks/useSupabaseData.ts`: Todas as leituras de dados.
- `src/hooks/useCrudMutations.ts`: Todas as mutacoes (cria/edita/deleta/move/duplicate).
- `src/hooks/useRealtimeSync.ts`: Subscription Realtime + invalidacao.
- `src/hooks/useAutomationEngine.ts`: Motor de execucao de automacoes.
- `src/hooks/usePermissions.ts`: Roles de board.
- `src/context/BoardContext.tsx`: Estado central do board ativo.
- `src/integrations/supabase/client.ts`: Cliente Supabase tipado.

## Onde Adicionar Novo Codigo

**Nova pagina/rota:**
- Componente: `src/pages/<Nome>.tsx`.
- Registrar em `src/App.tsx` (lazy import + `<Route>`).
- Decidir se rota e publica (`App.tsx:62-65`) ou protegida (`ProtectedApp` em `App.tsx:41-52`).

**Novo tipo de coluna:**
1. Adicionar a string ao union `ColumnType` em `src/types/board.ts:50-56`.
2. Adicionar entrada em `ColumnTypeValueMap` em `src/types/board.ts:157-184` com o tipo de valor.
3. Criar `<Tipo>Cell.tsx` em `src/components/board/`.
4. Adicionar `case` no switch de `src/components/board/table/renderCellByType.tsx`.
5. Suporte em Kanban: ajustar `src/components/board/kanban/KanbanCard.tsx`.
6. Migration se houver novo metadado (provavelmente nao — column_values e JSON flexivel).

**Novo hook de dados (leitura):**
- Adicionar funcao em `src/hooks/useSupabaseData.ts` seguindo padrao `useQuery({ queryKey, queryFn, staleTime, enabled })`.
- Se invalidacao Realtime for relevante, adicionar listener em `src/hooks/useRealtimeSync.ts`.

**Novo hook de mutacao:**
- Adicionar em `src/hooks/useCrudMutations.ts` seguindo padrao `useMutation({ mutationFn, onSuccess: () => qc.invalidateQueries(...) })`.
- Para acoes desfaziveis, integrar com `UndoRedoContext` (ver hooks existentes como `useDeleteItem` para o padrao).
- Para acoes que disparam automacoes, chamar `executeAutomations({ ... })` apos sucesso.

**Novo modal de criacao:**
- Arquivo: `src/components/modals/Create<Entidade>Modal.tsx`.
- Padrao: usar `Dialog` de `src/components/ui/dialog.tsx`, controlado por prop `open`/`onOpenChange`.

**Novo modal especifico de feature:**
- Colocar dentro da pasta da feature (ex.: `src/components/workspace/InviteModal.tsx`, `src/components/import/ImportModal.tsx`).

**Nova Edge Function:**
- Diretorio: `supabase/functions/<nome>/index.ts`.
- Deno runtime, padrao Supabase.

**Nova migration:**
- Arquivo: `supabase/migrations/YYYYMMDDHHMMSS_<descricao>.sql`.
- Manter timestamp crescente. Nao editar migrations ja aplicadas.

**Novo widget de dashboard:**
- Componente: `src/components/board/widgets/<Nome>Widget.tsx`.
- Registrar no renderer: `src/components/board/widgets/WidgetRenderer.tsx`.

**Nova tela de settings:**
- Componente: `src/components/settings/<Nome>Settings.tsx`.
- Adicionar route filho em `src/pages/Settings.tsx`.

**Novo Context:**
- Arquivo: `src/context/<Nome>Context.tsx`.
- Exportar `<Nome>Provider` e `use<Nome>` hook que lanca erro se usado fora do provider.
- Se for estado global, adicionar ao `AppProvider` em `src/context/AppContext.tsx:90-102` na ordem correta.

**Novo teste:**
- Arquivo: `src/test/<area>.test.ts(x)`.
- Setup global em `src/test/setup.ts`.

**Utilitario:**
- Helpers compartilhados: `src/utils/<nome>.ts` (funcoes puras).
- Helper de UI (shadcn-style): `src/lib/utils.ts`.

## Convencoes de Nomeacao

**Arquivos:**
- Componentes React: `PascalCase.tsx` (ex.: `BoardTable.tsx`, `StatusCell.tsx`).
- Hooks: `useCamelCase.ts(x)` (ex.: `useSupabaseData.ts`, `useAuth.tsx`).
- Utilitarios: `camelCase.ts` (ex.: `exportCsv.ts`, `filterToPostgrest.ts`).
- Contexts: `<Nome>Context.tsx` (ex.: `UIContext.tsx`).
- Tipos: `camelCase.ts` (`board.ts`).
- Migrations: `YYYYMMDDHHMMSS_snake_case_descricao.sql`.

**Padroes especificos:**
- Cells de coluna: `<Tipo>Cell.tsx` em `src/components/board/` (ex.: `StatusCell.tsx`, `PeopleCell.tsx`, `DateCell.tsx`).
- Modais de criacao: `Create<Entidade>Modal.tsx` em `src/components/modals/`.
- Modais de edicao: `Edit<Entidade>Modal.tsx` em `src/components/modals/`.
- Componentes de view: `Board<Vista>.tsx` (ex.: `BoardTable.tsx`, `BoardKanban.tsx`).
- Widgets: `<Nome>Widget.tsx` em `src/components/board/widgets/`.
- Panels: `<Nome>Panel.tsx` (ex.: `BoardPermissionsPanel.tsx`, `IntegrationsPanel.tsx`, `AuditLogPanel.tsx`).
- Settings: `<Area>Settings.tsx` (ex.: `AppearanceSettings.tsx`, `BoardSettings.tsx`).

**Path alias:**
- `@/*` -> `./src/*` (configurado em `tsconfig.json` e `vite.config.ts`).
- Sempre usar `@/...` para imports cross-folder. Imports relativos `./` apenas para arquivos na mesma pasta.

**Outras convencoes:**
- localStorage prefix: `lfpro-` (ex.: `lfpro-last-board-id`, `lfpro-sidebar-collapsed`).
- CustomEvent prefix: `lfpro-`.
- React Query `queryKey`: array com nome da entidade + parametros (ex.: `['items', boardId]`, `['column_values', boardId]`, `['board_permissions', boardId]`).
- Channels Supabase: nome descritivo em kebab-case (ex.: `workspace-sync`, `favorites-global`).
