---
phase: 03-views-notion-style-com-toggle-de-estilo
plan: 03-03b
subsystem: database-views
tags: [notion-view, table, inline-edit, sticky-header, item-create]
requirements: [REQ-23, REQ-27]
dependency_graph:
  requires:
    - "NotionColumnIcon (03-03) - icone Lucide por ColumnType"
    - "NotionInlineCell (03-03) - editor polimorfico por column.type"
    - "useApp().activeBoard + setSelectedItem (AppContext, existente)"
    - "useProfiles / useUpdateColumnValue / useCreateItem / useUpdateItem (useSupabaseData.ts, existentes)"
    - ".notion-view CSS scope + var(--notion-*) (03-01)"
    - "DatabaseBoardContext (03-02) - injeta activeBoard"
  provides:
    - "NotionTableHeader - header sticky com NotionColumnIcon + nome por coluna"
    - "NotionTableRow - row compacta (~32px) com titulo editavel + cells inline"
    - "NotionTableView - view principal (substitui stub do plano 03-02)"
  affects:
    - "src/components/database/notion/NotionTableView.tsx (stub 03-02 sobrescrito pela implementacao real)"
tech-stack:
  added: []
  patterns:
    - "Header sticky (top-0 z-10) consumindo var(--notion-header-bg) - efeito 'scroll under' Notion"
    - "Row compacta (--notion-row-h) sem zebra striping; hover via classe notion-row-hover"
    - "Titulo dual-mode: click=onOpen (ItemDetailPanel), dblclick=edita inline (button + state local)"
    - "Inline name input: salva onBlur, Enter blurra, Escape cancela e restora item.name"
    - "Sub-editor pattern: NotionInlineCell notifica via onChange(value, text); View propaga para useUpdateColumnValue"
    - "'+ Novo' inline por group: state local (creatingInGroup, newItemName) controla entrada"
    - "Group header so renderiza quando activeBoard.groups.length > 1 (evita ruido visual em board single-group)"
    - "visibleColumns sorted by position (slice + sort puro, sem mutacao do array do contexto)"
    - "Container dual-mode: 'database' = max-h-[640px] overflow-auto, 'board' = h-full overflow-auto"
key-files:
  created:
    - src/components/database/notion/NotionTableHeader.tsx
    - src/components/database/notion/NotionTableRow.tsx
  modified:
    - src/components/database/notion/NotionTableView.tsx
decisions:
  - "Substituicao do stub via Write (overwrite) em vez de Edit - stub 03-02 era placeholder com texto 'Em construcao'; a forma mais clara e simples e sobrescrever o arquivo inteiro com a implementacao real"
  - "Titulo da row implementado como <button> (nao <div onClick>) - acessibilidade nativa (tab focus, Enter/Space activates), dblclick stopPropagation evita disparar onOpen duplo"
  - "Inline name input usa effect-sync (useEffect com dep item.name) - se o nome mudar externamente (ex: outro usuario via realtime), o localName atualiza sem reset do estado de edicao"
  - "Mutation handleChangeCell passa columnType + itemName + oldValue - useUpdateColumnValue usa esses campos para audit log e automations (campos opcionais, defensivos)"
  - "createItem usa onSuccess callback inline (resetar UI) em vez de useEffect com isPending - mais simples, sem race conditions"
  - "Container mode='database' tem max-h-[640px] (consistente com BoardTable de LFPro embedded em DatabaseListView)"
metrics:
  duration_secs: 111
  tasks_completed: 4
  files_created: 2
  files_modified: 1
  tests_added: 0
  commits: 3
  completed_at: "2026-05-22T17:54:40Z"
---

# Fase 03 Plano 03b: NotionTableView (tabela compacta com edit inline) Summary

Substitui o stub criado no plano 03-02 pela implementacao real de `NotionTableView`. Tabela compacta Notion-style com header sticky (icone do tipo + nome), rows de ~32px sem zebra striping, edicao inline de cells via `NotionInlineCell` (do 03-03), titulo dual-mode (click=abre ItemDetailPanel, dblclick=rename) e botao "+ Novo" inline por group. Wired aos hooks `useUpdateColumnValue` / `useCreateItem` / `useUpdateItem` para mutations Supabase com optimistic update.

