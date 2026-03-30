# EcoUP Hub - Especificacao Frontend

> Documento gerado para contexto de agentes AIOS. Ultima atualizacao: 2026-02-17

## Componentes Principais

### Paginas (src/pages/)

| Pagina | Rota | Auth | Descricao |
|--------|------|------|-----------|
| Index | `/`, `/board/:boardId` | Sim | Dashboard principal com sidebar + board ativo |
| Auth | `/auth` | Nao (redireciona se logado) | Login/registro |
| PublicForm | `/form/:slug` | Nao | Formulario publico de board |
| SharedBoard | `/shared/:token` | Nao | Board compartilhado via link |
| Home | - | - | Pagina inicial (nao roteada diretamente) |
| NotFound | `*` | Nao | 404 |

### Layout Principal (Index)

```
+------------------+----------------------------------------+
|                  |  BoardHeader                           |
|   AppSidebar     |  (nome, views, filtros, acoes)         |
|   - Workspaces   +----------------------------------------+
|   - Boards       |                                        |
|   - Favoritos    |  Board View (Table/Kanban/Timeline/    |
|   - Busca        |  Dashboard)                            |
|   - Config       |                                        |
|                  +----------------------------------------+
|                  |  ItemDetailPanel (lateral, opcional)    |
+------------------+----------------------------------------+
```

### Board Views

#### BoardTable.tsx (~750 linhas)
- Tabela editavel estilo Monday.com
- Grupos colapsaveis com cor e drag handle
- Celulas especializadas por tipo de coluna (16 componentes *Cell.tsx)
- Subitems inline
- Selecao de items com checkbox
- Grupo footer com summary (soma, contagem)
- Densidade controlada por CSS Custom Properties

#### BoardKanban.tsx (~900 linhas)
- Colunas baseadas em coluna Status
- Cards com nome, tags, data, pessoas
- WIP limits por coluna
- Swimlanes por grupo
- Drag and drop entre colunas
- Toolbar com busca e agrupamento

#### BoardTimeline.tsx
- Visualizacao temporal de items com datas
- Barras horizontais representando duracao

#### BoardDashboard.tsx
- Widgets configuráveis
- Metricas e graficos do board

### Celulas Especializadas (src/components/board/*Cell.tsx)

| Celula | Tipo de Coluna | Comportamento |
|--------|---------------|---------------|
| StatusCell | status | Dropdown com cores, labels customizaveis |
| DateCell | date | Date picker inline |
| PeopleCell | people | Selector de usuarios com avatares |
| NumberCell | number | Input numerico com formatacao |
| CheckboxCell | checkbox | Toggle boolean |
| DropdownCell | dropdown | Select com opcoes customizaveis |
| LinkCell | link | URL clicavel com icone |
| EmailCell | email | Link mailto |
| PhoneCell | phone | Link tel |
| RatingCell | rating | Estrelas clicaveis |
| TagsCell | tags | Chips com cores |
| ProgressCell | progress | Barra de progresso |
| TimeTrackingCell | time_tracking | Timer start/stop com acumulo |
| LongTextCell | long_text | Textarea expandivel |
| AutoNumberCell | auto_number | Numero sequencial automatico |
| FormulaCell | formula | Resultado de formula calculada |

### Sidebar (AppSidebar.tsx)

- Lista de workspaces com boards
- Favoritos com toggle
- Busca global
- Botao "Personalizar" para abrir ThemeCustomizer
- Perfil do usuario com logout
- Densidade de fonte controlada por CSS variables

### Paineis e Modais

| Componente | Tipo | Funcao |
|-----------|------|--------|
| ItemDetailPanel | Painel lateral | Detalhes do item, updates/comentarios, subitems |
| CreateBoardModal | Modal | Criar novo board |
| CreateColumnModal | Modal | Adicionar coluna ao board |
| ThemeCustomizer | Dialog | Cor primaria + densidade da interface |
| ShareBoardDialog | Dialog | Compartilhar board via link |
| FilterBuilder | Componente | Construtor de filtros avancados |
| BatchActionsBar | Barra | Acoes em massa para items selecionados |
| CommandPalette | Dialog | Paleta de comandos (Ctrl+K) |

## Estado Global (AppContext)

### Dados de UI Gerenciados

```typescript
{
  activeBoardId: string | null,
  sidebarCollapsed: boolean,
  selectedItem: string | null,
  searchQuery: string,
  filters: Record<string, any>,      // filtros simples (legado)
  advancedFilter: FilterGroup | null, // filtros avancados
  sort: { columnId: string, direction: 'asc' | 'desc' } | null,
  activeView: 'table' | 'kanban' | 'timeline' | 'dashboard',
  hiddenColumns: string[],
}
```

### Computacao do activeBoard

O `AppContext` monta o objeto `activeBoard` via `useMemo`:
1. Busca o board pelo `activeBoardId`
2. Associa grupos do board
3. Para cada grupo, associa items filtrados e ordenados
4. Para cada item, associa column_values
5. Aplica search query, filtros simples, filtros avancados e sort

**Importante**: Toda filtragem e ordenacao e CLIENT-SIDE. Nao ha server-side filtering.

## Patterns de UI

### Idioma
- Todo texto visivel ao usuario e em **Portugues Brasileiro (pt-BR)**
- Datas formatadas com `date-fns` locale `pt-BR`

### Tema e Densidade
- 8 cores primarias predefinidas (Azul, Roxo, Verde, Laranja, Rosa, Vermelho, Amarelo, Ciano)
- 3 niveis de densidade: compact, normal (default), spacious
- CSS Custom Properties para runtime switching
- Persistencia em localStorage
- Inicializado antes do React render (`initThemeCustomization` em main.tsx)

### Variaveis de Densidade

```css
--density-row-h         /* Altura de linha principal */
--density-row-h-sub     /* Altura de linha de subitem */
--density-font-cell     /* Fonte de celulas */
--density-font-item     /* Fonte de nomes de items */
--density-font-header   /* Fonte de cabecalhos */
--density-font-tiny     /* Fonte pequena (labels) */
--density-font-badge    /* Fonte de badges */
--density-sidebar-font  /* Fonte da sidebar */
--density-icon          /* Tamanho de icones */
--density-gap           /* Espacamento padrao */
```

### Classes Utilitarias de Densidade

```
.density-row, .density-row-sub
.font-density-cell, .font-density-item, .font-density-header
.font-density-tiny, .font-density-badge, .font-density-sidebar
```

### Componentes de Feedback
- Toast via shadcn/Toaster
- Sonner para notificacoes
- SavingIndicator para status de salvamento
- Custom event `mutation-error` para erros de mutacao

### Interacao
- Drag and drop (dnd/)
- Atalhos de teclado (useKeyboardShortcuts)
- Undo/Redo (useUndoRedo, UndoRedoContext)
- Selecao multipla (SelectionContext)
- Command palette (Ctrl+K)

## Dependencias Chave de UI

| Pacote | Uso |
|--------|-----|
| @radix-ui/* | Primitivos de UI (Dialog, Popover, Select, etc.) |
| lucide-react | Icones |
| date-fns | Formatacao de datas |
| recharts | Graficos no dashboard |
| @dnd-kit/* | Drag and drop |
| cmdk | Command palette |
| class-variance-authority | Variantes de componentes |
| tailwind-merge | Merge de classes Tailwind |
