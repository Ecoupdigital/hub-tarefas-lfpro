---
phase: 03-views-notion-style-com-toggle-de-estilo
plan: 03-05
subsystem: database-views-notion-calendar
tags: [calendar, date-fns, notion-style, month-view, week-view, status-color, view-config]
requirements: [REQ-25, REQ-27]
dependency_graph:
  requires:
    - NotionCalendarView stub (criado em 03-02, substituido aqui)
    - useBoardViews hook (existente)
    - AppContext.setSelectedItem (existente)
    - date-fns v3 (instalado)
    - .notion-status-* CSS vars (definidas em src/styles/notion-theme.css)
    - --notion-bg / --notion-panel / --notion-border / --notion-blue tokens
  provides:
    - NotionCalendarView (container com header de navegacao + toggle mes/semana + grid)
    - NotionCalendarGrid (grid 7xN com day cells, modo mes)
    - NotionCalendarWeek (layout 7 colunas modo semana)
    - NotionCalendarEvent (pilula colorida com cor herdada do status)
    - useCalendarItems (hook que agrupa items por dateKey)
    - getDefaultDateColumnId / getDefaultStatusColumnIdForCalendar helpers
    - parseDateValue helper local (string ou objeto {date})
  affects:
    - src/components/database/notion/NotionCalendarView.tsx (stub substituido por implementacao real)
tech-stack:
  added: []
  patterns:
    - "date-fns v3: startOfMonth + endOfMonth + startOfWeek + endOfWeek + eachDayOfInterval -> 35-42 dias visiveis no grid"
    - "Cor da pilula via CSS custom property dinamica: var(--notion-status-${color}-bg, fallback gray-bg)"
    - "view.config.calendarDateColumnId + calendarStatusColumnId persistidos no board_views (futuro: UI de config)"
    - "useCalendarItems retorna Map<dateKey, CalendarItem[]> para lookup O(1) por day cell"
    - "Modo mes com cap de 3 eventos por dia + '+N mais' (UX padrao Notion); modo semana sem cap"
    - "parseDateValue defensivo: aceita 'YYYY-MM-DD' string ou objeto { date }"
key-files:
  created:
    - src/components/database/notion/useCalendarItems.ts
    - src/components/database/notion/NotionCalendarEvent.tsx
    - src/components/database/notion/NotionCalendarGrid.tsx
    - src/components/database/notion/NotionCalendarWeek.tsx
  modified:
    - src/components/database/notion/NotionCalendarView.tsx
decisions:
  - "weekStartsOn: 0 (domingo) em vez de pt-BR locale (segunda) — alinha com header WEEKDAY_LABELS ['Dom', 'Seg', ..., 'Sab'] que comeca em domingo. Locale ptBR usado apenas em format() para mes/ano e dia da semana abreviado"
  - "MVP sem drag-and-drop de eventos entre dias — escopo definido no plano, click do evento abre ItemDetailPanel"
  - "Cap de 3 eventos por dia no modo mes (slice(0,3) + '+N mais') — alinha com UX Notion e evita day cells gigantes; modo semana mostra todos sem cap"
  - "Status fallback 'gray' quando label.color invalido ou status absente — protege contra dados sujos (mesma decisao tomada em 03-03 para StatusPill)"
  - "view.config tem precedencia sobre defaults; validacao defensiva: cfgDate so vale se coluna ainda existe E e do tipo 'date' (idem para status). Caso contrario cai pro default"
  - "Empty state explicito quando board nao tem coluna 'date' — calendario sem coluna date e logicamente impossivel, mensagem clara melhor que tela em branco"
  - "Sem migration SQL — calendarDateColumnId e calendarStatusColumnId vao direto em board_views.config (jsonb existente)"
metrics:
  duration_secs: 134
  tasks_completed: 6
  files_created: 4
  files_modified: 1
  commits: 5
  completed_at: "2026-05-22T17:55:17Z"
---

# Fase 03 Plano 05: NotionCalendarView (grid mes/semana + eventos coloridos) Summary

Calendar Notion-style funcional substituindo o stub criado em 03-02: grid mensal 7xN gerado via `date-fns@v3 eachDayOfInterval`, eventos como pilulas coloridas com cor herdada do status do item, toggle Mes/Semana, navegacao para mes/semana anterior e proximo, botao "Hoje", click do evento abre `ItemDetailPanel` global via `useApp().setSelectedItem`. Resolucao de coluna de data e status com precedencia para `view.config.calendarDateColumnId` / `calendarStatusColumnId` (persistido em `board_views.config` jsonb existente) e fallback para as primeiras colunas dos tipos `date` / `status` do board. Empty state explicito quando o board nao tem coluna `date`.

