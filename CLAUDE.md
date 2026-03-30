# CLAUDE.md

## Visao Geral

**LFPro Tasks** e uma aplicacao web de gerenciamento de tarefas colaborativa para a LFPro, construida com React + TypeScript + Vite. Funciona como um workspace multi-board com visualizacoes em Tabela, Kanban e Calendario, com sincronizacao em tempo real via Supabase.

## Stack Tecnica

- **Frontend**: React 18, TypeScript 5.8, Vite 5
- **UI**: shadcn-ui (Radix UI) + Tailwind CSS 3
- **Estado do servidor**: TanStack React Query v5
- **Estado global**: React Context (AppContext)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Realtime)
- **Roteamento**: React Router v6
- **Testes**: Vitest + Testing Library

## Estrutura do Projeto

```
src/
  pages/           # Index (dashboard principal), Auth, NotFound
  context/         # AppContext - estado global (board ativo, filtros, UI)
  hooks/           # useAuth, useSupabaseData (queries), useCrudMutations, useRealtimeSync
  components/
    board/         # BoardTable, BoardKanban, BoardCalendar, BoardHeader, ItemDetailPanel
    board/*Cell.tsx # 20+ celulas especializadas (StatusCell, DateCell, PeopleCell, etc.)
    modals/        # Modais de criacao (Workspace, Board, Group, Column)
    ui/            # Componentes shadcn-ui (50+ primitivos)
  types/board.ts   # Interfaces TypeScript (Workspace, Board, Column, Item, etc.)
  integrations/supabase/  # Cliente Supabase e tipos gerados
  utils/           # exportCsv
  data/            # mockData (usuarios e colunas mock)
```

## Comandos Principais

```bash
npm run dev        # Servidor de desenvolvimento (porta 8080)
npm run build      # Build de producao
npm run test       # Executar testes (vitest run)
npm run test:watch # Testes em modo watch
npm run lint       # ESLint
```

## Arquitetura e Padroes

### Fluxo de Dados
1. **useSupabaseData.ts** - Hooks de leitura (useWorkspaces, useAllBoards, useGroups, useColumns, useItems, useColumnValues, useProfiles, useUpdates, useSubitems)
2. **useCrudMutations.ts** - Hooks de mutacao (create/delete/duplicate/move para cada entidade)
3. **useRealtimeSync.ts** - Subscricoes Realtime do Supabase que invalidam cache do React Query automaticamente
4. **AppContext.tsx** - Estado de UI (board ativo, view ativa, filtros, ordenacao, painel de detalhes)

### Autenticacao
- Supabase Auth com email/senha
- Rotas protegidas via `ProtectedRoute` e `AuthRoute` em App.tsx
- Hook `useAuth` gerencia sessao e logout

### Banco de Dados (Supabase)
Tabelas principais: `workspaces`, `boards`, `groups`, `columns`, `items`, `column_values`, `updates`, `profiles`, `favorites`, `workspace_members`, `user_roles`

RPC functions: `can_access_board`, `can_access_item`, `has_role`, `is_workspace_member`

### Tipos de Coluna
text, status, date, people, link, time_tracking, number, dropdown, checkbox, long_text, email, phone, rating, tags, progress, auto_number, creation_log, last_updated

### Estilos e Tema
- Cor primaria: `hsl(29 45% 71%)` (warm gold LFPro)
- Dark mode primary: `hsl(29 50% 76%)`
- Fontes: Jost (body) + Montserrat (headings)
- Dark mode via classe CSS
- Variaveis CSS customizadas no index.css

## Convencoes

- **Idioma da UI**: Todo texto visivel ao usuario e em Portugues Brasileiro (pt-BR)
- **Path alias**: `@` mapeia para `./src`
- **Valores de celula**: Armazenados como JSON flexivel em `column_values`
- **Soft delete**: Boards usam campo `state` (nao sao deletados de fato)
- **Onboarding**: Novos usuarios recebem workspace e board automaticamente com colunas iniciais (Status, People, Date)
- **Formatacao de datas**: Usa `date-fns` com locale `pt-BR`
- **localStorage prefix**: `lfpro-` para todas as chaves
- **CustomEvent prefix**: `lfpro-` para todos os eventos customizados

## Notas Importantes

- Migracoes SQL ficam em `supabase/` (quando existem)
- Componentes de celula ficam em `src/components/board/` com sufixo `Cell.tsx`
- Modais de criacao ficam em `src/components/modals/`
- Nao ha SSR - e uma SPA pura
