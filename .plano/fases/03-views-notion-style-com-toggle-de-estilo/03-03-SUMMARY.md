---
phase: 03-views-notion-style-com-toggle-de-estilo
plan: 03-03
subsystem: database-views
tags: [notion-view, helpers, icons, inline-editor, visual-primitives, column-cells]
requirements: [REQ-23, REQ-24, REQ-25, REQ-26, REQ-27]
dependency_graph:
  requires:
    - "ColumnType (src/types/board.ts) - existing"
    - "Column, ColumnValue, ColumnSettings, StatusLabel (src/types/board.ts) - existing"
    - "cn helper (src/lib/utils.ts) - existing"
    - "notion-theme.css variables (CSS scope .notion-view) - from 03-01"
    - "lucide-react (Type, AlignLeft, CircleDot, Calendar, Users, Hash, CheckSquare, List, Check)"
  provides:
    - "NotionColumnIcon component (mapeia ColumnType -> lucide icon)"
    - "StatusPill visual primitive (var(--notion-status-{color}-bg) + fallback gray)"
    - "PersonAvatar visual primitive (initials ou avatar_url, paleta neutra)"
    - "NotionInlineCell editor polimorfico (despacha por column.type para 8 sub-editores)"
    - "PeopleReadOnly (component interno, agrega ate 3 avatars + contador +N)"
  affects:
    - "Nenhum arquivo existente modificado - so criou 2 novos componentes"
tech-stack:
  added: []
  patterns:
    - "Editor polimorfico via switch(column.type) sem Radix Popover (CONTEXT.md exige edit inline)"
    - "Inputs livres (text/long_text/number) salvam onBlur; selects/checkbox/date salvam onChange direto"
    - "Callback onChange(value, text?) no caller (NotionTableView) chama useUpdateColumnValue - separacao de concerns"
    - "Primitivos visuais (StatusPill, PersonAvatar) reusaveis em todas as 4 Notion views (Kanban/Calendar/List/Table)"
    - "Defensive fallback para tipos nao mapeados (NotionColumnIcon retorna Type)"
key-files:
  created:
    - src/components/database/notion/notionColumnIcon.tsx
    - src/components/database/notion/notionInlineCell.tsx
  modified: []
decisions:
  - "Selects HTML5 nativos para Status/Dropdown em vez de Radix Popover - exigencia CONTEXT.md (edit inline sem popover)"
  - "People read-only no MVP - edicao via ItemDetailPanel global (abre via row click no NotionTableView)"
  - "Sub-editores NAO chamam Supabase direto - apenas notificam pai via onChange. Caller orquestra useUpdateColumnValue com { itemId, columnId, value, text, boardId }"
  - "StatusPill default fallback para 'gray' quando label.color invalido/ausente - protege contra dados sujos"
  - "PersonAvatar mostra ate 3 avatars + contador '+N' para nao quebrar layout em rows com muitas pessoas"
  - "Number input: valida NaN antes de propagar (evita salvar NaN em colunas numericas)"
  - "Date input: slice(0, 10) para extrair YYYY-MM-DD de timestamps ISO (input HTML5 type='date' exige esse formato)"
metrics:
  duration_secs: 86
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  tests_added: 0
  commits: 2
  completed_at: "2026-05-22T17:47:04Z"
---

# Fase 03 Plano 03: Helpers compartilhados (icones + cell editors) Summary

Primitivos visuais (`NotionColumnIcon`, `StatusPill`, `PersonAvatar`) e editor inline polimorfico (`NotionInlineCell`) que serao consumidos pelos 4 Notion*Views dos planos seguintes (03-03b NotionTable, 03-04 Kanban, 03-05 Calendar, 03-06 List). Sem este plano, os views nao tem como renderizar status pills coerentes, avatares Notion ou cells editaveis inline.

## Tarefas Executadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | NotionColumnIcon helper (ColumnType -> lucide icon) | `49e2fe5` | src/components/database/notion/notionColumnIcon.tsx |
| 2 | NotionInlineCell editor + StatusPill + PersonAvatar | `325dadf` | src/components/database/notion/notionInlineCell.tsx |

## Verificacoes

- `test -f src/components/database/notion/notionColumnIcon.tsx`: ENCONTRADO
- `test -f src/components/database/notion/notionInlineCell.tsx`: ENCONTRADO
- `grep "export const StatusPill"`: ENCONTRADO
- `grep "export const PersonAvatar"`: ENCONTRADO
- `grep "export const NotionInlineCell"`: ENCONTRADO
- `grep "NotionColumnIcon"`: ENCONTRADO
- `npx tsc --noEmit` (full project): **passa zero erros**
- Synthetic import smoke (imports todos os exports + monta JSX com Column/ColumnValue + props): **tsc passa**
- Dev server http://localhost:8080: **HTTP 200** (Vite OK, sem erros de bundling)

## Mapeamento ColumnType -> Icone (Task 1)

| Tipo | Icone Lucide |
|------|--------------|
| text | Type |
| long_text | AlignLeft |
| status | CircleDot |
| date | Calendar |
| people | Users |
| number | Hash |
| checkbox | CheckSquare |
| dropdown | List |
| outros (fallback) | Type |

Default size: `w-3.5 h-3.5 shrink-0` (override via prop `className`).

## Comportamento de salvamento por tipo (Task 2)

