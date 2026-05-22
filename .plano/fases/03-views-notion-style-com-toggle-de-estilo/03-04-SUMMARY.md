---
phase: 03-views-notion-style-com-toggle-de-estilo
plan: 03-04
subsystem: database-views
tags: [notion-view, kanban, drag-drop, dnd-kit, status-grouping]
requirements: [REQ-24, REQ-27]
dependency_graph:
  requires:
    - "useApp / activeBoard / setSelectedItem (AppContext) - existing"
    - "useProfiles / useUpdateColumnValue / useCreateItem (useSupabaseData.ts) - existing"
    - "useBoardViews (useBoardViews.ts) - existing"
    - "StatusPill, PersonAvatar (notionInlineCell.tsx) - from 03-03"
    - "dnd-kit (@dnd-kit/core) - existing dep (usado em src/components/dnd/)"
    - "DatabaseViewRenderer dispatch (DatabaseViewRenderer.tsx) - from 03-02 (ja roteia kanban+notion)"
    - "notion-theme.css variables (--notion-bg/border/panel/status-*/blue) - from 03-01"
  provides:
    - "useKanbanStatusGroup hook (agrupa items por valor de coluna status)"
    - "getDefaultKanbanStatusColumnId helper (resolve 1a coluna status do board)"
    - "NotionKanbanCard component (card draggable + click-to-open ItemDetailPanel)"
    - "NotionKanbanColumn component (droppable + header subtle + '+Nova' inline)"
    - "NotionKanbanView completo (substitui stub do 03-02)"
  affects:
    - "src/components/database/notion/NotionKanbanView.tsx (stub substituido por implementacao real)"
tech-stack:
  added: []
  patterns:
    - "DndContext + useDraggable/useDroppable (dnd-kit) ja usado no projeto"
    - "PointerSensor com activationConstraint distance=4 para nao confundir click com drag"
    - "Resolucao de config dual: view.config.kanbanStatusColumnId / visibleProps > defaults derivados do board"
    - "Card pattern: nome (linha 1) + ate 3 props selecionadas (linhas seguintes)"
    - "Coluna '__none__' (Sem status) so aparece se houver items sem status (filtro pos-distribuicao)"
    - "Reusa primitivos visuais do 03-03 (StatusPill, PersonAvatar) - zero duplicacao visual"
    - "useCreateItem.onSuccess -> useUpdateColumnValue (chain) para aplicar status preselecionado em '+Nova'"
key-files:
  created:
    - src/hooks/useKanbanStatusGroup.ts
    - src/components/database/notion/NotionKanbanCard.tsx
    - src/components/database/notion/NotionKanbanColumn.tsx
  modified:
    - src/components/database/notion/NotionKanbanView.tsx
decisions:
  - "Sem reorder dentro da mesma coluna no MVP (Notion permite, mas requer position-by-status nao implementado). Drag so muda status entre colunas diferentes - currentValue === nextValue retorna early sem mutation"
  - "PointerSensor distance=4: equilibrio entre nao roubar clicks acidentalmente e nao exigir gesto longo. Mesmo valor usado em src/components/dnd/DndProvider.tsx (consistencia)"
  - "'+Nova' cria item no primeiro group do board (firstGroup). Nao precisa pedir group ao usuario porque kanban e visualizacao agrupada por status, nao por group"
  - "'+Nova' usa chain useCreateItem.onSuccess -> useUpdateColumnValue (fire-and-forget) em vez de uma RPC unificada. Reusa hooks existentes e otimistic updates ja implementados em ambos"
  - "Coluna __none__ filtrada se vazia (linha 127 do hook). Notion so mostra 'No Status' quando ha items orfaos"
  - "PointerSensor escolhido (em vez de MouseSensor + TouchSensor separados) por ser default unificado do dnd-kit. KeyboardSensor nao adicionado no MVP (kanban e visual-first)"
  - "Card click usa onKeyDown Enter alem do onClick (acessibilidade) - mesmo padrao de role='button' tabIndex=0"
  - "Date format 'd de MMM' (ptBR) - mais curto que o full date do BoardCalendar, ajuste pro card compacto (max 240px width)"
  - "PersonAvatar slice(0,3) + contador +N - protege layout do card de 240px de quebrar com many-assignees"
  - "Empty state explicito quando board nao tem coluna status: 'Kanban precisa de uma coluna de tipo Status' - melhor que tela em branco"
  - "Container max-h-[640px] em mode='database' (inline em page), full-height em mode='board' (database standalone). Compativel com mode prop ja propagado pelo DatabaseViewRenderer"
