---
phase: 03-views-notion-style-com-toggle-de-estilo
plan: 03-01
subsystem: database-views
tags: [view-style, theming, foundation, css-variables, types, hooks]
requirements: [REQ-21, REQ-22]
dependency_graph:
  requires:
    - useBoardViews (src/hooks/useBoardViews.ts) - existing, no changes
    - useUpdateBoardViewConfig (src/hooks/useBoardViews.ts:87) - existing, no changes
    - board_views.config jsonb column - existing schema, no migration
  provides:
    - ViewStyle type ('lfpro' | 'notion')
    - VIEW_STYLE_DEFAULT constant + VIEW_STYLES + VIEW_STYLE_LABELS
    - getViewStyle(view) defensive helper
    - useViewStyle(boardId, viewId) hook with style/setStyle/isUpdating/isPersisted
    - CSS variables --notion-* scoped to .notion-view (light + dark)
    - Status accents (--notion-status-{red,orange,yellow,green,blue,purple,pink,gray})
  affects:
    - src/index.css (added one @import line)
tech-stack:
  added: []
  patterns:
    - "View style persisted in board_views.config jsonb (no schema change)"
    - "CSS theme variables scoped via class (.notion-view), not :root"
    - "Defensive helper getViewStyle treats null/invalid values as default"
    - "Hook reuses existing useBoardViews + useUpdateBoardViewConfig (no new mutation)"
key-files:
  created:
    - src/styles/notion-theme.css
    - src/hooks/useViewStyle.ts
    - src/test/useViewStyle.test.ts
  modified:
    - src/types/database.ts (appended ViewStyle exports)
    - src/index.css (added @import)
decisions:
  - "No SQL migration: style lives in board_views.config jsonb (no schema change, no RLS impact)"
  - "Scope CSS to .notion-view (not :root) so LFPro theme remains untouched globally"
  - "Hook signature accepts boardId AND viewId (not just viewId) so it can fetch via existing useBoardViews query without breaking React Query cache"
  - "getViewStyle is a pure function (not a hook) — testable without React/RTL setup, covers null/invalid defensively"
  - "Setter returns Promise for awaitable callers; no-op when viewId/currentView absent"
metrics:
  duration_secs: 128
  tasks_completed: 5
  files_created: 3
  files_modified: 2
  tests_added: 6
  commits: 5
  completed_at: "2026-05-22T17:42:48Z"
---

# Fase 03 Plano 01: Foundation (tipos, paleta Notion, hook useViewStyle) Summary

Foundation estabelecida para o toggle LFPro <> Notion por view: tipo TypeScript `ViewStyle`, paleta CSS Notion (light + dark) escopada em `.notion-view`, e hook `useViewStyle(boardId, viewId)` que lê e persiste `board_views.config.style` reusando os hooks existentes (`useBoardViews` + `useUpdateBoardViewConfig`). Zero migration SQL, zero impacto no tema LFPro global.

## Tarefas Executadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Adicionar tipo ViewStyle + helpers em database.ts | `044e18f` | src/types/database.ts |
| 2 | Criar src/styles/notion-theme.css (paleta light/dark) | `4a54bc6` | src/styles/notion-theme.css |
| 3 | @import notion-theme.css em src/index.css | `a2c7196` | src/index.css |
| 4 | Criar hook src/hooks/useViewStyle.ts | `1a7baa1` | src/hooks/useViewStyle.ts |
| 5 | Testes unitários getViewStyle (6 cases) | `427571a` | src/test/useViewStyle.test.ts |

## Verificações

- `npx tsc --noEmit` passa sem erros (full project)
- `npx vitest run src/test/useViewStyle.test.ts`: **6/6 testes passam** (930ms)
- Arquivos modificados além de `index.css`: nenhum (conforme critério de não-regressão do plano)
- `import { ViewStyle, getViewStyle, VIEW_STYLE_DEFAULT } from '@/types/database'` valida em tsc
- CSS `--notion-bg` declarado dentro de `.notion-view` (light) e `.dark .notion-view` (dark)

## Decisões Técnicas

1. **Sem migration SQL.** O `board_views.config` é jsonb e já aceita campos arbitrários. Plano 02 e adiante leem/escrevem `config.style` direto via convenção. Decisão alinhada com CONTEXT.md.
2. **Scope `.notion-view` em vez de `:root`.** Garante que o tema LFPro global (Jost/Montserrat + warm gold) continue intacto. Notion só ativa quando o container do view tem a classe.
3. **`getViewStyle` é função pura.** Não é um hook. Permite teste unitário direto (sem RTL, sem QueryClient) e uso defensivo em qualquer lugar (server-side render, type guard, default fallback).
4. **Hook recebe `boardId` + `viewId`.** Necessário porque `useBoardViews` requer `boardId` para fetch. Caller que tem apenas `viewId` precisa propagar `boardId` (já disponível no contexto via `AppContext`).
5. **Setter retorna `Promise`.** Permite `await setStyle('notion')` em handlers que queiram saber quando a persistência conclui (para feedback de UI).

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. Todas as 5 tarefas concluídas em ordem, com texto literal do `<action>` aplicado. Zero auto-correções necessárias.

## Self-Check: PASSOU

Verificações executadas após criação do SUMMARY:

- src/types/database.ts: ENCONTRADO (contém `export type ViewStyle`)
- src/styles/notion-theme.css: ENCONTRADO (contém `--notion-bg` e `.dark .notion-view`)
- src/hooks/useViewStyle.ts: ENCONTRADO
- src/test/useViewStyle.test.ts: ENCONTRADO
- src/index.css: ENCONTRADO (contém `@import "./styles/notion-theme.css"`)
- Commits 044e18f, 4a54bc6, a2c7196, 1a7baa1, 427571a: ENCONTRADOS em `git log`
- `npx tsc --noEmit`: limpo, zero erros
- `vitest run useViewStyle.test.ts`: 6/6 passam

## Próximo Plano

**03-02** (depois disso) deve consumir `useViewStyle` no `DatabaseViewTabs` ou onde o toggle UI viver, e wrapping de `DatabaseViewRenderer` com `<div className={style === 'notion' ? 'notion-view' : ''}>` para ativar a paleta.
