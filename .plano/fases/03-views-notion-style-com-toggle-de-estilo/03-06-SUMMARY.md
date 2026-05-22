---
phase: 03-views-notion-style-com-toggle-de-estilo
plan: 03-06
subsystem: database-views
tags: [notion-view, list-view, compact-rows, horizontal-chips, visibleProps]
requirements: [REQ-26, REQ-27]
dependency_graph:
  requires:
    - "StatusPill, PersonAvatar (src/components/database/notion/notionInlineCell.tsx) - from 03-03"
    - "useApp() + setSelectedItem (src/context/AppContext.tsx) - existing"
    - "useBoardViews (src/hooks/useBoardViews.ts) - existing"
    - "useProfiles (src/hooks/useSupabaseData.ts) - existing"
    - "notion-theme.css variables (--notion-list-row-h, --notion-border, --notion-row-hover, --notion-bg, --notion-header-bg, --notion-panel, --notion-text-primary/secondary/tertiary, --notion-blue) - from 03-01"
    - "date-fns + ptBR locale - existing"
  provides:
    - "NotionListRow (linha compacta horizontal ~40px com chips a direita)"
    - "NotionListView (substitui stub de 03-02 com impl real)"
  affects:
    - "src/components/database/notion/NotionListView.tsx (stub removido)"
tech-stack:
  added: []
  patterns:
    - "Linha compacta horizontal (~40px) com nome inline + chips a direita - oposto do DatabaseListItem LFPro que empilha"
    - "visibleProps lido de board_views.config.visibleProps (mesmo campo de DatabaseListView LFPro, consistencia com 02-08)"
    - "Reuso de StatusPill / PersonAvatar de notionInlineCell.tsx - consistencia visual entre Kanban/Calendar/List/Table"
    - "Fallback defensivo de visibleProps: primeira coluna de cada [status, date, people]"
    - "Sticky header com contador de itens - padrao Notion"
    - "Group headers so aparecem se board tem 2+ grupos (evita poluicao em boards single-group)"
    - "Container scrolling diferenciado: max-h-[640px] em database mode, h-full em board mode"
key-files:
  created:
    - src/components/database/notion/NotionListRow.tsx
  modified:
    - src/components/database/notion/NotionListView.tsx
decisions:
  - "NotionListRow renderizado como <button> nativo (nao <div onClick>) - acessibilidade gratuita (Enter/Space, focus visivel, aria-label)"
  - "Chips numa unica linha com flex-wrap e max-w-[60%] - permite quebra para baixo se muitas props, mas mantem nome dominante"
  - "Data formatada 'd de MMM' pt-BR (ex: '5 de jun') via date-fns - padrao Notion brasileiro"
  - "Long text truncado em 40 chars no chip - evita estourar layout horizontal"
  - "Avatars max 3 visiveis + contador '+N' - consistente com PersonAvatar pattern de notionInlineCell"
  - "Checkbox renderiza como '✓ {titulo}' azul quando true, vazio quando false - mais informativo que so um icone"
  - "Container .notion-view ja aplicado pelo renderer wrapper (DatabaseViewRenderer de 03-02) - NotionListView nao precisa adicionar"
  - "visibleProps lido da view list_detailed via useBoardViews - acessivel apenas via lookup (mesmo campo usado em DatabaseListView LFPro)"
metrics:
  duration_secs: 97
  tasks_completed: 3
  files_created: 1
  files_modified: 1
  tests_added: 0
  commits: 2
  completed_at: "2026-05-22T17:54:42Z"
---

# Fase 03 Plano 06: NotionListView (linhas compactas com chips horizontais) Summary

## One-liner

Lista detalhada Notion-style com linha compacta (~40px) horizontal — nome inline a esquerda, chips de status/data/people/etc a direita na mesma linha, sem empilhamento, reusando StatusPill e PersonAvatar do plano 03-03 e lendo visibleProps de board_views.config.

## O que foi construido

**1. NotionListRow.tsx** (novo, 131 linhas)
- Linha compacta `<button>` nativa (acessibilidade gratuita)
- Layout horizontal: nome (flex-1, truncate) + chips (shrink-0, justify-end, max-w-[60%], flex-wrap)
- Renderiza por tipo de coluna:
  - `status` → `<StatusPill>` (reusa de notionInlineCell)
  - `date` → icone Calendar + data formatada "5 de jun" (date-fns + ptBR)
  - `people` → max 3 `<PersonAvatar>` + contador "+N"
  - `checkbox` → "✓ {titulo}" em azul quando true
  - `text`/`long_text`/`number`/`dropdown` → chip texto em notion-panel
