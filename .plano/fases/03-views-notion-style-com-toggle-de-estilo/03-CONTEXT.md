# Fase 03: Views Notion-style com toggle de estilo - Contexto

**Reunido:** 2026-05-22
**Status:** Pronto para planejamento

<domain>
## Limite da Fase

Adicionar variante visual Notion-style nativa pra cada uma das 4 views de database criadas na Fase 02 (Tabela, Kanban, Calendário, Lista). Construir componentes novos `NotionTableView`, `NotionKanbanView`, `NotionCalendarView`, `NotionListView` do zero, com estilo Notion fiel (paleta cinza neutra, sem warm gold). Toggle no header da view permite usuário alternar entre `lfpro` (atual, reusa Board* via `mode='database'`) e `notion` (novo). Escolha persiste em `board_views.config.style`.

**Fora do dominio:**
- Subpáginas, database inline, bookmark, synced block — já feitos na Fase 02
- Modo Gallery (cards com imagem) — fase futura
- Timeline / Gantt Notion-style — fase futura
- AI commands / blocos AI — fase IA dedicada
- Drag/drop entre estilos diferentes (estilo independente da funcionalidade)
- Toggle global no workspace/database — toggle é por view

</domain>

<decisions>
## Decisões de Implementação

### Escopo de Views
- **4 views ganham variante Notion:** Tabela, Kanban, Calendário, Lista (todas selecionadas pelo usuário).
- Mesmo a Lista que já era "Notion-style" no MVP (Fase 02) recebe nova variante mais refinada com paleta cinza pura, enquanto a versão atual fica como variante `lfpro`.

### Construção
- **Componentes novos `Notion*View`:** Do zero, sem reusar Board*. Estrutura limpa, JSX próprio, estilo Notion fiel.
- **Sem prop variant em Board*:** Não complicar componentes existentes. Manter `BoardTable`/`BoardKanban`/`BoardCalendar`/`DatabaseListView` como estavam.
- Localização: `src/components/database/notion/NotionTableView.tsx`, `NotionKanbanView.tsx`, `NotionCalendarView.tsx`, `NotionListView.tsx`.

### Toggle e Persistência
- **Toggle no header de cada view:** Switch pequeno ao lado do nome da view, dois estados visuais: `LFPro` / `Notion`. Posicionado no `DatabaseViewTabs` ou em sub-header da view.
- **Persistência por view:** Campo `style` adicionado a `board_views.config` (jsonb). Default `'lfpro'`. Cada view tem seu próprio estilo independente.
- **Migration nova:** Não precisa schema change — apenas convenção dentro do `config jsonb`. Hooks tipam acesso ao campo.

### Paleta Notion
- **Cinzas neutros puros:** Background `#FFFFFF` light / `#191919` dark (Notion default). Border `#E9E9E7` light / `#373737` dark. Texto principal `#37352F` light / `#FFFFFF` dark. Texto secundário cinza médio.
- **Zero warm gold no modo Notion:** Status pills, links, botões usam cinzas + acentos coloridos próprios do Notion (azul `#2383E2` pra links/seleção, vermelho/amarelo/verde pra status semantics).
- **Tipografia:** No modo Notion, fonte sans-serif system default (não Jost/Montserrat). Espaçamento generoso. Tamanhos compactos.

### Componentes — especificações por view

#### NotionTableView
- Header de coluna: bg cinza muito claro `bg-gray-50`, texto `text-gray-600` text-sm font-medium, ícone do tipo de coluna à esquerda do nome (Type → ícone "T", Status → ícone bola colorida, Date → calendário, etc.)
- Rows: altura compacta (~32px), bg branco/escuro, hover bg `bg-gray-50`
- Click em cell: edita inline direto (não popover). Salva on blur.
- Border interna: `border-gray-200 dark:border-gray-700` 1px
- Sem zebra striping
- Add row: linha "+ Novo" fixa no fim da tabela

#### NotionKanbanView
- Colunas: cards arrastáveis dentro de colunas verticais. Header da coluna: subtle, com contador entre parênteses "Em andamento (3)".
- Card: bg branco/cinza escuro, shadow leve, padding compacto. Mostra: nome + 2-3 props (definíveis em config). Click abre `ItemDetailPanel`.
- Add card: botão "+ Nova" no fim de cada coluna.

