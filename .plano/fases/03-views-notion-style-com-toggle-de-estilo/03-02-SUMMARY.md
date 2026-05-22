---
phase: 03-views-notion-style-com-toggle-de-estilo
plan: 03-02
subsystem: database-views
tags: [view-style, toggle, ui, dispatching, segmented-control, notion-stubs]
requirements: [REQ-21, REQ-22, REQ-28]
dependency_graph:
  requires:
    - useViewStyle hook (criado em 03-01)
    - getViewStyle helper (criado em 03-01)
    - VIEW_STYLE_LABELS constant (criado em 03-01)
    - .notion-view CSS class scope (criado em 03-01)
    - DatabaseBoardContext (existente, mantido sem mudanca)
    - DatabaseViewTabs / DatabaseListView / BoardTable / BoardKanban / BoardCalendar (existentes)
  provides:
    - ViewStyleToggle (segmented control LFPro / Notion)
    - DatabaseViewRenderer extendido (despacha por viewType + style)
    - Stubs Notion*View (NotionTableView, NotionKanbanView, NotionCalendarView, NotionListView)
    - Container .notion-view envolvendo content quando style=notion
    - src/components/database/notion/ (diretorio reservado para planos 03-03..06)
  affects:
    - src/components/database/DatabaseViewTabs.tsx (toggle injetado entre tabs e botao "+")
    - src/components/database/DatabaseViewRenderer.tsx (reescrito com dispatch dual)
tech-stack:
  added: []
  patterns:
    - "Segmented control via 2 <button> com aria-pressed (nao Radix Switch) conforme CONTEXT.md"
    - "Renderer dispatch dual: (viewType, style) → LFPro original vs Notion wrapper"
    - "Stub-first scaffolding: Notion*View placeholders permitem testar a infra do toggle antes da implementacao real (planos 03-03..06)"
    - ".notion-view className wrapper escopa CSS variables sem poluir tema LFPro global"
key-files:
  created:
    - src/components/database/ViewStyleToggle.tsx
    - src/components/database/notion/.gitkeep
    - src/components/database/notion/NotionTableView.tsx
    - src/components/database/notion/NotionKanbanView.tsx
    - src/components/database/notion/NotionCalendarView.tsx
    - src/components/database/notion/NotionListView.tsx
  modified:
    - src/components/database/DatabaseViewTabs.tsx
    - src/components/database/DatabaseViewRenderer.tsx
decisions:
  - "Segmented control com 2 <button> (nao Radix Switch) — CONTEXT.md especifica 'dois botoes pequenos lado a lado' e o padrao do projeto (DatabaseViewTabs:45) ja usa esse approach"
  - "Stubs minimos para Notion*View no mesmo plano (em vez de adiar pro 03-03) — permite testar a infra do dispatching e do toggle ja em 03-02 sem dependencia pesada"
  - "Wrapper .notion-view aplicado dentro do DatabaseBoardContext, nao fora — mantem o BoardProvider local invariante entre os dois branches de style"
  - "ViewStyleToggle se auto-oculta quando viewId e null/undefined (nao renderiza nada) — evita prop disabled boilerplate no caller"
  - "isUpdating + isActive juntos no disabled — bloqueia clicks duplos durante mutation E previne re-disparo da mesma opcao ja ativa"
metrics:
  duration_secs: 269
  tasks_completed: 7
  files_created: 6
  files_modified: 2
  commits: 6
  completed_at: "2026-05-22T17:49:52Z"
---

# Fase 03 Plano 02: ViewStyleToggle + DatabaseViewRenderer dispatching Summary

Toggle UI (segmented control LFPro / Notion) integrado no header das tabs da database e dispatching dual implementado no `DatabaseViewRenderer`. Usuario agora consegue alternar o estilo visual de cada view individualmente (persistido em `board_views.config.style`), com o estilo LFPro mantendo 100% do comportamento anterior (zero regressao) e o estilo Notion renderizando placeholders dentro do escopo `.notion-view` que sera substituido pelas implementacoes reais nos planos 03-03 a 03-06.