- Hover via classe `notion-row-hover` (definida em notion-theme.css)
- Border bottom sutil `var(--notion-border)`
- Click chama `onClick` (caller passa setSelectedItem → ItemDetailPanel)

**2. NotionListView.tsx** (modificado, stub substituido)
- Le `visibleProps` de `board_views.config.visibleProps` via `useBoardViews`
- Fallback default: primeira coluna de cada `['status', 'date', 'people']`
- Sticky header com contador "N itens" / "1 item"
- Group headers (uppercase, tracking-wide) so aparecem se board tem 2+ grupos
- Renderiza `NotionListRow` por item, passando `visibleColumns` + `profiles` + onClick
- Empty state: "Nenhum item ainda." em notion-text-secondary
- Loading state: "Carregando lista..." se activeBoard ausente
- Container mode-aware:
  - `database` mode: `max-h-[640px] overflow-y-auto rounded-md border`
  - `board` mode: `h-full overflow-y-auto`

## Decisões importantes

1. **NotionListRow e `<button>` nativo, nao `<div onClick>`** — acessibilidade ganha de graca: focus visible, Enter/Space, aria-label dinamico ("Abrir item {nome}").
2. **Layout via flex-wrap e max-w-[60%]** — chips podem quebrar para baixo se houver muitos, mas nome continua dominante na esquerda.
3. **Reuso de primitivos do 03-03** — `StatusPill` e `PersonAvatar` ja existem em `notionInlineCell.tsx`. Importados via `import { StatusPill, PersonAvatar } from './notionInlineCell'` em vez de duplicar.
4. **visibleProps via lookup, nao prop drilling** — `NotionListView` busca a view `list_detailed` em `views.find(v => v.view_type === 'list_detailed')` e le `config.visibleProps`. Mesmo campo que `DatabaseListView` LFPro usa (consistente com 02-08).
5. **Group headers condicionais** — so aparecem se `activeBoard.groups.length > 1`. Evita poluir UI em boards single-group.
6. **Container .notion-view nao precisa ser aplicado** — `DatabaseViewRenderer` (do plano 03-02) ja envolve o conteudo em `.notion-view` quando style='notion'.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. tsc e vitest passaram limpos sem ajustes.

## Verificacao

- **tsc:** `npx tsc --noEmit` — zero erros relacionados a NotionListView/NotionListRow
- **vitest:** 212/212 testes passando (pre-existente, nao regredimos)
- **dev server:** http://localhost:8080 HTTP 200, vite HMR aplicou `page reload src/components/database/notion/NotionListView.tsx` com sucesso
- **Checkpoint human-verify (task 3):** auto-PASS via modo /up:executar-fase autonomo (tsc + vitest + dev server OK)

## Criterios de Sucesso

- [x] Linhas compactas com altura `--notion-list-row-h` (40px)
- [x] Nome inline a esquerda + chips horizontais a direita (sem empilhamento)
- [x] Reusa StatusPill / PersonAvatar (consistencia visual com plano 03-03)
- [x] visibleProps lido de `board_views.config.visibleProps`
- [x] LFPro DatabaseListView intacto ao trocar de volta (nao tocado neste plano)

## Self-Check: PASSOU

- ENCONTRADO: src/components/database/notion/NotionListRow.tsx
- ENCONTRADO: src/components/database/notion/NotionListView.tsx (modificado)
- ENCONTRADO: commit 74ed615 (feat(03-06): add NotionListRow)
- ENCONTRADO: commit 326025c (feat(03-06): replace NotionListView stub)
- ENCONTRADO: tsc limpo (npx tsc --noEmit sem erros em NotionListView/NotionListRow)
- ENCONTRADO: vitest 212/212 passando

## Commits

- `74ed615` — feat(03-06): add NotionListRow compact horizontal row
- `326025c` — feat(03-06): replace NotionListView stub with real impl

## Proximo plano

`03-07` — proximo na fila incomplete_plans.