| Tipo | Estrategia |
|------|------------|
| text | onBlur (apos perder foco), tambem Enter (blur programatico) |
| long_text | onBlur |
| number | onBlur, valida NaN antes de propagar |
| checkbox | onClick direto |
| date | onChange direto (input HTML5 type='date') |
| status | onChange direto (select nativo HTML5) |
| dropdown | onChange direto (select nativo HTML5) |
| people | **read-only** (sem edicao inline; via ItemDetailPanel) |

Sub-editores **NAO chamam Supabase** - apenas notificam pai via `onChange(value, text)`. Caller (NotionTableView no plano 03-03b) propaga para `useUpdateColumnValue({ itemId, columnId, value, text, boardId })`.

## Paleta CSS usada (zero warm gold)

Variaveis consumidas (todas do `notion-theme.css` do plano 03-01):

- `--notion-bg`, `--notion-border`, `--notion-panel`
- `--notion-text-primary`, `--notion-text-secondary`, `--notion-text-tertiary`
- `--notion-status-{red,orange,yellow,green,blue,purple,pink,gray}` + `*-bg`
- `--notion-blue` (ring focus + checkbox marcado)
- Classes utilitarias do tema: `.notion-hover`, `.notion-text-secondary`, `.notion-text-tertiary`

Nao ha referencia a `hsl(29 45% 71%)` (warm gold LFPro), `--primary`, ou outras vars do tema LFPro neste arquivo.

## Decisoes Tecnicas

1. **Select HTML5 nativo em vez de Radix Popover.** CONTEXT.md exige "edit inline sem popover". Selects nativos abrem dropdown OS-level, alinham com a sensacao Notion (sem overlay flutuante para mudancas de status/dropdown).
2. **People read-only no MVP.** Edicao multi-select de pessoas requer UX mais rico (busca, autocomplete, lista de profiles). Vai pelo ItemDetailPanel global, que ja tem essa UI. Inline cell so renderiza avatars + contador.
3. **Sub-editores nao tocam Supabase.** Separacao de concerns: editor visual (puro) vs mutation (caller). Permite testar editores sem QueryClient e reusar `useUpdateColumnValue` que ja existe (`src/hooks/useSupabaseData.ts:594`).
4. **StatusPill fallback gray.** Se `label.color` for invalido ou indefinido (dados sujos do passado), cai para `--notion-status-gray-bg` em vez de quebrar visualmente. CSS variable fallback chain dentro da `style` prop.
5. **PersonAvatar trunca em 3.** Layout de row em NotionTable pode ter cells estreitas - mostrar mais que 3 avatars destruiria espacamento. Contador `+N` resolve.
6. **NumberInlineEditor valida NaN.** `Number('')` retorna 0, `Number('abc')` retorna NaN. Trim + check explicito evita salvar NaN em colunas numericas (problema em queries downstream).
7. **DateInline usa slice(0,10).** Input HTML5 `type='date'` so aceita formato `YYYY-MM-DD`. Se valor vier como ISO timestamp (`2026-05-22T17:45:38Z`), slice extrai a parte da data sem quebrar o input.

## Contrato de uso (callers nos proximos planos)

```tsx
// Exemplo de uso no NotionTableView (plano 03-03b):
import { NotionInlineCell, StatusPill, PersonAvatar } from '@/components/database/notion/notionInlineCell';
import { NotionColumnIcon } from '@/components/database/notion/notionColumnIcon';
import { useUpdateColumnValue } from '@/hooks/useSupabaseData';

const updateColumnValue = useUpdateColumnValue();

<NotionInlineCell
  column={col}
  value={item.columnValues[col.id]}
  profiles={profiles}
  onChange={(value, text) => updateColumnValue.mutate({
    itemId: item.id,
    columnId: col.id,
    value,
    text,
    boardId: board.id,
  })}
/>
```

## Desvios do Plano

Nenhum - plano executado exatamente como escrito. As 2 tarefas concluidas em ordem com o conteudo literal dos blocos `<action>` aplicado. Zero auto-correcoes necessarias. Zero issues fora do escopo descobertos.

## Self-Check: PASSOU

Verificacoes apos criacao do SUMMARY:

- src/components/database/notion/notionColumnIcon.tsx: ENCONTRADO (28 linhas)
- src/components/database/notion/notionInlineCell.tsx: ENCONTRADO (241 linhas)
- Commit 49e2fe5 (`feat(03-03): add NotionColumnIcon helper...`): ENCONTRADO em `git log`
- Commit 325dadf (`feat(03-03): add Notion inline cell editor...`): ENCONTRADO em `git log`
- Synthetic import smoke (todos os 4 exports + JSX): tsc passa
- `npx tsc --noEmit` full project: zero erros
- Dev server (Vite): HTTP 200

## Proximo Plano

**03-03b** consome estes helpers para construir o `NotionTableView` propriamente dito:

1. Renderiza header com `<NotionColumnIcon type={col.type} />` ao lado do titulo
2. Cada celula da grid usa `<NotionInlineCell column={col} value={item.columnValues[col.id]} ... />`
3. `onChange` propaga para `useUpdateColumnValue` (callback do caller)
4. People cells via `<PersonAvatar />` (read-only inline)
5. Status cells via `<StatusPill />` quando read-only mode (ex: agrupamento por status no Kanban do 03-04)
