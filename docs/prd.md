# EcoUP Hub — Brownfield Enhancement PRD

> **Documento gerado por:** Morgan (PM Agent) via AIOS *create-brownfield-prd
> **Última atualização:** 2026-02-17
> **Status:** Draft v1.0
> **Output file:** docs/prd.md

---

## Índice

1. [Análise e Contexto do Projeto](#1-análise-e-contexto-do-projeto)
2. [Requisitos](#2-requisitos)
3. [Interface do Usuário](#3-interface-do-usuário)
4. [Restrições Técnicas e Integração](#4-restrições-técnicas-e-integração)
5. [Estrutura de Épicos e Stories](#5-estrutura-de-épicos-e-stories)
6. [Épicos Detalhados](#6-épicos-detalhados)

---

## 1. Análise e Contexto do Projeto

### 1.1 Fonte da Análise

- **Tipo:** IDE-based fresh analysis + documentação técnica existente
- **Documentos consultados:**
  - `docs/architecture/system-architecture.md`
  - `docs/architecture/frontend-spec.md`
  - `docs/architecture/SCHEMA.md`
  - `docs/architecture/technical-debt-assessment.md`
  - `CLAUDE.md` (instruções do projeto)

### 1.2 Estado Atual do Projeto

O **EcoUP Hub** é uma aplicação web SPA de gerenciamento de projetos e tarefas colaborativa, inspirada no Monday.com, construída com React 18 + TypeScript + Vite + Supabase. Trata-se de uma ferramenta **proprietária** desenvolvida para uso interno de uma agência de marketing digital, com foco em gestão de tarefas, visibilidade de projetos, rastreamento de tempo e colaboração em equipe.

O produto está em fase de **MVP avançado**, com arquitetura multi-board, 4 visualizações de board, 21 tipos de coluna especializadas, autenticação, permissões, automações e formulários públicos já implementados ou em implementação.

### 1.3 Documentação Disponível

| Documento | Status |
|-----------|--------|
| Tech Stack Documentation | ✅ Disponível |
| Source Tree / Arquitetura | ✅ Disponível |
| Schema do Banco de Dados | ✅ Disponível |
| Technical Debt Assessment | ✅ Disponível |
| Frontend Spec | ✅ Disponível |
| PRD do Produto | ❌ **Este documento** |
| UX/UI Guidelines | ⚠️ Parcial (ux-improvement-report) |
| API Documentation | ❌ Não existe |

### 1.4 Tipo de Enhancement

- [x] Documentação do produto existente (Brownfield PRD como source of truth)
- [x] Definição de roadmap futuro por área de feature
- [ ] Bug fix isolado
- [ ] Integração pontual

**Impacto:** Mínimo no código (documento de produto), Alto no alinhamento estratégico da equipe.

### 1.5 Objetivos do Produto

- Substituir ferramentas externas de gestão de tarefas (Trello, Monday.com, Asana) por solução proprietária e personalizada
- Centralizar o fluxo de trabalho da agência de marketing digital em uma única plataforma
- Proporcionar visibilidade em tempo real do andamento de projetos e tarefas para toda a equipe
- Automatizar processos repetitivos do workflow da agência via regras de automação
- Permitir coleta de dados de clientes externos via formulários públicos integrados ao board

### 1.6 Contexto de Negócio

O EcoUP Hub nasce da necessidade da agência de marketing digital de ter uma ferramenta de gestão de tarefas totalmente sob controle da equipe — sem dependência de fornecedores externos, sem limites de usuários por plano e com personalização completa do workflow. O produto é construído especificamente para o contexto de agências criativas, onde projetos simultâneos, prazos curtos e colaboração multi-departamento são a norma.

A escolha de construir internamente (em vez de usar Monday.com ou Asana) permite adaptar campos, automações e visualizações ao vocabulário e ao processo único da agência, além de eliminar custos recorrentes de SaaS à medida que o time cresce.

### 1.7 Change Log

| Versão | Data | Descrição | Autor |
|--------|------|-----------|-------|
| 1.0 | 2026-02-17 | Documento inicial gerado via AIOS PM Agent | Morgan |

---

## 2. Requisitos

### 2.1 Requisitos Funcionais (FR)

- **FR1:** O sistema deve permitir que usuários se autentiquem com e-mail e senha via Supabase Auth.
- **FR2:** Novos usuários devem receber automaticamente um workspace e board padrão com colunas iniciais (Status, Pessoas, Data) ao criar conta.
- **FR3:** O sistema deve suportar múltiplos workspaces por usuário, com hierarquia estrita: Workspace → Board → Group → Item → SubItem.
- **FR4:** Boards devem suportar 21 tipos de coluna: `text`, `status`, `date`, `people`, `link`, `time_tracking`, `number`, `dropdown`, `checkbox`, `long_text`, `timeline`, `file`, `email`, `phone`, `rating`, `tags`, `progress`, `auto_number`, `creation_log`, `last_updated`, `formula`.
- **FR5:** O sistema deve oferecer 4 visualizações por board: Tabela, Kanban, Timeline e Dashboard, selecionáveis via BoardHeader.
- **FR6:** Colaboradores devem poder editar valores de células inline, com salvamento automático (optimistic update) e rollback em caso de erro.
- **FR7:** O sistema deve sincronizar dados em tempo real entre múltiplos usuários via Supabase Realtime, sem necessidade de refresh manual.
- **FR8:** Usuários administradores devem poder criar automações configuráveis por board, compostas por trigger, condição opcional e ação.
- **FR9:** Boards devem poder ser compartilhados via link público com token único, opcionalmente protegidos por senha e com data de expiração.
- **FR10:** O sistema deve suportar formulários públicos (sem autenticação) para coleta de dados externos que alimentam itens no board.
- **FR11:** Itens devem suportar: subitens aninhados, comentários/updates com threads, rastreamento de tempo (start/stop timer), e dependências entre itens.
- **FR12:** O sistema deve oferecer busca global via Command Palette (Ctrl+K) e busca inline na sidebar.
- **FR13:** Usuários devem poder favoritar boards e acessá-los rapidamente na seção "Favoritos" da sidebar.
- **FR14:** O sistema deve ter undo/redo global para operações realizadas no board.
- **FR15:** Boards devem suportar filtros avançados combinando múltiplas colunas com operadores lógicos AND/OR e salvamento de views filtradas.
- **FR16:** O sistema deve manter log de atividades e auditoria por item e por board, registrando quem fez o quê e quando.
- **FR17:** A interface deve ser personalizável por usuário: 8 cores primárias predefinidas e 3 níveis de densidade (compact, normal, spacious), persistidos no localStorage.
- **FR18:** Usuários devem poder importar dados para boards via arquivos CSV, com mapeamento de colunas.
- **FR19:** O sistema deve oferecer templates de board predefinidos para início rápido de novos projetos.
- **FR20:** O sistema deve ter lixeira com soft delete para boards e itens, permitindo restauração antes da exclusão definitiva.
- **FR21:** O sistema deve enviar notificações in-app para eventos relevantes: atribuição de tarefa, comentário, prazo próximo, automação disparada.
- **FR22:** Usuários devem poder reorganizar grupos, itens e colunas por drag-and-drop, com persistência imediata no banco.
- **FR23:** A view Kanban deve suportar WIP limits configuráveis por coluna de status e swimlanes agrupados por grupo do board.
- **FR24:** O sistema deve oferecer página "Meu Trabalho" consolidando todas as tarefas atribuídas ao usuário logado, agrupadas por data (atrasadas, hoje, esta semana, futuras, sem data).

### 2.2 Requisitos Não-Funcionais (NFR)

- **NFR1:** Toda a interface deve ser em Português Brasileiro (pt-BR); datas formatadas com `date-fns` + locale pt-BR.
- **NFR2:** O sistema deve ser uma SPA (Single Page Application) sem SSR; todo rendering ocorre no cliente.
- **NFR3:** O tempo de carregamento inicial (First Contentful Paint) deve ser inferior a 3 segundos em conexão de 10Mbps.
- **NFR4:** O banco de dados deve aplicar RLS (Row Level Security) no PostgreSQL para isolamento completo de dados entre usuários e workspaces.
- **NFR5:** Boards com até 500 itens devem renderizar e ser filtrados sem degradação perceptível (< 200ms de re-render).
- **NFR6:** A aplicação deve ser responsiva para telas desktop (mínimo 1024px de largura); mobile não é escopo atual.
- **NFR7:** Todas as mutações frequentes (editar célula, mover item) devem ter optimistic updates com rollback automático em caso de erro do servidor.
- **NFR8:** O código TypeScript deve rodar em modo strict; uso de `any` implícito é proibido.
- **NFR9:** Dark mode deve ser suportado via classe CSS, inicializado antes do React render para evitar FOUC (Flash of Unstyled Content).
- **NFR10:** O build de produção deve gerar chunks separados para: `vendor`, `supabase`, `radix`, `tanstack`, `lucide`, `date-fns` (code splitting por domínio).

### 2.3 Requisitos de Compatibilidade (CR)

- **CR1:** Toda nova feature deve manter compatibilidade com o schema EAV existente (`column_values.value` como JSONB flexível por tipo de coluna).
- **CR2:** Novas colunas no banco de dados devem ser adicionadas via migrações SQL em `supabase/migrations/`, sem alteração de dados existentes.
- **CR3:** Novos componentes de UI devem aderir ao design system existente: shadcn-ui + Tailwind CSS + CSS Custom Properties de densidade.
- **CR4:** Mudanças nas RLS policies devem ser testadas contra os 4 RPCs de segurança existentes: `can_access_board`, `can_access_item`, `has_role`, `is_workspace_member`.

---

## 3. Interface do Usuário

### 3.1 Integração com UI Existente

O EcoUP Hub usa **shadcn-ui (Radix UI)** como biblioteca base de componentes, estilizados com **Tailwind CSS 3** e CSS Custom Properties para runtime switching de temas e densidade. Todo novo componente deve:

- Utilizar primitivos Radix UI (Dialog, Popover, Select, etc.) em vez de criar equivalentes customizados
- Respeitar as variáveis de densidade CSS (ver seção abaixo)
- Suportar dark mode via classe `dark` no `<html>`
- Usar `lucide-react` exclusivamente para ícones
- Aplicar `tailwind-merge` + `class-variance-authority` para variantes

### 3.2 Telas e Views Existentes

| Rota | Componente | Auth | Descrição |
|------|-----------|------|-----------|
| `/` e `/board/:boardId` | `Index.tsx` | Sim | Dashboard principal: AppSidebar + BoardHeader + Board View ativa |
| `/auth` | `Auth.tsx` | Não | Login e registro de conta |
| `/my-work` | `MyWork.tsx` | Sim | Tarefas atribuídas ao usuário logado, agrupadas por data |
| `/form/:slug` | `PublicForm.tsx` | Não | Formulário público de coleta de dados |
| `/shared/:token` | `SharedBoard.tsx` | Não | Board compartilhado via link com token |

**Layout Principal:**
```
+------------------+------------------------------------------+
|                  |  TopNavBar (36px)                        |
|   AppSidebar     +------------------------------------------+
|   - Workspaces   |  BoardHeader                             |
|   - Boards       |  (título, views, filtros, ações)         |
|   - Favoritos    +------------------------------------------+
|   - Busca        |                                          |
|   - Meu Trabalho |  Board View Ativa                        |
|   - Config       |  (Table / Kanban / Timeline / Dashboard) |
|                  |                                          |
|                  +------------------------------------------+
|                  |  ItemDetailPanel (painel lateral)        |
+------------------+------------------------------------------+
```

### 3.3 Sistema de Densidade

```css
--density-row-h         /* Altura de linha principal */
--density-row-h-sub     /* Altura de linha de subitem */
--density-font-cell     /* Fonte de células */
--density-font-item     /* Fonte de nomes de itens */
--density-font-header   /* Fonte de cabeçalhos */
--density-font-tiny     /* Fonte pequena (labels) */
--density-font-badge    /* Fonte de badges */
--density-sidebar-font  /* Fonte da sidebar */
--density-icon          /* Tamanho de ícones */
--density-gap           /* Espaçamento padrão */
```

**Classes utilitárias:** `.density-row`, `.density-row-sub`, `.font-density-cell`, `.font-density-item`, `.font-density-header`, `.font-density-tiny`, `.font-density-badge`, `.font-density-sidebar`

### 3.4 Requisitos de Consistência Visual

- Toda nova célula de coluna deve ser implementada como `src/components/board/{Tipo}Cell.tsx`
- Toda nova modal deve usar `Dialog` do Radix UI e ficar em `src/components/modals/`
- Cores primárias disponíveis: Azul, Roxo `#5F3FFF`, Verde `#00C875`, Laranja, Rosa, Vermelho, Amarelo, Ciano
- Feedback de ações: `sonner` para toasts, `SavingIndicator` para salvamento, custom event `mutation-error` para erros

---

## 4. Restrições Técnicas e Integração

### 4.1 Stack Tecnológica Existente

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | React | 18 |
| Linguagem | TypeScript | 5.8 |
| Bundler | Vite | 5 |
| UI Components | shadcn-ui (Radix UI) | ~50 primitivos |
| Estilização | Tailwind CSS | 3 |
| Estado do Servidor | TanStack React Query | v5 |
| Estado Global | React Context (AppContext) | — |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime) | — |
| Roteamento | React Router | v6 |
| Drag & Drop | @dnd-kit/* | — |
| Gráficos | recharts | — |
| Command Palette | cmdk | — |
| Testes | Vitest + Testing Library | — |
| Testes E2E | Playwright | — |
| Fonte | Figtree (Google Fonts) | — |

### 4.2 Abordagem de Integração

| Camada | Estratégia |
|--------|-----------|
| **Database** | Supabase PostgREST para CRUD; EAV pattern via `column_values.value` (JSONB) |
| **Auth** | Supabase Auth (email/senha); RLS no PostgreSQL via 4 RPCs de segurança |
| **Realtime** | Supabase Realtime → invalida queries do React Query automaticamente |
| **Frontend State** | `AppContext` para estado de UI; React Query para server state com cache keys estruturadas |
| **Testing** | Vitest (unit/integration); Playwright (E2E) |
| **Build** | Vite com code splitting manual por domínio de dependência |

### 4.3 Organização do Código

| Aspecto | Padrão |
|---------|--------|
| File Structure | `src/components/board/*Cell.tsx` (células), `src/hooks/` (lógica), `src/pages/` (rotas), `src/components/modals/` (modais) |
| Naming | PascalCase (componentes), camelCase (funções/hooks), kebab-case (arquivos) |
| Path Alias | `@` → `./src` |
| Column Types | Definidos em `src/types/board.ts` |
| DB Types | Gerados em `src/integrations/supabase/types.ts` |
| Migrations | `supabase/migrations/` (arquivos .sql numerados por timestamp) |

### 4.4 Deploy e Operações

| Aspecto | Configuração |
|---------|-------------|
| Dev Server | `npm run dev` (porta 8080) |
| Build | `npm run build` (Vite, output em `dist/`) |
| Lint | `npm run lint` (ESLint) |
| Tests | `npm run test` (Vitest run) |
| Hosting | SPA estática (compatível com Vercel, Netlify, Cloudflare Pages) |
| Banco | Supabase Cloud (PostgreSQL gerenciado) |
| Monitoring | Não implementado (gap identificado) |
| CI/CD | Não configurado (gap identificado) |

### 4.5 Riscos e Mitigações

| Severidade | Risco | Mitigação Recomendada |
|-----------|-------|----------------------|
| **Crítica** | Filtragem 100% client-side — degrada com 1000+ itens | Server-side filtering via PostgREST + paginação (Epic 4, Story 4.1) |
| **Crítica** | Ausência de CASCADE DELETE — risco de dados órfãos | `ON DELETE CASCADE` nas FKs ou triggers no banco (Epic 4, Story 4.3) |
| **Alta** | AppContext como God Object — re-renders globais | Dividir em `BoardContext` + `FilterContext` + `UIContext` (Epic 4, Story 4.2) |
| **Alta** | Realtime apenas para board ativo — cache stale em outros boards | Subscriptions por workspace ou invalidação ao navegar (Epic 4) |
| **Média** | Ausência de Error Boundaries — erro crasha toda a app | Adicionar em pontos estratégicos: layout, board view, sidebar (Epic 4, Story 4.4) |
| **Média** | Tipos `any` em `ColumnValue.value` | Union types por tipo de coluna (Epic 4, Story 4.5) |
| **Baixa** | Mock data em `src/data/mockData.ts` pode vazar para produção | Mover para `__mocks__/` ou condicionar ao ambiente |

---

## 5. Estrutura de Épicos e Stories

### 5.1 Decisão de Estrutura

**Epic Structure:** Organização por Área de Feature (Opção A)

**Rationale:** A organização por área de feature permite delegação clara por especialidade de agente/desenvolvedor, facilita planejamento incremental e alinha com o modelo mental do produto (Core → Colaboração → Automação → Qualidade → Avançado).

### 5.2 Mapa de Épicos

| Épico | Área | Status |
|-------|------|--------|
| Epic 1 | Core Platform | ✅ Majoritariamente implementado |
| Epic 2 | Colaboração | ✅ Parcialmente implementado |
| Epic 3 | Automação & Forms | ⚠️ Infraestrutura de DB existe, UI parcial |
| Epic 4 | Performance & Qualidade | ❌ Pendente (débito técnico) |
| Epic 5 | Features Avançadas | ⚠️ Parcialmente implementado |

---

## 6. Épicos Detalhados

---

### Epic 1: Core Platform

**Epic Goal:** Prover a base completa do produto — autenticação, hierarquia de dados, CRUD completo e as 4 visualizações de board funcionais.

**Integration Requirements:** Toda feature de Core Platform deve manter compatibilidade com o schema EAV e o sistema de RLS do Supabase.

---

#### Story 1.1: Sistema de Autenticação e Onboarding Automático

> Como um novo colaborador da agência,
> Quero me registrar com e-mail e senha e já encontrar um workspace e board prontos,
> Para que eu possa começar a usar o sistema imediatamente sem configuração manual.

**Acceptance Criteria:**
1. Usuário pode se registrar com e-mail e senha
2. Usuário pode fazer login e logout
3. Rotas protegidas redirecionam para `/auth` se não autenticado
4. Ao criar conta, workspace + board + colunas padrão (Status, Pessoas, Data) são criados automaticamente
5. Perfil do usuário é criado na tabela `profiles`

**Integration Verification:**
- IV1: Login e logout funcionam sem quebrar o estado global
- IV2: Onboarding não duplica workspace se o usuário já possui um
- IV3: RLS policies validam acesso ao workspace recém-criado

---

#### Story 1.2: Gestão de Workspaces e Boards

> Como gestor da agência,
> Quero criar, editar, arquivar e organizar múltiplos workspaces e boards,
> Para que cada cliente ou projeto tenha seu espaço dedicado.

**Acceptance Criteria:**
1. Usuário pode criar workspaces com nome, ícone e cor
2. Usuário pode criar boards dentro de um workspace com nome e descrição
3. Boards podem ser arquivados (state: 'archived') e restaurados
4. Boards deletados vão para a lixeira (state: 'deleted') e podem ser restaurados
5. Sidebar exibe a hierarquia workspace → boards com busca inline
6. Favoritos permitem acesso rápido a boards frequentes

**Integration Verification:**
- IV1: Soft delete não afeta dados de items, grupos e colunas existentes
- IV2: Favorites sincronizam em tempo real entre sessões
- IV3: RLS garante que usuário só vê boards do seu workspace

---

#### Story 1.3: Grupos, Itens e Drag-and-Drop

> Como membro do time,
> Quero organizar tarefas em grupos temáticos e reordenar itens por prioridade arrastando,
> Para que o board reflita a realidade do projeto.

**Acceptance Criteria:**
1. Usuário pode criar, renomear, colorir e deletar grupos dentro de um board
2. Usuário pode criar, renomear e deletar itens dentro de grupos
3. Itens podem ser movidos entre grupos via drag-and-drop
4. Grupos podem ser reordenados via drag-and-drop
5. Colunas podem ser reordenadas via drag-and-drop
6. Posição é persistida via `float8` (Date.now()) sem necessidade de renumeração
7. Grupos podem ser colapsados para economizar espaço visual

**Integration Verification:**
- IV1: Reordenação não cria conflitos de posição (float8 com Date.now() é monotônico)
- IV2: Mover item entre grupos atualiza `group_id` sem perder column_values
- IV3: Deleção de grupo cascateia corretamente (via aplicação)

---

#### Story 1.4: Sistema de 21 Tipos de Coluna

> Como gestor,
> Quero adicionar colunas com tipos especializados ao meu board,
> Para que cada dado do projeto tenha o campo certo com a validação e UI adequada.

**Acceptance Criteria:**
1. Usuário pode adicionar coluna via modal com seleção de tipo
2. Usuário pode renomear, redimensionar e deletar colunas
3. Todos os 21 tipos de coluna são suportados: text, status, date, people, link, time_tracking, number, dropdown, checkbox, long_text, timeline, file, email, phone, rating, tags, progress, auto_number, creation_log, last_updated, formula
4. Colunas do tipo `status` e `dropdown` permitem customizar labels e cores via `column.settings`
5. Coluna `auto_number` gera sequencial automático por board
6. Coluna `formula` calcula resultado baseado em outras colunas

**Integration Verification:**
- IV1: Deletar coluna remove todos os `column_values` associados antes (cascade via aplicação)
- IV2: `column.settings` é preservado ao reordenar ou renomear coluna
- IV3: Novos tipos de coluna não quebram a renderização de células existentes

---

#### Story 1.5: View Tabela Editável

> Como membro do time,
> Quero visualizar e editar todas as tarefas do board em formato de tabela,
> Para ter uma visão completa e editável de todos os dados do projeto.

**Acceptance Criteria:**
1. Tabela exibe todos os grupos com seus itens e colunas
2. Células são editáveis inline com clique, exibindo o componente `*Cell.tsx` apropriado
3. Grupos são colapsáveis com indicador de contagem de itens
4. Linha de rodapé (GroupFooter) exibe agregações por coluna (soma, contagem, média)
5. Seleção múltipla de itens via checkbox com barra de ações em lote
6. Densidade da tabela é controlada pelas CSS Custom Properties

**Integration Verification:**
- IV1: Edição de célula com optimistic update não causa flicker visível
- IV2: GroupFooter recalcula agregações após edição de célula sem refresh
- IV3: Seleção múltipla não conflita com drag-and-drop de itens

---

#### Story 1.6: View Kanban

> Como membro do time,
> Quero visualizar tarefas em colunas Kanban agrupadas por status,
> Para acompanhar o fluxo de trabalho e arrastar tarefas entre etapas.

**Acceptance Criteria:**
1. Colunas Kanban são geradas a partir dos labels da coluna `status` do board
2. Cards exibem: nome do item, data, pessoas atribuídas e tags
3. Itens podem ser movidos entre colunas via drag-and-drop
4. WIP limits configuráveis por coluna com indicador visual quando excedido
5. Swimlanes agrupam cards por grupo do board
6. Toolbar com busca inline e seletor de agrupamento

**Integration Verification:**
- IV1: Mover card atualiza o `column_value` de status sem perder outros valores
- IV2: WIP limit não bloqueia arrastar, apenas alerta visualmente
- IV3: Swimlanes exibem corretamente quando board tem múltiplos grupos

---

#### Story 1.7: View Timeline

> Como gestor de projetos,
> Quero visualizar tarefas em linha do tempo horizontal,
> Para planejar prazos e identificar sobreposições entre entregas.

**Acceptance Criteria:**
1. Itens com coluna de data são exibidos como barras horizontais na linha do tempo
2. Escala temporal navegável (semanas, meses)
3. Barras podem ser arrastadas para alterar data
4. Agrupamento por grupo do board com identificação visual por cor
5. Items sem data não aparecem na view Timeline

**Integration Verification:**
- IV1: Alterar data via drag na Timeline atualiza `column_values` corretamente
- IV2: Timeline não quebra com boards sem coluna de data
- IV3: Navegação temporal não causa re-fetch desnecessário de dados

---

#### Story 1.8: View Dashboard com Widgets

> Como gestor,
> Quero configurar um dashboard com widgets de métricas do board,
> Para ter visão executiva do estado do projeto em um único lugar.

**Acceptance Criteria:**
1. Dashboard suporta widgets configuráveis com posição (x, y, w, h) persistida no banco
2. Widgets disponíveis: gráfico de barras, pizza, linha, contador, progresso
3. Usuário pode adicionar, remover e redimensionar widgets
4. Widgets se atualizam em tempo real com mudanças no board
5. Config de widget é salva em `dashboard_widgets.config` (JSONB)

**Integration Verification:**
- IV1: Dashboard funciona em boards sem dados (widgets mostram estado vazio)
- IV2: Widgets não causam queries N+1 ao carregar
- IV3: Redimensionar widget não afeta dados do board

---

### Epic 2: Colaboração

**Epic Goal:** Habilitar colaboração efetiva entre membros da equipe com sincronização em tempo real, comunicação por item e controle de acesso granular.

**Integration Requirements:** Features de colaboração dependem do Core Platform (Epic 1) e devem ser integradas ao fluxo de Realtime sem criar subscriptions duplicadas.

---

#### Story 2.1: Sincronização em Tempo Real

> Como membro do time,
> Quero ver as mudanças de outros colaboradores sem precisar atualizar a página,
> Para que o board esteja sempre atualizado durante sessões de trabalho colaborativo.

**Acceptance Criteria:**
1. Mudanças de qualquer usuário em itens, células, grupos e colunas se refletem em < 2 segundos para outros usuários
2. Supabase Realtime invalida automaticamente o cache do React Query nas entidades afetadas
3. Indicador visual de "salvando" durante mutações em progresso
4. Conflitos de edição simultânea são resolvidos pelo "último a salvar vence"

**Integration Verification:**
- IV1: Realtime funciona corretamente para o board ativo
- IV2: Navegar para outro board não deixa subscriptions órfãs
- IV3: Reconexão após queda de rede resincroniza dados automaticamente

---

#### Story 2.2: Comentários e Updates por Item

> Como membro do time,
> Quero comentar em itens e ver o histórico de atualizações,
> Para comunicar decisões e manter contexto no próprio item.

**Acceptance Criteria:**
1. ItemDetailPanel exibe seção de "Updates" com comentários ordenados por data
2. Usuário pode criar, editar e deletar seus próprios comentários
3. Comentários suportam texto rico e threads (respostas aninhadas)
4. Comentários podem ser fixados (is_pinned)
5. Notificação enviada a usuários mencionados em comentários

**Integration Verification:**
- IV1: Novos comentários aparecem em tempo real para todos que têm o item aberto
- IV2: Deletar item cascateia corretamente para seus updates
- IV3: Threads não ultrapassam 1 nível de aninhamento

---

#### Story 2.3: Sistema de Notificações

> Como membro do time,
> Quero receber notificações quando sou atribuído a uma tarefa ou mencionado em um comentário,
> Para não perder contexto importante do projeto.

**Acceptance Criteria:**
1. Notificações in-app para: atribuição de tarefa, comentário em item atribuído, menção em comentário, prazo próximo (< 24h), automação disparada
2. Centro de notificações acessível via ícone na TopNavBar com contador de não-lidas
3. Notificação marca como lida ao clicar e navegar para o item
4. Usuário pode marcar todas como lidas

**Integration Verification:**
- IV1: Notificações chegam em tempo real via Supabase Realtime
- IV2: Contador de não-lidas é correto ao navegar entre boards
- IV3: Notificações não são geradas para ações do próprio usuário

---

#### Story 2.4: Compartilhamento via Link Público

> Como gestor,
> Quero compartilhar um board com stakeholders externos sem dar acesso ao workspace,
> Para apresentar status de projetos sem comprometer a segurança dos dados internos.

**Acceptance Criteria:**
1. Usuário pode gerar link público de compartilhamento via ShareBoardDialog
2. Link pode ser protegido por senha (hash armazenado)
3. Link pode ter data de expiração configurável
4. Visitante do link vê board em modo leitura (sem edição)
5. Link pode ser desativado manualmente (is_active: false)

**Integration Verification:**
- IV1: Board compartilhado não expõe dados de outros boards do workspace
- IV2: RLS garante que token inválido ou expirado retorna 403
- IV3: Senha inválida não expõe dados parciais do board

---

#### Story 2.5: Permissões e Roles por Board

> Como administrador,
> Quero controlar quem pode editar, visualizar ou administrar cada board,
> Para que membros da agência tenham acesso adequado a cada projeto.

**Acceptance Criteria:**
1. Roles disponíveis: `admin`, `member`, `viewer`, `guest`
2. Permissões granulares por board via `board_permissions`
3. Admin de workspace pode gerenciar permissões de qualquer board
4. Viewer não pode criar/editar itens ou colunas
5. Guest só acessa boards para os quais foi explicitamente convidado

**Integration Verification:**
- IV1: RLS policies bloqueiam mutations de viewers e guests no banco
- IV2: UI omite botões de ação para usuários sem permissão
- IV3: Mudança de permissão tem efeito imediato sem necessidade de relogin

---

#### Story 2.6: Página "Meu Trabalho"

> Como membro do time,
> Quero ver todas as tarefas atribuídas a mim em um único lugar organizado por prazo,
> Para planejar meu dia sem precisar navegar board a board.

**Acceptance Criteria:**
1. Página exibe todos os itens com `people` column contendo o usuário logado, de todos os boards do workspace
2. Itens agrupados por: Atrasados, Hoje, Esta Semana, Próximas Semanas, Sem Data
3. Clicar em um item abre o ItemDetailPanel no contexto do board correto
4. Itens podem ser editados inline (status, data, etc.) sem navegar ao board
5. Contador de itens por seção exibido no cabeçalho de cada grupo

**Integration Verification:**
- IV1: Página atualiza em tempo real quando outro usuário atribui uma tarefa
- IV2: Itens de boards arquivados não aparecem na listagem
- IV3: ItemDetailPanel abre corretamente mesmo sem o board ativo na sidebar

---

### Epic 3: Automação & Forms

**Epic Goal:** Eliminar trabalho manual repetitivo com automações configuráveis e permitir coleta de dados externos via formulários públicos integrados ao board.

**Integration Requirements:** Automações dependem de triggers de eventos do banco (Supabase), compatíveis com o schema de `automations` e `automation_logs` já existentes.

---

#### Story 3.1: Engine de Automações

> Como gestor,
> Quero criar regras do tipo "quando X acontecer, se Y, então Z",
> Para automatizar notificações, mudanças de status e atribuições repetitivas.

**Acceptance Criteria:**
1. Interface de criação de automação com 3 blocos: Trigger, Condição (opcional), Ação
2. Triggers disponíveis: mudança de status, item criado, data chegou, usuário atribuído, coluna alterada
3. Ações disponíveis: mudar status, atribuir pessoa, enviar notificação, criar item, mover item para grupo
4. Automações podem ser ativadas e desativadas sem exclusão
5. Log de execução disponível em `automation_logs` por board

**Integration Verification:**
- IV1: Automação não entra em loop infinito (trigger → ação → trigger)
- IV2: Automações desativadas não são processadas
- IV3: Falha em uma automação não bloqueia outras automações do board

---

#### Story 3.2: Formulários Públicos de Coleta

> Como gestor,
> Quero criar um formulário público que alimenta o board com novos itens,
> Para receber pedidos de briefing de clientes diretamente na ferramenta.

**Acceptance Criteria:**
1. Usuário pode criar formulário público com título, descrição e seleção de campos do board
2. Formulário tem URL pública única via `/form/:slug`
3. Submissão cria novo item no board com os valores preenchidos
4. Formulário pode ser ativado e desativado (is_active)
5. Campos obrigatórios são validados antes da submissão

**Integration Verification:**
- IV1: Submissão não requer autenticação do visitante
- IV2: Item criado via formulário aparece em tempo real no board
- IV3: Slug único é validado na criação (sem colisão)

---

#### Story 3.3: Importação de Dados via CSV

> Como gestor,
> Quero importar uma planilha Excel/CSV existente como itens no board,
> Para migrar dados de ferramentas antigas sem retrabalho manual.

**Acceptance Criteria:**
1. Interface de importação aceita arquivos `.csv` e `.xlsx`
2. Mapeamento de colunas do arquivo para colunas do board via UI
3. Preview dos primeiros 5 itens antes de confirmar importação
4. Importação cria itens em lote no grupo selecionado
5. Relatório final com total importado e eventuais erros de linha

**Integration Verification:**
- IV1: Importação de 500+ itens não trava a UI (processamento em chunks)
- IV2: Valores de tipo `status` e `people` são mapeados corretamente ou ignorados
- IV3: Importação pode ser cancelada antes de confirmar

---

#### Story 3.4: Templates de Board

> Como membro do time,
> Quero criar um novo board a partir de um template pré-configurado,
> Para acelerar o início de projetos recorrentes da agência (ex: "Gestão de Campanha").

**Acceptance Criteria:**
1. Tela de criação de board oferece galeria de templates
2. Templates incluem: grupos pré-definidos, colunas com tipos e labels configurados, itens de exemplo
3. Usuário pode salvar um board existente como template
4. Templates personalizados da agência ficam disponíveis apenas no workspace

**Integration Verification:**
- IV1: Aplicar template não altera outros boards existentes
- IV2: Template cria corretamente todos os `column_values` de exemplo
- IV3: Template pode ser aplicado em workspace diferente do original

---

### Epic 4: Performance & Qualidade

**Epic Goal:** Resolver a dívida técnica crítica identificada no `technical-debt-assessment.md` para garantir escalabilidade e confiabilidade do sistema à medida que o uso cresce.

**Integration Requirements:** Mudanças de Performance são de alto risco — cada story deve incluir testes de regressão para garantir que funcionalidades existentes permanecem intactas.

---

#### Story 4.1: Server-side Filtering e Paginação

> Como usuário de um board com 1000+ itens,
> Quero que filtros e ordenação sejam processados no servidor,
> Para que a aplicação permaneça rápida independente do volume de dados.

**Acceptance Criteria:**
1. Filtros e ordenação são traduzidos para parâmetros PostgREST e enviados ao servidor
2. Paginação carrega itens em páginas de 100 com infinite scroll ou paginação explícita
3. AppContext não mais carrega todos os itens do board na memória
4. Boards com 1000+ itens renderizam em < 500ms

**Integration Verification:**
- IV1: Filtros avançados (FilterGroup) funcionam idênticos à versão client-side
- IV2: Realtime continua funcionando com dados paginados
- IV3: GroupFooter recalcula agregações corretamente com paginação ativa

---

#### Story 4.2: Refatoração do AppContext

> Como desenvolvedor,
> Quero dividir o AppContext monolítico em contextos menores e especializados,
> Para reduzir re-renders desnecessários e melhorar a manutenibilidade do código.

**Acceptance Criteria:**
1. `AppContext` dividido em: `BoardContext` (board ativo), `FilterContext` (filtros/sort), `UIContext` (sidebar, painel, view ativa)
2. Componentes consomem apenas o contexto do qual dependem
3. Re-render de FilterContext não causa re-render de BoardContext
4. Onboarding extraído para hook dedicado `useOnboarding`

**Integration Verification:**
- IV1: Todas as views (Table, Kanban, Timeline, Dashboard) funcionam após refatoração
- IV2: ItemDetailPanel abre e fecha corretamente via UIContext
- IV3: Filtros aplicados persistem ao navegar entre boards

---

#### Story 4.3: CASCADE DELETE no Banco

> Como desenvolvedor,
> Quero que deleções de entidades pai removam automaticamente seus filhos no banco,
> Para garantir integridade de dados mesmo em caso de falha da aplicação.

**Acceptance Criteria:**
1. `ON DELETE CASCADE` adicionado nas FKs: boards → groups, groups → items, items → column_values, items → subitems, boards → columns
2. Migrations SQL criadas e testadas em ambiente de staging
3. Código de cascade manual removido do `useCrudMutations.ts`
4. Testes verificam que cascade funciona corretamente para cada entidade

**Integration Verification:**
- IV1: Deletar workspace não deixa boards órfãos
- IV2: Deletar board remove grupos, itens, colunas e column_values
- IV3: Soft delete (state: 'deleted') não aciona cascade (apenas hard delete)

---

#### Story 4.4: Error Boundaries

> Como usuário,
> Quero que um erro em uma parte da aplicação não quebre a tela inteira,
> Para poder continuar usando o resto do sistema enquanto o problema é investigado.

**Acceptance Criteria:**
1. Error Boundary adicionado em: layout principal, board view, sidebar, ItemDetailPanel
2. Tela de fallback informativa com opção de "Recarregar"
3. Erros capturados são logados com contexto (componente, props relevantes)
4. Error Boundary não interfere com o fluxo normal de renderização

**Integration Verification:**
- IV1: Erro em uma célula não crasha a tabela inteira
- IV2: Erro no ItemDetailPanel fecha o painel graciosamente
- IV3: Error Boundary reseta ao navegar para outro board

---

#### Story 4.5: Tipos TypeScript Fortes para ColumnValue

> Como desenvolvedor,
> Quero tipos TypeScript precisos para cada tipo de coluna,
> Para detectar bugs de tipo em tempo de compilação em vez de runtime.

**Acceptance Criteria:**
1. Union types criados para cada um dos 21 tipos: `StatusValue`, `DateValue`, `PeopleValue`, etc.
2. `ColumnValue.value` usa discriminated union baseado em `column.type`
3. Todos os `*Cell.tsx` tipados com o value type correto
4. Compilação TypeScript sem erros com `strict: true`

**Integration Verification:**
- IV1: Nenhuma regression nos 21 tipos de célula após tipagem
- IV2: `AppContext` exporta tipos corretos para consumidores
- IV3: CI valida `npm run typecheck` sem erros

---

### Epic 5: Features Avançadas

**Epic Goal:** Entregar capacidades avançadas de produtividade que diferenciam o EcoUP Hub de ferramentas simples de to-do list.

**Integration Requirements:** Features avançadas devem se integrar ao Core Platform sem aumentar o bundle size inicial (code splitting obrigatório).

---

#### Story 5.1: FormulaCell com Parser de Fórmulas

> Como analista,
> Quero criar colunas de fórmula que calculam valores baseados em outras colunas,
> Para automatizar cálculos como "Receita Total = Horas × Valor/hora".

**Acceptance Criteria:**
1. Coluna do tipo `formula` permite definir expressão matemática referenciando outras colunas por nome
2. Parser suporta: operadores aritméticos, funções SUM/AVG/COUNT/IF, referências a colunas numéricas
3. Resultado é recalculado automaticamente ao mudar colunas referenciadas
4. Erros de sintaxe exibem mensagem clara na célula

**Integration Verification:**
- IV1: FormulaCell não entra em loop se fórmula referencia a si mesma
- IV2: Renomear coluna referenciada exibe aviso de referência quebrada
- IV3: FormulaCell exibe `—` para itens sem valores nas colunas referenciadas

---

#### Story 5.2: Dependências entre Itens

> Como gestor de projeto,
> Quero marcar que uma tarefa depende de outra para ser iniciada,
> Para visualizar o caminho crítico do projeto e evitar bloqueios.

**Acceptance Criteria:**
1. Usuário pode criar dependências entre itens (blocks / depends_on / related)
2. Dependências são exibidas no ItemDetailPanel com link para o item relacionado
3. Item bloqueado exibe indicador visual na view Tabela
4. View Timeline exibe setas de dependência entre barras

**Integration Verification:**
- IV1: Dependência circular é detectada e bloqueada
- IV2: Deletar item remove automaticamente suas dependências
- IV3: Dependências funcionam entre items de boards diferentes (se no mesmo workspace)

---

#### Story 5.3: Log de Atividades e Auditoria

> Como gestor,
> Quero ver o histórico completo de mudanças em cada item,
> Para entender quem fez o quê e quando em caso de dúvida.

**Acceptance Criteria:**
1. ActivityFeed no ItemDetailPanel exibe todas as mudanças de column_values com valor anterior e novo
2. Log registra: criação do item, mudanças de célula, comentários, atribuições, movimentações
3. Atividades mostram nome do usuário, ação e timestamp relativo
4. Log de auditoria do board (visão macro) acessível ao admin

**Integration Verification:**
- IV1: Log não é gerado para mutations de automações (ou é marcado como tal)
- IV2: Tabela `activity_log` não cresce sem limite (estratégia de retenção necessária)
- IV3: Log respeita RLS — usuário só vê atividades de boards que acessa

---

#### Story 5.4: Undo/Redo Global

> Como usuário,
> Quero desfazer e refazer ações acidentais com Ctrl+Z / Ctrl+Y,
> Para corrigir erros rapidamente sem precisar reconstruir o que foi feito.

**Acceptance Criteria:**
1. Ctrl+Z desfaz última ação (edição de célula, mover item, criar item, deletar item)
2. Ctrl+Y / Ctrl+Shift+Z refaz ação desfeita
3. Histórico de até 50 operações
4. Undo/Redo limpa o histórico ao navegar para outro board

**Integration Verification:**
- IV1: Undo de edição de célula reverte o valor no banco corretamente
- IV2: Undo de deleção de item recria o item com todos os column_values
- IV3: Undo não funciona para ações de outros usuários (apenas do próprio)

---

#### Story 5.5: Command Palette (Ctrl+K)

> Como power user,
> Quero acessar qualquer board, item ou ação via atalho de teclado,
> Para navegar e executar ações sem usar o mouse.

**Acceptance Criteria:**
1. Ctrl+K abre CommandPalette com busca global
2. Busca retorna: boards, itens, grupos, ações de criar board/item
3. Resultado navega para o item ou executa a ação ao pressionar Enter
4. Esc fecha o palette sem ação
5. Busca usa `search_all` RPC do Supabase para resultados relevantes

**Integration Verification:**
- IV1: Resultados respeitam permissões (não exibe items de boards sem acesso)
- IV2: CommandPalette não causa re-render dos componentes abaixo
- IV3: Atalho Ctrl+K não conflita com atalhos do sistema operacional

---

#### Story 5.6: Integrações com Sistemas Externos

> Como gestor,
> Quero integrar o EcoUP Hub com ferramentas externas da agência (Slack, Google Calendar, etc.),
> Para centralizar notificações e sincronizar eventos sem duplicação de trabalho.

**Acceptance Criteria:**
1. Interface de configuração de integrações por board (Configurações do Board)
2. Integração com Slack: enviar notificação em canal quando status muda
3. Integração com Google Calendar: sincronizar itens com coluna de data
4. Integrações configuradas são armazenadas na tabela `integrations`
5. Cada integração pode ser ativada/desativada independentemente

**Integration Verification:**
- IV1: Falha em integração externa não impacta operação do board
- IV2: Credenciais de integração são armazenadas encriptadas
- IV3: Webhook de saída não é disparado em edições de automações (evitar loops)

---

## Apêndice

### A. Glossário

| Termo | Definição |
|-------|-----------|
| **Board** | Quadro de tarefas com grupos, itens e colunas configuráveis |
| **Group** | Agrupamento de itens dentro de um board (ex: "Em Andamento", "Concluído") |
| **Item** | Tarefa ou entidade de trabalho dentro de um grupo |
| **Column** | Campo de dado com tipo especializado (status, data, pessoas, etc.) |
| **ColumnValue** | Valor de uma célula: cruzamento de Item × Column, armazenado como JSONB |
| **SubItem** | Item filho aninhado dentro de um item pai |
| **Update** | Comentário ou anotação associado a um item |
| **Workspace** | Contêiner organizacional de nível mais alto, agrupa boards |
| **EAV** | Entity-Attribute-Value: pattern de banco onde valores de células são JSONB flexível |
| **RLS** | Row Level Security: política de segurança no nível de linha do PostgreSQL |
| **Soft Delete** | Deleção lógica via campo `state`, sem remoção física do registro |

### B. Arquivos-Chave do Codebase

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/context/AppContext.tsx` | Estado global de UI e computação do activeBoard |
| `src/hooks/useSupabaseData.ts` | Todas as queries de leitura |
| `src/hooks/useCrudMutations.ts` | Todas as mutations de escrita |
| `src/hooks/useRealtimeSync.ts` | Subscriptions Supabase Realtime |
| `src/types/board.ts` | Interfaces TypeScript do domínio |
| `src/components/board/BoardTable.tsx` | View Tabela (~750 linhas) |
| `src/components/board/BoardKanban.tsx` | View Kanban (~900 linhas) |
| `src/components/board/ItemDetailPanel.tsx` | Painel de detalhes do item |
| `src/integrations/supabase/types.ts` | Tipos gerados do schema Supabase |
| `supabase/migrations/` | Migrações SQL do banco de dados |
| `src/index.css` | Design tokens, densidade e tema |

### C. Links de Documentação Técnica

- [Arquitetura do Sistema](./architecture/system-architecture.md)
- [Especificação Frontend](./architecture/frontend-spec.md)
- [Schema do Banco de Dados](./architecture/SCHEMA.md)
- [Avaliação de Dívida Técnica](./architecture/technical-debt-assessment.md)
