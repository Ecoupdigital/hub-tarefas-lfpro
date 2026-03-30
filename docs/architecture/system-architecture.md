# EcoUP Hub - Arquitetura do Sistema

> Documento gerado para contexto de agentes AIOS. Ultima atualizacao: 2026-02-17

## Stack Tecnica

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Runtime | React | 18 |
| Linguagem | TypeScript | 5.8 |
| Bundler | Vite | 5 |
| UI Components | shadcn-ui (Radix UI) | ~50 primitivos |
| Estilizacao | Tailwind CSS | 3 |
| Estado do Servidor | TanStack React Query | v5 |
| Estado Global | React Context (AppContext) | - |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime) | - |
| Roteamento | React Router | v6 |
| Testes | Vitest + Testing Library | - |
| Fonte | Figtree (Google Fonts) | - |

## Arquitetura Geral

```
[Browser SPA]
    |
    +-- React Router v6 (lazy-loaded routes)
    |       |-- /auth           -> Auth.tsx
    |       |-- /               -> Index.tsx (ProtectedRoute + AppProvider)
    |       |-- /board/:boardId -> Index.tsx (ProtectedRoute + AppProvider)
    |       |-- /form/:slug     -> PublicForm.tsx (sem auth)
    |       |-- /shared/:token  -> SharedBoard.tsx (sem auth)
    |
    +-- AppContext (estado global de UI)
    |       |-- Board ativo, view ativa, filtros, ordenacao
    |       |-- Computa activeBoard via useMemo (join de todas as entidades)
    |       |-- Filtros e ordenacao sao CLIENT-SIDE
    |
    +-- React Query v5 (cache + mutations)
    |       |-- useSupabaseData.ts  (queries de leitura)
    |       |-- useCrudMutations.ts (mutations de escrita)
    |       |-- Optimistic updates em column_values e items
    |
    +-- Supabase Client
            |-- PostgREST (queries)
            |-- Realtime (subscricoes via useRealtimeSync)
            |-- Auth (email/senha)
```

## Fluxo de Dados

### Leitura
1. Hooks em `useSupabaseData.ts` fazem queries via Supabase PostgREST
2. React Query cacheia os resultados com query keys estruturadas (`[entidade, id?]`)
3. `AppContext.tsx` consome todos os hooks e computa `activeBoard` via `useMemo`
4. Componentes de view (Table, Kanban, etc.) consomem `activeBoard` do contexto

### Escrita
1. Mutations em `useCrudMutations.ts` e `useSupabaseData.ts`
2. Optimistic updates para `column_values` e `items` (rollback on error)
3. Evento DOM customizado `mutation-error` para feedback de erro na UI
4. React Query invalida cache automaticamente apos mutacao

### Realtime
1. `useRealtimeSync.ts` cria subscricoes Supabase Realtime
2. Quando dados mudam no banco, invalida queries do React Query
3. Realtime so funciona quando ha um board ativo

## Modelo de Dominio (Hierarquia)

```
Workspace
  └── Board
       ├── Group (com cor e posicao)
       │    └── Item (com posicao, columnValues como Record<string, ColumnValue>)
       │         └── SubItem (status, person, date)
       └── Column (tipo, largura, posicao, settings)
```

### 21 Tipos de Coluna
`text`, `status`, `date`, `people`, `link`, `time_tracking`, `number`, `dropdown`, `checkbox`, `long_text`, `timeline`, `file`, `email`, `phone`, `rating`, `tags`, `progress`, `auto_number`, `creation_log`, `last_updated`, `formula`

## Views de Board

| View | Componente | Descricao |
|------|-----------|-----------|
| Tabela | BoardTable.tsx | Tabela editavel com celulas especializadas |
| Kanban | BoardKanban.tsx | Colunas com cards arrastáveis |
| Timeline | BoardTimeline.tsx | Visualizacao temporal |
| Dashboard | BoardDashboard.tsx | Widgets e metricas |
| Calendario | (em BoardHeader) | Alternancia de view |

## Autenticacao

- Supabase Auth com email/senha
- `ProtectedRoute` bloqueia acesso a rotas autenticadas
- `AuthRoute` redireciona usuarios logados para `/`
- Hook `useAuth` gerencia sessao
- Rotas publicas: `/form/:slug` e `/shared/:token`

## Estrutura de Diretórios

```
src/
  pages/              # 6 paginas (Index, Auth, NotFound, Home, PublicForm, SharedBoard)
  context/            # AppContext, SelectionContext, UndoRedoContext
  hooks/              # 16 hooks customizados
  components/
    board/            # Views, celulas (16 *Cell.tsx), paineis, headers
    modals/           # CreateBoardModal, CreateColumnModal, etc.
    ui/               # ~50 primitivos shadcn-ui
    auth/             # Componentes de autenticacao
    settings/         # ThemeCustomizer
    shared/           # LoadingScreen, componentes compartilhados
    dnd/              # Drag and drop
    forms/            # Formularios
    import/           # Importacao de dados
    notifications/    # Sistema de notificacoes
    onboarding/       # Onboarding de novos usuarios
    workspace/        # Componentes de workspace
    automations/      # Regras de automacao
  types/board.ts      # Interfaces TypeScript do dominio
  integrations/supabase/  # Cliente e tipos gerados
  utils/              # formulaParser, importData, exportCsv
  data/               # boardTemplates, mockData
```

## Hooks Customizados

| Hook | Responsabilidade |
|------|-----------------|
| useSupabaseData | Todas as queries de leitura (workspaces, boards, groups, columns, items, etc.) |
| useCrudMutations | Todas as mutations de escrita (create, delete, duplicate, move) |
| useRealtimeSync | Subscricoes Realtime do Supabase |
| useAuth | Sessao e autenticacao |
| useActivityLog | Log de atividades |
| useAutomations | Regras de automacao |
| useBoardViews | Views salvas do board |
| useBoardForms | Formularios publicos |
| useBoardShares | Compartilhamento de boards |
| usePermissions | Permissoes de acesso |
| useNotifications | Sistema de notificacoes |
| useDependencies | Dependencias entre items |
| useIntegrations | Integracoes externas |
| useKeyboardShortcuts | Atalhos de teclado |
| useTrash | Lixeira (soft delete) |
| useUndoRedo | Desfazer/refazer |

## Build e Deploy

- **Dev server**: `npm run dev` (porta 8080)
- **Build**: `npm run build` (Vite com code splitting)
- **Chunks manuais**: vendor, supabase, radix, tanstack, lucide, date-fns
- **Path alias**: `@` → `./src`

## Sistema de Temas

- Cor primaria configuravel (8 presets, armazenada em localStorage)
- 3 niveis de densidade de interface (compact, normal, spacious)
- CSS Custom Properties para cores e densidade
- Dark mode via classe CSS
- Inicializacao em `main.tsx` antes do render

## Decisoes Arquiteturais

1. **SPA pura** - Sem SSR, todo rendering no cliente
2. **EAV pattern** - column_values armazena JSON flexivel por item/coluna
3. **Soft delete** - Boards e items nao sao deletados, usam campo `state`
4. **Client-side filtering** - Filtros e ordenacao computados no AppContext
5. **Optimistic updates** - Para operacoes frequentes (editar celula, mover item)
6. **Lazy loading** - Rotas carregadas sob demanda com React.lazy
7. **Onboarding automatico** - Novos usuarios recebem workspace + board default
8. **Posicao por float** - `Date.now()` como posicao, permite insert-between