## Tarefas Executadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | NotionTableHeader (sticky + column icons) | `8f1fee4` | src/components/database/notion/NotionTableHeader.tsx |
| 2 | NotionTableRow (titulo + cells inline) | `3a3eee8` | src/components/database/notion/NotionTableRow.tsx |
| 3 | Substituir stub NotionTableView pela implementacao real | `6ba3e35` | src/components/database/notion/NotionTableView.tsx |
| 4 | Smoke test (checkpoint:human-verify, auto-PASS modo autonomo) | - | (validacao automatizada via tsc + vitest + dev server) |

## Verificacoes

- `test -f src/components/database/notion/NotionTableHeader.tsx`: ENCONTRADO
- `test -f src/components/database/notion/NotionTableRow.tsx`: ENCONTRADO
- `grep "NotionTableHeader\|NotionTableRow" NotionTableView.tsx`: ENCONTRADO
- `grep "useUpdateColumnValue\|useCreateItem" NotionTableView.tsx`: ENCONTRADO
- `grep "Em construcao (plano 03-03)" NotionTableView.tsx`: AUSENTE (stub sobrescrito)
- `npx tsc --noEmit` (full project): **zero erros**
- `npx vitest run`: **212/212 testes passando** (zero regressao)
- Dev server http://localhost:8080: **HTTP 200** apos HMR reload

## Arquitetura aplicada

```
DatabaseViewRenderer  (style="notion" + viewType="table")
  └─> .notion-view wrapper (CSS scope)
      └─> NotionTableView (este plano)
          ├─> NotionTableHeader (sticky, gutter + Nome + colunas com icone)
          └─> for each group:
              ├─> Group header (so se groups.length > 1)
              ├─> for each item: NotionTableRow
              │     ├─> Titulo dual-mode (click=open, dblclick=edit)
              │     └─> for each column: NotionInlineCell
              │           ├─> onChange(value, text) → handleChangeCell
              │           └─> useUpdateColumnValue.mutate({ itemId, columnId, value, text, boardId, oldValue, columnType, itemName })
              └─> "+ Novo" inline → useCreateItem.mutate({ boardId, groupId, name })
```

## Comportamentos chave

| Acao | Disparo | Resultado |
|------|---------|-----------|
| Click no titulo da row | onClick | setSelectedItem(item) → ItemDetailPanel abre |
| DblClick no titulo | onDoubleClick + stopPropagation | Entra modo inline-edit (input com autoFocus) |
| Enter no input de nome | onKeyDown | Blur programatico → salva via useUpdateItem |
| Escape no input de nome | onKeyDown | Cancela edicao, restora item.name |
| Click em celula | NotionInlineCell switch(type) | Editor inline apropriado abre (text input, native select, date picker, checkbox toggle) |
| Tab/Blur em text/long_text/number | onBlur do sub-editor | onChange propaga, handleChangeCell chama useUpdateColumnValue |
| Change em status/dropdown/date/checkbox | onChange direto | handleChangeCell chama useUpdateColumnValue |
| Click "+ Novo" | onClick | Entra modo inline-create (input com autoFocus) |
| Enter no input de novo item | onKeyDown | useCreateItem.mutate; onSuccess reseta UI |

## Paleta CSS usada (zero warm gold)

Todas as cores via CSS vars do escopo `.notion-view` (definidas em 03-01):

- Container: `--notion-bg`, `--notion-border`
- Header: `--notion-header-bg`, `--notion-text-secondary`
- Group header: `--notion-panel`, `--notion-text-secondary`
- Row: `--notion-border` (border-b), `--notion-row-hover` (via classe `.notion-row-hover`)
- Row min-height: `--notion-row-h`
- Titulo / cells: `--notion-text-primary`, `--notion-text-tertiary` (placeholder "Sem titulo")
- Focus ring (inputs): `--notion-blue`
- Botao "+ Novo": classe `.notion-text-secondary` + `.notion-hover`