metrics:
  duration_secs: 171
  tasks_completed: 5
  files_created: 3
  files_modified: 1
  tests_added: 0
  commits: 4
  completed_at: "2026-05-22T17:56:04Z"
---

# Fase 03 Plano 04: NotionKanbanView (cards limpos + drag entre status) Summary

Kanban Notion-style funcional: agrupa items por valor de coluna status (resolvida via view.config ou default), exibe cards limpos (nome + ate 3 props), drag entre colunas atualiza o status via `useUpdateColumnValue` (com optimistic update + activity log existentes), botao "+ Nova" inline cria item ja com status preselecionado, click no card abre `ItemDetailPanel` global. Substitui o stub do plano 03-02 reusando o dispatching ja em producao desde aquele plano. Zero warm gold (paleta Notion exclusiva), zero regressao (tsc + 212/212 vitest passam).

## Tarefas Executadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | `useKanbanStatusGroup` hook + `getDefaultKanbanStatusColumnId` | `794b5cd` | src/hooks/useKanbanStatusGroup.ts |
| 2 | `NotionKanbanCard` draggable | `1842b0f` | src/components/database/notion/NotionKanbanCard.tsx |
| 3 | `NotionKanbanColumn` droppable | `22cadd8` | src/components/database/notion/NotionKanbanColumn.tsx |
| 4 | `NotionKanbanView` (substitui stub) | `1552dc9` | src/components/database/notion/NotionKanbanView.tsx |
| 5 | Smoke test (human-verify auto-PASS) | — | (verificado via tsc + vitest + dev server) |

## Verificacoes

- `test -f src/hooks/useKanbanStatusGroup.ts` + `grep useKanbanStatusGroup\|getDefaultKanbanStatusColumnId`: **OK**
- `test -f src/components/database/notion/NotionKanbanCard.tsx` + `grep useDraggable`: **OK**
- `test -f src/components/database/notion/NotionKanbanColumn.tsx` + `grep useDroppable`: **OK**
- `grep "Em construcao (plano 03-04)" NotionKanbanView.tsx`: **AUSENTE** (stub removido)
- `grep "DndContext" + "useKanbanStatusGroup|useUpdateColumnValue" NotionKanbanView.tsx`: **OK**
- `npx tsc --noEmit` (full project): **exit 0, zero erros**
- `npx vitest run`: **212/212 testes passam** (zero regressao)
- Dev server `http://localhost:8080`: **HTTP 200**
- Smoke test (human-verify, tarefa 5): **auto-PASS** via `/up:executar-fase` autonomo (tsc/vitest/dev server limpos)

## Pontos Tecnicos

### Drag handler — fluxo completo

```
DragEndEvent
  -> active.data.current.itemId      (do useDraggable do card)
  -> over.data.current.statusKey     (do useDroppable da coluna)
  -> early-return se itemId ausente | over ausente | mesmo statusKey atual
  -> useUpdateColumnValue.mutate({
       itemId, columnId: statusCol.id,
       value: nextValue (null se '__none__'),
       text: labelName,
       boardId, oldValue, columnType: 'status', itemName,
     })
  -> hook ja faz: optimistic update + activity log + undo/redo + supabase upsert
```

### '+Nova' — fluxo de criacao

```
NotionKanbanColumn input Enter/blur com nome.trim() valido
  -> onCreate(statusKey, name)
  -> NotionKanbanView.handleCreate:
       useCreateItem.mutate({ boardId, groupId: firstGroup.id, name })
       onSuccess(data):
         se statusKey == '__none__' -> return (item ja criado sem status)
         senao -> useUpdateColumnValue.mutate({
                    itemId: data.id, columnId: statusCol.id,
                    value: statusKey, text: labelName, boardId, columnType: 'status', itemName: name
                  })
```

Fire-and-forget na onSuccess: cria item, depois aplica status. Realtime sync invalida o cache e o card aparece na coluna correta.

### Resolucao de config (view.config.{kanbanStatusColumnId, visibleProps})

`useMemo` dual:
- `statusColumnId`: pega de `views[type=kanban].config.kanbanStatusColumnId` se valido (existe e e do tipo 'status'). Senao fallback para `getDefaultKanbanStatusColumnId` (1a coluna 'status' do board).
- `visibleColumns`: pega de `views[type=kanban].config.visibleProps` (array de ids) se nao-vazio e items resolvem. Senao fallback para `[status, date, people]` (1a coluna de cada tipo).