#### NotionCalendarView
- Grid de mês cheio (estilo Google Calendar/Notion): 7 colunas × 5-6 linhas
- Header com mês/ano + botões "<" ">" Hoje
- Toggle Semana/Mês acima do grid
- Eventos: pílulas coloridas (cor por status) com texto truncado, ocupando linha do dia
- Hover em evento: tooltip com detalhe ou abre `ItemDetailPanel` no click
- Day cell: header com número do dia (cinza pequeno), eventos empilhados abaixo

#### NotionListView
- Linhas com altura compacta (~40px)
- Cada linha: nome inline + props como chips horizontais à direita (status pill, data, avatares people)
- Sem empilhamento de props (diferente da versão LFPro). Tudo em uma linha.
- Hover: bg subtle. Click: abre `ItemDetailPanel`.
- Border bottom subtle entre linhas

### Toggle UI
- Posicionamento: dentro do `DatabaseViewTabs`, após o nome da view, antes dos controles de filtro/sort.
- Componente: `ViewStyleToggle` novo. Visual: dois botões pequenos lado a lado (LFPro / Notion), o ativo com fundo subtle. Click muda `style` e re-renderiza.
- Persistência: chama `useUpdateBoardViewConfig` com novo style.

### Critério do Claude
- Definir ícones exatos de tipo de coluna no NotionTableView (lucide picks)
- Definir quais 2-3 props default mostrar no NotionKanbanView (provavelmente status + date + people)
- Definir se Calendar Notion suporta drag/drop de eventos entre dias (recomendado sim, espelhando BoardCalendar)
- Definir comportamento do toggle quando view não tem estilo Notion implementado (não aplicável já que faremos todas as 4)
- Atalhos de teclado pra alternar estilo (opcional, pode pular)

</decisions>

<specifics>
## Ideias Específicas

- **Notion como referência visual fiel.** Inspirar nas screenshots oficiais de Notion (https://www.notion.so/help/intro-to-databases). Layout, espaçamento, cores, tipografia.
- **Paleta exata Notion light:** bg `#FFFFFF`, panel `#F7F6F3`, border `#E9E9E7`, text-primary `#37352F`, text-secondary `#787774`, blue accent `#2383E2`, hover-bg `#F1F1EF`.
- **Paleta exata Notion dark:** bg `#191919`, panel `#202020`, border `#373737`, text-primary `#FFFFFF`, text-secondary `#A6A6A6`, blue accent `#529CCA`, hover-bg `#252525`.
- **Ícones de tipo de coluna Notion** (referência):
  - text → Type
  - long_text → AlignLeft
  - status → CircleDot (com cor dinâmica)
  - date → Calendar
  - people → Users
  - number → Hash
  - checkbox → CheckSquare
  - dropdown → List
- **Reuso onde fizer sentido:**
  - `useItems(boardId)`, `useColumns(boardId)`, `useGroups(boardId)` — hooks existentes
  - `ItemDetailPanel` — modal global, mantém abrir no click
  - `useUpdateBoardViewConfig` — criado em 02-07
  - `DatabaseViewRenderer` — switch que despacha pra view correta baseado em `view_type + style`
  - `useUpdateColumnValue` — mutation existente pra edit inline
  - Cell components do projeto (StatusCell, DateCell etc.) podem ser reusados se aceitarem prop `variant='notion'` ou criar versão simplificada inline
- **Independência:** Estilo Notion não deve depender de tema dark/light global. Funciona nos 2.

</specifics>

<deferred>
## Ideias Adiadas

- **Gallery view (cards com imagem):** Notion tem, LFPro não. Fase futura: "Gallery view".
- **Timeline / Gantt Notion-style:** Mais complexo. Fase futura: "Timeline view".
- **Drag entre estilos diferentes:** Não aplicável — estilo é independente da funcionalidade.
- **Toggle global no workspace/database:** Decisão é por view. Toggle global pode vir como preference em fase futura.
- **AI commands em blocos:** Fora de escopo desta fase.
- **Customizar paleta Notion (light/dark dinâmico):** Notion vem com paletas fixas. Customização vira config futura.
- **Atalhos de teclado para alternar estilo:** Pode adicionar no plano se trivial, senão fase futura.

</deferred>

---

*Fase: 03-views-notion-style-com-toggle-de-estilo*
*Contexto reunido: 2026-05-22*