Nenhuma referencia a `--primary`, `hsl(29 45% 71%)` (warm gold LFPro), ou variaveis do tema LFPro.

## Decisoes Tecnicas

1. **Stub sobrescrito via Write em vez de Edit.** O stub do plano 03-02 era 31 linhas de placeholder ("Em construcao"). A implementacao real tem 145+ linhas com estrutura diferente. Sobrescrever inteiro e mais claro e seguro que tentar diffs surgicos.
2. **`<button type="button">` para o titulo da row.** Acessibilidade nativa (tab focus, Enter/Space). `onDoubleClick` com `e.stopPropagation()` evita disparar `onOpen` duplo. O `type="button"` previne submit acidental se algum dia a row for embebida em form.
3. **Effect-sync no `localName`.** `useEffect(() => setLocalName(item.name), [item.name])` mantem o estado local sincronizado quando item.name muda externamente (ex: outro usuario rename via Realtime). Sem isso, abrir edicao inline mostraria nome desatualizado.
4. **Mutation passa `columnType` + `itemName` + `oldValue`.** Esses campos opcionais alimentam o sistema de audit log e automations existente (campos ja suportados pelo `useUpdateColumnValue`). Sub-editor nao tem essas infos, View tem.
5. **`useCreateItem` com `onSuccess` callback inline.** Mais simples que monitorar `isPending` via useEffect. O callback so reseta UI; optimistic update do hook ja faz o item aparecer no DOM antes do server response.
6. **Container dual `mode`.** `'database'` com `max-h-[640px]` quando a tabela esta embebida em DatabaseListView (consistente com BoardTable LFPro embedded). `'board'` com `h-full` quando a view e a propria pagina (uso futuro pelo board page).
7. **Group header so se `groups.length > 1`.** Boards single-group nao precisam de cabecalho "Itens" redundante. Multi-group mostra o nome do grupo entre as faixas de items.

## Desvios do Plano

Nenhum. Plano executado exatamente como escrito. As 3 tarefas auto + 1 checkpoint concluidos em ordem com texto literal do `<action>` aplicado. O checkpoint task 4 (human-verify) foi auto-PASS no modo autonomo `/up:executar-fase`, validado por:

- tsc full-project clean
- vitest 212/212 passing
- dev server HTTP 200 com HMR reload bem sucedido
- stub string "Em construcao" ausente do arquivo final
- imports e mutations integrados corretamente

Zero auto-correcoes (Regras 1-5) necessarias.

## Self-Check: PASSOU

Verificacoes apos criacao do SUMMARY:

- src/components/database/notion/NotionTableHeader.tsx: ENCONTRADO (41 linhas)
- src/components/database/notion/NotionTableRow.tsx: ENCONTRADO (99 linhas)
- src/components/database/notion/NotionTableView.tsx: ENCONTRADO (145+ linhas, sem string "Em construcao")
- Commit 8f1fee4 (`feat(03-03b): add NotionTableHeader...`): ENCONTRADO
- Commit 3a3eee8 (`feat(03-03b): add NotionTableRow...`): ENCONTRADO
- Commit 6ba3e35 (`feat(03-03b): replace NotionTableView stub...`): ENCONTRADO
- `npx tsc --noEmit` full project: zero erros
- `npx vitest run`: 212/212 passing
- Dev server (Vite) http://localhost:8080: HTTP 200

## Proximo Plano

**03-04** (NotionKanbanView) consome os mesmos primitivos:

- `useApp().activeBoard` + groupBy=status column → colunas Kanban
- `StatusPill` (do 03-03) nos chips de status
- `PersonAvatar` (do 03-03) nos avatares dos cards
- `NotionInlineCell` (do 03-03) opcional nos campos visiveis no card
- Substitui o stub `NotionKanbanView` criado no 03-02

Sequencia esperada: 03-04 (Kanban) → 03-05 (Calendar) → 03-06 (List) → 03-07 (polish/integration final + smoke test manual end-to-end).
