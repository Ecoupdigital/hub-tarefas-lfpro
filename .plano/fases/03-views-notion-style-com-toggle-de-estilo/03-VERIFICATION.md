---
phase: 03-views-notion-style-com-toggle-de-estilo
verified: 2026-05-22T18:08:00Z
status: passed
score: 9/9 must-haves verificados
gaps: []
---

# Fase 3: Views Notion-style com toggle de estilo - Relatorio de Verificacao

**Objetivo da Fase:** Cada view da database (Tabela, Kanban, Calendario, Lista) ganha variante visual Notion-style nativa, construida do zero. Toggle no header da view (LFPro / Notion) persiste em `board_views.config.style`. Estilo Notion usa paleta cinza neutra; LFPro mantem comportamento atual.
**Verificado:** 2026-05-22T18:08:00Z
**Status:** passed

## Alcance do Objetivo

### Verdades Observaveis

| # | Verdade | Status | Evidencia |
|---|---------|--------|-----------|
| 1 | Header de cada view tem switch LFPro/Notion visivel | VERIFIED | `src/components/database/ViewStyleToggle.tsx` (segmented control 2 botoes); montado em `DatabaseViewTabs.tsx:5,67` via `<ViewStyleToggle boardId viewId={activeViewId} />` |
| 2 | Toggle persiste em `board_views.config.style` (default 'lfpro') | VERIFIED | `useViewStyle.ts:30` faz `nextConfig = { ...baseConfig, style: next }` + `updateConfig.mutateAsync({ viewId, config: nextConfig })`. `getViewStyle` (types/database.ts:87) retorna `VIEW_STYLE_DEFAULT = 'lfpro'` quando ausente |
| 3 | NotionTableView: cabecalho cinza, rows compactas, hover, icones por tipo, edit inline (sem popover) | VERIFIED | `NotionTableView.tsx` (147 linhas) + `NotionTableHeader.tsx` + `NotionTableRow.tsx` + `notionInlineCell.tsx` (241 linhas com editores inline text/long_text/number/checkbox/date/status/dropdown). `+ Novo` button por group. `notionColumnIcon.tsx` mapeia 8 tipos para icones Lucide |
| 4 | NotionKanbanView: cards limpos (nome + 2-3 props), header sutil + contador | VERIFIED | `NotionKanbanView.tsx` (154 linhas) + `NotionKanbanColumn.tsx` + `NotionKanbanCard.tsx`. Resolve `statusColumnId` + `visibleProps` via `board_views.config`. `DndContext` + `handleDragEnd` chama `useUpdateColumnValue` para mudar status. `+ Nova` cria item com status preselecionado |
| 5 | NotionCalendarView: grid mes cheio, pilulas coloridas, toggle Semana/Mes | VERIFIED | `NotionCalendarView.tsx` (154 linhas) + `NotionCalendarGrid.tsx` + `NotionCalendarWeek.tsx` + `NotionCalendarEvent.tsx` + `useCalendarItems.ts` (89 linhas). Header com `<`, `>`, Hoje, mes/ano (ptBR). Toggle month/week. Eventos pintados via `--notion-status-*` por status |
| 6 | NotionListView: linhas + chips horizontais paleta cinza | VERIFIED | `NotionListView.tsx` (113 linhas) + `NotionListRow.tsx` (131 linhas). Render compacto, chips horizontais reusando `StatusPill` + `PersonAvatar` do `notionInlineCell.tsx`. Sem empilhamento de props |
| 7 | Estilo Notion usa cinzas neutros (sem warm gold) | VERIFIED | `src/styles/notion-theme.css` define paleta `--notion-*` escopada em `.notion-view`. Teste `notion-paleta.test.ts` (3 testes verdes) faz grep regex word-boundary contra `bg-primary`, `text-primary`, `border-primary`, `ring-primary`, `font-heading`. Zero violacoes em 15 arquivos `notion/` |
| 8 | Trocar estilo nao perde dados (apenas re-renderiza) | VERIFIED | `DatabaseViewRenderer.tsx:79-83` mantem o mesmo `<DatabaseBoardContext boardId>` em ambos os ramos e troca apenas o JSX filho via ternario `style === 'notion' ? notionContent : lfproContent`. Sem desmount do contexto. Mutation `setStyle` so altera campo `style` no jsonb — preserva resto do `config` (linha 28-30 do hook) |
| 9 | Estilo LFPro continua funcionando | VERIFIED | `DatabaseViewRenderer.tsx:60-68` mantem `<BoardTable mode="database"/>`, `<BoardKanban>`, `<BoardCalendar>`, `<DatabaseListView>` inalterados. `notion-paleta.test.ts` impede regressao (tokens LFPro em arquivos notion/ quebrariam o teste). Smoke `notion-views.integration.test.tsx` (4 testes) confirma render sem crash |

