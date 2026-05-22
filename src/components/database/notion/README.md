# Notion-style Database Views (Fase 03)

Esta pasta contem as 4 views Notion-style das databases inline, criadas na Fase 03 do roadmap.

## Estrutura

- `NotionTableView.tsx` — tabela compacta com edit inline (REQ-23)
- `NotionKanbanView.tsx` — kanban com cards limpos + drag entre status (REQ-24)
- `NotionCalendarView.tsx` — grid mes/semana com eventos coloridos (REQ-25)
- `NotionListView.tsx` — lista compacta horizontal (REQ-26)

## Helpers compartilhados

- `notionInlineCell.tsx` — primitivos visuais: `StatusPill`, `PersonAvatar`, `NotionInlineCell` (editor inline por tipo)
- `notionColumnIcon.tsx` — `NotionColumnIcon` (lucide icon por ColumnType)
- `useCalendarItems.ts` — hook que agrupa items por data
- (em `src/hooks/`) `useKanbanStatusGroup.ts` — agrupa por status
- (em `src/hooks/`) `useViewStyle.ts` — le/persiste `board_views.config.style`

## Paleta

Definida em `src/styles/notion-theme.css`, escopada em `.notion-view`. Carregada via
`<div className="notion-view">` injetado por `DatabaseViewRenderer` quando
`board_views.config.style === 'notion'`.

**Variaveis principais:**
- `--notion-bg`, `--notion-panel`, `--notion-border`
- `--notion-text-primary`, `--notion-text-secondary`, `--notion-text-tertiary`
- `--notion-blue` (accent), `--notion-blue-bg`
- `--notion-status-{red,orange,yellow,green,blue,purple,pink,gray}` + `-bg` variants

## Limitacoes do MVP (escopo Fase 03)

- **Calendar:** sem drag-drop de eventos entre dias (planejado para fase futura)
- **People:** read-only em todas as views Notion (edicao via `ItemDetailPanel`)
- **Sort / Filter / GroupBy:** nao implementado nas Notion views (LFPro tem; Notion seguira em fase futura)
- **Kanban:** sem reorder dentro da mesma coluna (so muda status)
- **Toggle Mes/Semana** no Calendar (sem Day/Year mode)
- **Subitems:** nao renderizados nas Notion views (so na tabela LFPro)

## Reuso

Notion views NAO duplicam logica de dados. Usam os mesmos hooks:
- `useApp().activeBoard` (via BoardProvider injetado por `DatabaseBoardContext`)
- `useProfiles()`, `useUpdateColumnValue()`, `useCreateItem()`, `useUpdateItem()` de `@/hooks/useSupabaseData`

## Adicionando uma nova Notion view (futuro)

1. Criar componente em `src/components/database/notion/Notion<Tipo>View.tsx`
2. Adicionar import + switch case em `src/components/database/DatabaseViewRenderer.tsx`
3. Estender `DatabaseViewType` em `src/types/database.ts` se for um tipo novo
4. Adicionar smoke test em `src/test/notion-views.integration.test.tsx`

## Testes

- `src/test/useViewStyle.test.ts` — helpers de leitura/persistencia do style
- `src/test/notion-paleta.test.ts` — guard de paleta cinza pura (REQ-27)
- `src/test/notion-views.integration.test.tsx` — smoke tests de render (REQ-23..26)