## Tarefas Executadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Criar `ViewStyleToggle` (segmented control) | `2c42951` | src/components/database/ViewStyleToggle.tsx |
| 2 | Integrar toggle em `DatabaseViewTabs` | `19755ff` | src/components/database/DatabaseViewTabs.tsx |
| 3 | Reservar diretorio `notion/` com `.gitkeep` | `ec842f3` | src/components/database/notion/.gitkeep |
| 4 | Stub `NotionTableView` | `f22d208` | src/components/database/notion/NotionTableView.tsx |
| 5 | Stubs `NotionKanbanView` / `NotionCalendarView` / `NotionListView` | `d138635` | src/components/database/notion/{NotionKanbanView,NotionCalendarView,NotionListView}.tsx |
| 6 | Estender `DatabaseViewRenderer` com dispatch por `(viewType, style)` | `b041cd1` | src/components/database/DatabaseViewRenderer.tsx |
| 7 | Smoke test manual (human-verify) | — | (validacao visual pelo usuario) |

## Verificacoes

- `npx tsc --noEmit` — limpo, zero erros
- `npx vitest run` — 212/212 testes passam (zero regressao em todos os testes do projeto)
- Dev server em http://localhost:8083 retornando HTTP 200, HMR recarregou todos os arquivos editados sem erro
- Persistencia coberta pelo hook `useViewStyle` (testado em 03-01 com 6 cases)
- Tarefa 7 (smoke test manual): **PASS** confirmado pelo usuario

## Decisoes Tecnicas

1. **Segmented control via `<button>` x2, nao Radix Switch.** CONTEXT.md especifica "dois botoes pequenos lado a lado (LFPro / Notion), o ativo com fundo subtle". Padrao tambem ja usado em `DatabaseViewTabs:45` para as proprias tabs. Switch (toggle binario on/off) nao faria sentido semantico aqui.
2. **Stubs criados no mesmo plano.** Em vez de adiar `Notion*View` para 03-03, foram criadas placeholders minimas ja em 03-02. Isso permite que a infra de toggle e dispatching seja validada **end-to-end** antes das implementacoes pesadas chegarem. Cada stub referencia explicitamente o plano que vai substitui-lo (03-03 a 03-06).
3. **`.notion-view` wrapper dentro do `DatabaseBoardContext`.** Aplicar o wrapper internamente preserva o invariante de que o BoardProvider local roda identico nos dois branches de style (LFPro e Notion compartilham mesmo `boardIdOverride`).
4. **Auto-hide quando `viewId` ausente.** `ViewStyleToggle` retorna `null` se `disabled || !viewId`. Simplifica o caller (`DatabaseViewTabs`) que so passa props uma vez sem precisar de logica condicional de render.
5. **`disabled = isUpdating || isActive`.** Combinacao previne tanto clicks duplos durante mutation quanto re-disparo da opcao ja ativa (que seria no-op mas custaria um round-trip mental ao codigo).

## Desvios do Plano

Nenhum. Plano executado exatamente como escrito. Todas as 6 tarefas automatizadas concluidas em ordem com texto literal do `<action>` aplicado, e a tarefa 7 (smoke test) validada pelo usuario com PASS. Zero auto-correcoes (Regras 1-5) necessarias.

## Self-Check: PASSOU

Verificacoes executadas apos criacao do SUMMARY:

- `src/components/database/ViewStyleToggle.tsx`: ENCONTRADO (contem `useViewStyle` + `aria-pressed`)
- `src/components/database/DatabaseViewTabs.tsx`: ENCONTRADO (contem `import ViewStyleToggle` + `<ViewStyleToggle boardId={boardId}`)
- `src/components/database/DatabaseViewRenderer.tsx`: ENCONTRADO (contem `getViewStyle` + `className="notion-view"`)
- `src/components/database/notion/NotionTableView.tsx`: ENCONTRADO
- `src/components/database/notion/NotionKanbanView.tsx`: ENCONTRADO
- `src/components/database/notion/NotionCalendarView.tsx`: ENCONTRADO
- `src/components/database/notion/NotionListView.tsx`: ENCONTRADO
- `src/components/database/notion/.gitkeep`: ENCONTRADO
- Commits 2c42951, 19755ff, ec842f3, f22d208, d138635, b041cd1: ENCONTRADOS em `git log`
- `npx tsc --noEmit`: limpo
- `npx vitest run`: 212/212 passam

## Proximo Plano

**03-03** (NotionInlineCellEditor + primitives ja em progresso conforme commits `325dadf` e `49e2fe5` na branch) e **03-03b** (provavelmente NotionTableView completo) continuam substituindo os stubs criados aqui pelas implementacoes reais. Sequencia esperada: 03-03 → 03-03b → 03-04 (Kanban) → 03-05 (Calendar) → 03-06 (List) → 03-07 (polish/integration).