**Score:** 9/9 verdades verificadas

### Artefatos Requeridos

| Artefato | Esperado | Status | Detalhes |
|----------|----------|--------|----------|
| `src/types/database.ts` | Tipo `ViewStyle` + `VIEW_STYLE_DEFAULT` + `getViewStyle` | VERIFIED | Linhas 73-100, exporta ViewStyle, VIEW_STYLES, VIEW_STYLE_DEFAULT ('lfpro'), VIEW_STYLE_LABELS, getViewStyle (helper defensivo) |
| `src/styles/notion-theme.css` | Paleta `--notion-*` light+dark em `.notion-view` | VERIFIED | Existe. Linhas 5-160 com light + dark (`.dark .notion-view`). Status colors red/orange/yellow/green/blue/purple/pink/gray |
| `src/hooks/useViewStyle.ts` | Hook retorna style + setter persistindo via useUpdateBoardViewConfig | VERIFIED | 45 linhas. Le via `useBoardViews(boardId)`, merge `style` em config, chama `useUpdateBoardViewConfig.mutateAsync` |
| `src/components/database/ViewStyleToggle.tsx` | Segmented control LFPro/Notion conectado a useViewStyle | VERIFIED | 68 linhas, 2 botoes, `aria-pressed`, `disabled` durante mutation |
| `src/components/database/DatabaseViewRenderer.tsx` | Despacha por viewType + style | VERIFIED | Linhas 56-83: switch `viewType + style`, wrap Notion em `<div className="notion-view">` |
| `src/components/database/notion/NotionTableView.tsx` | Tabela Notion-style com edit inline | VERIFIED | 147 linhas, header sticky, rows compactas, `+ Novo` por group |
| `src/components/database/notion/NotionKanbanView.tsx` | Kanban Notion-style + drag entre status | VERIFIED | 154 linhas, DndContext + PointerSensor, handleDragEnd com updateColumnValue |
| `src/components/database/notion/NotionCalendarView.tsx` | Grid mes + week toggle + eventos coloridos | VERIFIED | 154 linhas, navegacao mes/semana, Hoje button, locale ptBR |
| `src/components/database/notion/NotionListView.tsx` | Linhas compactas com chips horizontais | VERIFIED | 113 linhas, sem empilhamento, reusa StatusPill/PersonAvatar |
| `src/components/database/notion/notionInlineCell.tsx` | Primitivos visuais + editor inline polimorfico | VERIFIED | 241 linhas, StatusPill, PersonAvatar, NotionInlineCell (text/long_text/number/checkbox/date/status/dropdown) |
| `src/components/database/notion/notionColumnIcon.tsx` | Mapping ColumnType -> Lucide | VERIFIED | 28 linhas, 8 tipos mapeados |
| `src/hooks/useKanbanStatusGroup.ts` | Agrupa items por status | VERIFIED | Existe, exporta useKanbanStatusGroup + getDefaultKanbanStatusColumnId |
| `src/test/notion-paleta.test.ts` | Guard contra warm gold | VERIFIED | 3 testes verdes, regex word-boundary |
| `src/test/notion-views.integration.test.tsx` | Smoke 4 Notion views | VERIFIED | 4 testes verdes (Table/Kanban/Calendar/List render sem crash) |
| `src/test/useViewStyle.test.ts` | Teste do helper getViewStyle | VERIFIED | 6 testes verdes |

### Verificacao de Links Chave

| De | Para | Via | Status | Detalhes |
|----|------|-----|--------|----------|
| `useViewStyle` | `useBoardViews` + `useUpdateBoardViewConfig` | imports + mutateAsync | WIRED | linhas 2, 19, 20, 31 |
| `src/index.css` | `notion-theme.css` | `@import "./styles/notion-theme.css"` | WIRED | linha 6 do index.css |
| `DatabaseViewTabs` | `ViewStyleToggle` | render condicional com activeViewId | WIRED | DatabaseViewTabs.tsx:67 `<ViewStyleToggle boardId={boardId} viewId={activeViewId} />` |
| `ViewStyleToggle` | `useViewStyle` | hook + setStyle | WIRED | ViewStyleToggle.tsx:3,28 |
| `DatabaseViewRenderer` | NotionTableView/Kanban/Calendar/List | switch + render | WIRED | linhas 8-11 imports, 72-75 render |
| `DatabaseViewRenderer` | `.notion-view` CSS scope | wrap `<div className="notion-view">` | WIRED | linha 71 |
| `NotionKanbanView` | `@dnd-kit/core` DndContext + useUpdateColumnValue | handleDragEnd | WIRED | linhas 2, 29, 76-103 |
| `NotionTableView` | `useUpdateColumnValue` + `useCreateItem` + `useUpdateItem` | mutations | WIRED | linha 4, 48-77 |
| `Notion*View` | `useApp().setSelectedItem` | abre ItemDetailPanel no click | WIRED | NotionTableView:26,109; NotionKanbanView:26,143; NotionCalendarView:23,70; NotionListView:25,102 |