## Tarefas Executadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Criar `useCalendarItems` hook | `f468b77` | src/components/database/notion/useCalendarItems.ts |
| 2 | Criar `NotionCalendarEvent` pilula | `c12da6f` | src/components/database/notion/NotionCalendarEvent.tsx |
| 3 | Criar `NotionCalendarGrid` (mes) | `826f674` | src/components/database/notion/NotionCalendarGrid.tsx |
| 4 | Criar `NotionCalendarWeek` (semana) | `6e23dd9` | src/components/database/notion/NotionCalendarWeek.tsx |
| 5 | Substituir stub `NotionCalendarView` | `76307b4` | src/components/database/notion/NotionCalendarView.tsx |
| 6 | Smoke test (human-verify) | — | auto-PASS via /up:executar-fase autonomo |

## Verificacoes

- `npx tsc --noEmit` — limpo, zero erros
- `npx vitest run` — 212/212 testes passam (zero regressao)
- Dev server em http://localhost:8080 retornando HTTP 200, HMR recarregou `NotionCalendarView.tsx` sem erro (`5:54:40 PM [vite] page reload`)
- Stub antigo confirmado removido (`grep "Em construcao (plano 03-05)"` retorna vazio)
- Tarefa 6 (smoke test manual): **auto-PASS** por convencao do modo `/up:executar-fase` autonomo — checks automatizados (tsc, vitest, dev server) todos verdes

## Decisoes Tecnicas

1. **`weekStartsOn: 0` (domingo) em vez de locale ptBR (segunda).** Header `WEEKDAY_LABELS = ['Dom', 'Seg', ..., 'Sab']` comeca em domingo, e o alinhamento visual entre header e cells exige consistencia. Locale `ptBR` reservado apenas para `format()` de mes/ano (`"MMMM 'de' yyyy"`) e label abreviado do dia da semana no modo semana (`'EEE'`).
2. **MVP sem drag-and-drop de eventos.** CONTEXT.md sugere "recomendado sim, espelhando BoardCalendar", mas plano define escopo explicito: drag fica para plano futuro. Click do evento abre `ItemDetailPanel` (suficiente para visualizar e editar a data via panel).
3. **Cap de 3 eventos no modo mes, sem cap no modo semana.** Alinha com UX Notion: grid mensal precisa de cells compactas (min-h 90px), modo semana tem cells altas (min-h 300px) que comportam scroll vertical para volumes maiores.
4. **`view.config` com precedencia + validacao defensiva.** Se `cfgDate` existir mas a coluna referenciada nao existe mais no board ou mudou de tipo, cai pro default (1a coluna `type === 'date'`). Mesmo para status. Protege contra config orfa apos delete de coluna.
5. **Empty state quando `dateColumnId === null`.** Calendar sem coluna de data e logicamente impossivel; mensagem clara ("Calendario precisa de uma coluna de tipo 'Date' no board.") evita tela em branco confusa.
6. **`parseDateValue` aceita string OU objeto.** `DateCell` legacy armazena `"YYYY-MM-DD"` (string), mas implementacoes mais novas usam `{ date, startTime?, endTime? }`. Aceitar ambos elimina necessidade de migration de dados.
7. **Cor via CSS custom property dinamica.** `backgroundColor: var(--notion-status-${color}-bg, var(--notion-status-gray-bg))` permite herdar a paleta inteira do tema sem if/else por cor no JS. Fallback inline (`, gray-bg`) cobre casos de cor desconhecida.

## Desvios do Plano

Nenhum. Plano executado exatamente como escrito. Todas as 5 tarefas automatizadas concluidas em ordem com texto literal do `<action>` aplicado (excecao minima: remocao de `import { isSameDay, startOfDay }` em `useCalendarItems` e `import { ptBR }` em `NotionCalendarGrid` que estavam declarados no plano mas nao usados — eslint/tsc rejeitariam). Tarefa 6 (smoke test manual) auto-PASS por convencao do modo `/up:executar-fase` autonomo. Zero auto-correcoes (Regras 1-5) necessarias.

## Self-Check: PASSOU

Verificacoes executadas apos criacao do SUMMARY:

- `src/components/database/notion/useCalendarItems.ts`: ENCONTRADO (contem `useCalendarItems` + `parseDateValue` + helpers default)
- `src/components/database/notion/NotionCalendarEvent.tsx`: ENCONTRADO
- `src/components/database/notion/NotionCalendarGrid.tsx`: ENCONTRADO (contem `eachDayOfInterval`)
- `src/components/database/notion/NotionCalendarWeek.tsx`: ENCONTRADO
- `src/components/database/notion/NotionCalendarView.tsx`: ENCONTRADO (stub substituido — `grep "Em construcao"` vazio, contem `useCalendarItems` e `NotionCalendarGrid`)
- Commits f468b77, c12da6f, 826f674, 6e23dd9, 76307b4: ENCONTRADOS em `git log`
- `npx tsc --noEmit`: limpo
- `npx vitest run`: 212/212 passam
- Dev server: HTTP 200, HMR aplicado sem erro

## Proximo Plano

**03-06** (NotionListView completa — substitui stub criado em 03-02) e/ou **03-07** (polish + integration final) conforme sequencia da fase. Calendar Notion agora cobre REQ-25 (especificacao NotionCalendarView) e REQ-27 (paleta cinza/sem warm gold).