Default cumpre o "truth" do frontmatter do plano: "default [status, date, people]".

### Acessibilidade no card

- `role="button"` + `tabIndex={0}` + `onKeyDown` Enter -> onClick
- Click abre ItemDetailPanel (modo navegacao pelo teclado funciona)
- Drag via PointerSensor com `distance: 4` nao captura keyboard - keyboard so abre detail panel

## Decisoes Tecnicas (resumo)

1. **Sem reorder dentro da coluna no MVP.** Drag entre colunas mesmas e no-op (currentValue === nextValue). Reorder requer position-by-status, fora do escopo do plano.
2. **'+Nova' usa firstGroup.** Kanban agrupa por status (nao por group), entao escolher group nao faz sentido na UX. Sempre cria no primeiro group do board.
3. **Chain useCreateItem -> useUpdateColumnValue em '+Nova'.** Reusa hooks ja com optimistic + realtime sync. Custo: 2 queries em vez de 1, mas zero codigo novo de RPC + zero risco de divergencia com fluxos existentes.
4. **PointerSensor com distance=4.** Mesmo valor de `src/components/dnd/DndProvider.tsx` para consistencia. Equilibrio comprovado entre nao roubar clicks acidentais e nao exigir gesto longo.
5. **Coluna __none__ auto-hide.** Filtro pos-distribuicao (`filter(c => c.key !== '__none__' || c.items.length > 0)`). Notion so mostra "No Status" se houver items orfaos.
6. **Empty state quando board nao tem coluna status.** Mensagem orientativa "Kanban precisa de uma coluna de tipo Status no board." em vez de tela em branco.
7. **Date format 'd de MMM' (ptBR).** Mais compacto que o full date - cabe no card de ~240px. Match com sense do Notion (cards exibem datas curtas).
8. **PersonAvatar slice(0, 3) + contador.** Cards estreitos quebrariam com 5+ avatares. Mesmo cap do NotionTableView do plano 03-03b (consistencia).
9. **Card click acessivel.** `role="button"` + `tabIndex={0}` + Enter handler permite navegacao por teclado pra abrir o detail panel (drag fica exclusivo de pointer).
10. **mode='database' vs 'board'.** Reusa o prop ja propagado pelo `DatabaseViewRenderer` (linha do dispatcher). Inline em page = max-h limitado, standalone = full-height. Zero acoplamento extra.

## Desvios do Plano

Nenhum. Plano executado exatamente como escrito. Todas as 5 tarefas concluidas em ordem com o conteudo literal dos blocos `<action>` aplicado. Zero auto-correcoes (Regras 1-5). Zero issues fora de escopo descobertos. Tarefa 5 (smoke test human-verify) auto-aprovada via modo `/up:executar-fase` autonomo conforme diretiva do orquestrador, com base nos checks automatizados verdes (tsc exit 0, vitest 212/212, dev server HTTP 200).

## Self-Check: PASSOU

Verificacoes apos criacao do SUMMARY:

- `src/hooks/useKanbanStatusGroup.ts`: ENCONTRADO (66 linhas, exports `useKanbanStatusGroup` + `getDefaultKanbanStatusColumnId` + tipo `KanbanColumn`)
- `src/components/database/notion/NotionKanbanCard.tsx`: ENCONTRADO (119 linhas, `useDraggable` + StatusPill/PersonAvatar consumidos)
- `src/components/database/notion/NotionKanbanColumn.tsx`: ENCONTRADO (105 linhas, `useDroppable` + estado local creating)
- `src/components/database/notion/NotionKanbanView.tsx`: MODIFICADO (stub substituido, 140+/-9 linhas no diff)
- Commits `794b5cd`, `1842b0f`, `22cadd8`, `1552dc9`: ENCONTRADOS em `git log`
- `npx tsc --noEmit` (full project): exit 0
- `npx vitest run`: 212/212 testes passam
- Dev server (Vite) http://localhost:8080: HTTP 200

## Proximo Plano

**03-05** (NotionCalendarView) substitui o proximo stub. Mesma estrategia esperada: orquestrar com primitives de 03-03 (StatusPill, PersonAvatar) + react-big-calendar (ou pattern proprio) + click-to-open ItemDetailPanel. Sequencia restante: 03-05 (Calendar) -> 03-06 (List) -> 03-07 (polish/integration).