### Cobertura de Requisitos

| Requisito | Plano Fonte | Descricao | Status | Evidencia |
|-----------|-------------|-----------|--------|-----------|
| REQ-21 | 03-01, 03-02 | Toggle visivel por view | SATISFIED | ViewStyleToggle.tsx montado em DatabaseViewTabs.tsx:67 |
| REQ-22 | 03-01, 03-02 | Persistencia em board_views.config.style | SATISFIED | useViewStyle.ts:30-31; useViewStyle.test.ts 6 testes verdes |
| REQ-23 | 03-03, 03-03b, 03-07 | NotionTableView | SATISFIED | NotionTableView/Header/Row + notionInlineCell editores inline |
| REQ-24 | 03-04, 03-07 | NotionKanbanView | SATISFIED | NotionKanbanView/Column/Card + DnD + drag muda status |
| REQ-25 | 03-05, 03-07 | NotionCalendarView | SATISFIED | NotionCalendarView/Grid/Week/Event + useCalendarItems |
| REQ-26 | 03-06, 03-07 | NotionListView | SATISFIED | NotionListView + NotionListRow chips horizontais |
| REQ-27 | 03-01, 03-03..07 | Paleta cinza neutra sem warm gold | SATISFIED | notion-theme.css escopado + notion-paleta.test.ts guard (0 violacoes) |
| REQ-28 | 03-02, 03-07 | LFPro intacto | SATISFIED | DatabaseViewRenderer ramo lfpro inalterado; notion-paleta.test.ts impede regressao |

### Anti-Padroes Encontrados

| Arquivo | Linha | Padrao | Severidade | Impacto |
|---------|-------|--------|------------|---------|
| - | - | (nenhum) | - | Todos os "text-primary" matches sao na verdade `--notion-text-primary` (CSS var legitima). Placeholders sao de inputs reais ("Vazio", "Nome do item"), nao stubs |

### Verificacao Humana Necessaria

Items que escapam de testes programaticos mas valem revisao visual rapida do Jonathan:

- **Fidelidade visual Notion** — comparar screenshots oficiais Notion vs render LFPro Tasks (estilo, espacamento, hover, pilulas)
- **Comportamento de drag/drop no Kanban** — testar arrastar card entre colunas no browser real (smoke tests nao cobrem dnd-kit)
- **Toggle Semana/Mes no Calendar** — verificar que week mode mostra 7 dias com altura maior e que navegacao desloca por semana (nao mes) em week mode
- **Edit inline no NotionTableView** — testar click em celula → editor aparece → onBlur salva (sem popover)
- **Dark mode** — `.dark .notion-view` define paleta dark, mas validar visualmente em ambas as views
- **Persistencia de fato no Supabase** — abrir 2 abas: trocar style em uma, validar que outra aba reflete (realtime do board_views ja existente)

### Resumo de Gaps

**Nenhum gap encontrado.**

A Fase 03 cumpre todos os 9 criterios de sucesso do ROADMAP e todos os 8 requisitos (REQ-21..28). Todos os artefatos esperados existem com codigo substantivo (15 arquivos em `src/components/database/notion/`, 1597 linhas totais), estao wired ao app (DatabaseViewRenderer despacha por style; ViewStyleToggle montado no DatabaseViewTabs), e passam por 13 testes automatizados (3 paleta + 4 smoke + 6 useViewStyle).

Observacao: O ROADMAP.md mostra "Fase 3: 1/8 In Progress" e marca os planos 03-03b, 03-04, 03-05, 03-07 com `[ ]` (nao concluido), mas todos os 8 SUMMARYs existem, os arquivos correspondentes existem no codebase, e a suite de testes confirma 13/13 verde. Recomendacao para o orquestrador: atualizar o ROADMAP marcando todos os 8 planos como completos e a fase como `Complete`.
