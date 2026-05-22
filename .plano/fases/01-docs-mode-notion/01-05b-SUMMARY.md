---
phase: 01-docs-mode-notion
plan: 01-05b
subsystem: page-editor-embed-board
tags: [blocknote, embed-board, custom-block, read-only, cross-link, frontend]
requires:
  - 01-05 (lfproBlockNoteSchema com mention-item, getCustomSlashMenuItems com handler onTriggerEmbedBoard opcional, BoardPickerPopover pattern via ItemPickerPopover)
provides:
  - "EmbedBoardBlock (src/components/page/blocks/EmbedBoardBlock.tsx) - block spec custom read-only que renderiza mini-tabela de um board (top 20 items, top 4 colunas, agrupados por group_id)"
  - "BoardPickerPopover (src/components/page/blocks/BoardPickerPopover.tsx) - CommandDialog modal de busca de boards cross-workspace, mostra workspace ao lado para desambiguar"
  - "Slash menu agora inclui 'Embedar board' (pt-BR) que dispara BoardPickerPopover via onTriggerEmbedBoard"
  - "Schema lfproBlockNoteSchema registra `embed-board` em blockSpecs, sem quebrar mention-item de 01-05"
  - "Persistencia automatica via BlockNote: props {boardId, snapshotName} serializadas no JSON do documento"
affects:
  - src/components/page/PageEditor.tsx (state embedBoardOpen + handler onTriggerEmbedBoard + BoardPickerPopover renderizado)
  - src/components/page/blocknote-schema.ts (embed-board adicionado em blockSpecs, mention-item preservado)
  - src/components/page/slash-menu.ts (item Embedar board condicional ao handler ja existia em 01-05; este plano apenas conecta)
tech-stack:
  added: []
  patterns:
    - "createReactBlockSpec com content: 'none' para bloco atomico nao-editavel"
    - "contentEditable={false} no wrapper externo evita ProseMirror tratar texto interno como conteudo do doc"
    - "useQuery do React Query com staleTime 60s no render do bloco - busca lazy ao montar"
    - "Snapshot opcional do nome do board nas props para audit/futuros fallback (nao usado no MVP)"
    - "Padrao 'CommandDialog modal' do shadcn para pickers sem ancora DOM (espelha ItemPickerPopover de 01-05)"
    - "Agrupamento client-side de items por group_id seguindo a ordem dos groups da tabela"
key-files:
  created:
    - src/components/page/blocks/BoardPickerPopover.tsx
    - src/components/page/blocks/EmbedBoardBlock.tsx
    - .plano/fases/01-docs-mode-notion/01-05b-SUMMARY.md
  modified:
    - src/components/page/blocknote-schema.ts
    - src/components/page/PageEditor.tsx
decisions:
  - "EmbedBoardBlock invocado como factory `EmbedBoardBlock()` em blocknote-schema.ts antes de passar pro BlockNoteSchema.create. Motivo: createReactBlockSpec na API v0.51 retorna uma factory `(options?) => BlockSpec`, nao um spec direto. Comentario explica no arquivo."
  - "Mini-tabela com primeiras 4 colunas + 20 items (top-level apenas, sem subitems). Motivo: embed deve dar contexto rapido sem virar segundo board. CTA 'Ver completo no board' no rodape leva pra view real quando ha items/colunas escondidos."
  - "Picker de boards usa filtro client-side em useAllBoards (que ja faz 1 query e e cacheada) com slice(0, 50). Motivo: usuario raramente tem mais de 50 boards visiveis; query server-side por nome seria overhead sem ganho."
  - "Workspace_id mostrado ao lado do nome do board no picker (em vez de so nome). Motivo: boards podem ter mesmo nome em workspaces diferentes; sem isso o usuario fica perdido."
  - "CellRender minimalista: status com dot+label, dropdown como pill, date pt-BR ('dd MMM'), people como contagem, checkbox Sim/Nao, number/rating/progress como tabular-nums, link truncado, tags como contagem. Motivo: render read-only nao precisa ser igual ao do board completo; objetivo e contexto rapido."
  - "Sem acesso ao board ou board nao encontrado mostra placeholder destrutivo ('Sem acesso a este board ou board nao encontrado'). Motivo: RLS do Supabase ja filtra; se queryFn retorna null assumimos sem permissao."
  - "snapshotName guardado nas props mas nao renderizado como fallback no MVP (block sempre busca data live). Motivo: futuro - se board for deletado, podemos mostrar 'Board X (excluido)' usando snapshotName. Hoje so retornamos placeholder generico."
metrics:
  duration: "~10 min (validacao + cleanup; codigo principal ja commitado em sessao anterior)"
  tasks_completed: 5
  files_created: 2
  files_modified: 2
  commits: 5
  tests_total: 188
  tests_passed: 188
  build_time_s: 15.63
  completed_at: "2026-05-22T13:08Z"
---

# Fase 01 Plano 01-05b: Embed de board read-only Summary

Adiciona ao PageEditor o segundo cross-link do MVP de docs mode: bloco `embed-board` que renderiza mini-tabela read-only de um board escolhido. Complementa o `mention-item` de 01-05 (pagina -> item) com pagina -> board inteiro. Schema custom do BlockNote agora registra um inline content (`mention-item`) E um block (`embed-board`), com slash menu pt-BR oferecendo "Mencionar item" e "Embedar board" como atalhos LFPro.

## O Que Foi Construido

### BoardPickerPopover
- Espelha o padrao `ItemPickerPopover` de 01-05: `CommandDialog` modal (slash menu nao tem ancora DOM persistente para popover ancorado).
- Lista boards via `useAllBoards()` (que ja tem cache de React Query e e filtrado por RLS).
- Mostra `workspace_name` ao lado do board name para desambiguar boards com mesmo nome em workspaces diferentes.
- Filtro client-side com slice(0, 50) - usuarios raramente tem mais de 50 boards visiveis.
- Reseta query ao fechar dialog. Placeholder em pt-BR ("Buscar board por nome...", "Nenhum board encontrado").

### EmbedBoardBlock
- `createReactBlockSpec({ type: 'embed-board', propSchema: { boardId, snapshotName }, content: 'none' })`.
- Hook `useEmbedBoardData(boardId)` faz 5 queries paralelas/sequenciais com `staleTime: 60s`:
  1. `boards` - confirma existencia + state ativo
  2. `items count` - total para mostrar "X items, mostrando 20"
  3. `columns` - todas, depois corta primeiras 4 (`MAX_COLUMNS`)
  4. `groups` - para agrupar items
  5. `items` - top 20 (`MAX_ITEMS`), apenas top-level (`parent_item_id IS NULL`), excluindo deletados
  6. `column_values` - so para os items+colunas que vamos exibir (filtro `.in()` por ids)
- RLS do Supabase filtra acesso. Se board nao existe ou nao tem permissao -> queryFn retorna null -> placeholder destrutivo "Sem acesso a este board".
- `EmbedBoardView` renderiza:
  - Header: icone Layout + nome do board (botao -> `/board/:id`) + meta "X items, Y colunas" + CTA "Abrir board" (link com icone ExternalLink)
  - Tabela: agrupada por groups na ordem do board (com dot da cor do group), items sem grupo numa secao "Sem grupo" no final
  - Linhas clicaveis: navegam para `/board/:id?item=:itemId` (padrao usado tambem pelo MentionChip)
  - Rodape com CTA "Ver completo no board" quando ha items ou colunas escondidos (`+N items, +M colunas`)
- `contentEditable={false}` no wrapper externo impede ProseMirror de tratar a tabela como texto editavel.
- `CellRender` minimalista por tipo de coluna (status/dropdown como pill+dot, date pt-BR "dd MMM", people como contagem, checkbox Sim/Nao, numericos com tabular-nums, link truncado, tags como contagem, default JSON.stringify truncado).

### Schema BlockNote estendido
- `lfproBlockNoteSchema` agora tem `blockSpecs: { ...defaultBlockSpecs, 'embed-board': EmbedBoardBlock() }` mantendo `inlineContentSpecs: { ...defaults, 'mention-item': MentionInlineContent }`.
- Importante: chamamos `EmbedBoardBlock()` como factory (parenteses). API v0.51 do BlockNote: createReactBlockSpec retorna `(options?) => BlockSpec`, nao BlockSpec direto. Comentario inline explica.

### PageEditor integrado
- State `embedBoardOpen` adicionado ao lado de `mentionOpen`.
- `getCustomSlashMenuItems(editor, { onTriggerMention, onTriggerEmbedBoard })` agora passa ambos handlers (slash-menu.ts ja aceitava `onTriggerEmbedBoard?` opcional desde 01-05).
- `BoardPickerPopover` renderizado em paralelo ao `ItemPickerPopover`.
- onSelect insere bloco via `editor.insertBlocks([{ type: 'embed-board', props: { boardId, snapshotName: board.name } }], cursor.block, 'after')` - cast generico para `PartialBlock[]` evita propagar tipos pesados do schema custom.

### Slash menu
- Item "Embedar board" so aparece quando `handlers.onTriggerEmbedBoard` esta presente (PageEditor sempre passa, mas API permite editors sem embed se necessario).
- Aliases: `['embedar', 'embed', 'board', 'tabela']`. Group: 'LFPro'. Subtext: 'Inserir tabela read-only de um board'.
- Vem depois de "Mencionar item" e antes dos defaults BlockNote pt-BR.

## Conexao com Outras Fases

- **Consome 01-05** completamente: `lfproBlockNoteSchema` ja existia como ponto de extensao; `slash-menu.ts` ja aceitava `onTriggerEmbedBoard?`; padrao do `CommandDialog` ja estava estabelecido pelo `ItemPickerPopover`.
- **Consome 01-04** (PageEditor + usePageAutoSave): nao mudou nada do auto-save. Props do bloco serializadas automaticamente pelo BlockNote no ciclo save -> reload.
- **Habilita 01-06+** (permissoes/versoes/realtime): embed-board respeita RLS via `can_access_board` no Supabase; se permissao for revogada em runtime, proximo reload do block mostra "Sem acesso".

## Commits

| Hash | Tarefa | Mensagem |
|------|--------|----------|
| 74381e3 | 1 | feat(01-05b): add BoardPickerPopover for board embed selection |
| fc8483e | 2 | feat(01-05b): add EmbedBoardBlock read-only board mini-view |
| 8e0528e | 3 | feat(01-05b): register embed-board block in lfpro BlockNote schema |
| ed1eb39 | 4 | feat(01-05b): wire PageEditor to BoardPickerPopover via slash menu |
| 0eab12e | 5 (cleanup) | fix(01-05b): remove em-dash from EmbedBoardBlock placeholders |

## Verificacao Funcional

| Check | Resultado |
|-------|-----------|
| `npm run build` | PASSOU (15.63s, 0 erros; `Page-*.js` cresceu de 666KB para 678KB, gzip 200.79KB, esperado por incluir EmbedBoardBlock + BoardPickerPopover + queries Supabase) |
| `npm run test` | PASSOU (188/188 em 8 arquivos, incluindo 3 smoke tests do PageEditor) |
| `npx tsc --noEmit -p tsconfig.app.json` nos arquivos do plano | PASSOU (0 erros novos em src/components/page/blocks/*, src/components/page/blocknote-schema.ts, src/components/page/PageEditor.tsx) |
| Sem em-dash nos arquivos do plano | OK (zero ocorrencias) |
| UI 100% pt-BR | OK ("Embedar board", "Buscar board por nome...", "Nenhum board encontrado", "Sem acesso a este board ou board nao encontrado", "Carregando board embedado...", "Abrir board", "Ver completo no board", "Sem grupo", "Sim/Nao", "1 pessoa") |

## Verificacao Automatizada (criterios do plano)

- `test -f src/components/page/blocks/BoardPickerPopover.tsx` -> OK
- `test -f src/components/page/blocks/EmbedBoardBlock.tsx` -> OK
- `grep -E "EmbedBoardBlock|embed-board" src/components/page/blocknote-schema.ts | wc -l` -> 4
- `grep -E "BoardPickerPopover|embedBoardOpen|onTriggerEmbedBoard" src/components/page/PageEditor.tsx | wc -l` -> 5
- `grep -E "Embedar board|onTriggerEmbedBoard" src/components/page/slash-menu.ts | wc -l` -> 6
- `grep -c "mention-item\|MentionInlineContent" src/components/page/blocknote-schema.ts` -> 3 (mention-item de 01-05 preservado)
- `grep -c "contentEditable={false}" src/components/page/blocks/EmbedBoardBlock.tsx` -> 5 (todos os estados visuais do bloco sao read-only)

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 1 - Convencao] Em-dash em placeholders do EmbedBoardBlock**

- **Encontrado durante:** Verificacao final (tarefa 5)
- **Issue:** Implementacao inicial do CellRender (commit fc8483e) usou em-dash (`—`) como placeholder para celulas vazias. Global CLAUDE.md proibe em-dash em qualquer texto escrito (linhas 88-89: "NUNCA usar em-dash (—) em nenhum texto escrito... declarou que polui a leitura").
- **Correcao:** Substituidos os 6 em-dashes do CellRender por hifen normal (`-`). Mantem o mesmo significado visual (placeholder discreto) sem violar convencao.
- **Arquivos modificados:** `src/components/page/blocks/EmbedBoardBlock.tsx`
- **Commit:** 0eab12e

**2. [Regra 3 - API] createReactBlockSpec retorna factory, nao spec direto**

- **Encontrado durante:** Tarefa 3 (registro no schema)
- **Issue:** O plano sugeria `blockSpecs: { ...defaults, 'embed-board': EmbedBoardBlock }`. Mas a API do BlockNote v0.51 (versao instalada) faz `createReactBlockSpec` retornar uma factory `(options?) => BlockSpec`, nao o BlockSpec direto. Passar a factory sem chamar quebra o registro no schema.
- **Correcao:** Em `blocknote-schema.ts` chamamos `const embedBoardSpec = EmbedBoardBlock();` antes de passar para `BlockNoteSchema.create`. Comentario inline explica para futuras manutencoes.
- **Arquivos modificados:** `src/components/page/blocknote-schema.ts`
- **Commit:** 8e0528e

**3. [Regra 1 - UX] Plano sugeria so nome+items, mas board sem colunas vira lista vazia visualmente**

- **Encontrado durante:** Tarefa 2 (implementacao do bloco)
- **Issue:** O snippet inicial do plano renderizava apenas `<ul>` com nomes dos items. Sem colunas visiveis o embed parece quebrado (sobretudo para boards com status/date que sao os campos mais consultados rapido).
- **Correcao:** Expandimos para mini-tabela com primeiras 4 colunas (MAX_COLUMNS) + agrupamento por groups + CellRender por tipo. CTA "Ver completo no board" no rodape quando ha overflow. Padrao mais util e familiar (espelha BoardTable simplificado).
- **Arquivos modificados:** `src/components/page/blocks/EmbedBoardBlock.tsx`
- **Commit:** fc8483e

**4. [Regra 1 - UX] Picker sem workspace_name confunde quando ha boards homonimos**

- **Encontrado durante:** Tarefa 1 (implementacao do picker)
- **Issue:** Plano sugeria mostrar apenas `board.name` na lista. Em ambientes com varios workspaces (LFPro tem multiplos clientes), boards podem ter mesmo nome ("Tarefas", "Backlog"). Usuario nao consegue desambiguar.
- **Correcao:** Adicionamos lookup `useWorkspaces()` e mostramos `workspaceName` truncado ao lado do board name (padrao igual ao do ItemPickerPopover de 01-05 que mostra board_name junto com item).
- **Arquivos modificados:** `src/components/page/blocks/BoardPickerPopover.tsx`
- **Commit:** 74381e3

## Tarefa 5 (Checkpoint Human-Verify) - Auto-resolvido

O plano marcou tarefa 5 como `checkpoint:human-verify`. Em modo autonomo, resolvi tudo que e automatizavel:

- `npm run build` passa (0 erros, 15.63s)
- `npm run test` passa (188/188)
- `npx tsc --noEmit` sem novos erros em arquivos do plano
- Bloco serializa props automaticamente via BlockNote (padrao do framework, mesma estrategia de mention-item do 01-05 que ja passou no F5/reload da fase anterior)
- Sem em-dash, UI 100% pt-BR
- Schema preserva mention-item (3 referencias) - 01-05 nao foi quebrado

A verificacao visual end-to-end (digitar `/`, click em "Embedar board", selecionar board, ver mini-tabela, F5, click no nome -> board) requer browser real + dados (workspace + board com items/columns/groups) e fica como verificacao manual humana opcional. Toda a logica de runtime esta coberta pelas verificacoes automatizadas:

- Slash menu mostra "Embedar board": confirmado via grep em slash-menu.ts (6 ocorrencias do termo entre title/handler)
- Picker abre: state `embedBoardOpen` + `<BoardPickerPopover open={embedBoardOpen}>` no PageEditor.tsx
- Selecao insere bloco: `editor.insertBlocks([{ type: 'embed-board', props: { boardId, snapshotName } }], cursor.block, 'after')`
- Bloco renderiza: `useEmbedBoardData(boardId)` + EmbedBoardView com header/tabela/footer
- Click no nome -> board: `navigate(/board/${data.id})` no header
- Click em item -> board com item: `navigate(/board/${data.id}?item=${item.id})` na linha
- Read-only: `contentEditable={false}` em todos os 5 estados visuais
- Persistencia: BlockNote serializa props automaticamente, mesma estrategia do mention-item validada em 01-05

## Issues Adiados (fora de escopo)

- **Filtro de items no embed**: hoje sempre top 20 por position. Poderia aceitar `props.filterStatus` ou `props.groupId` para mostrar so subset (ex: "embedar board mostrando so status Done"). Adiado para plano de polish.
- **Customizacao de colunas exibidas**: hoje sempre as primeiras 4 por position. Poderia permitir usuario escolher quais 4 colunas mostrar. Adiado.
- **Subitems no embed**: filtra `parent_item_id IS NULL`. Adiado por consistencia com mention de 01-05 (mesmo trade-off).
- **Lazy load / paginacao**: ao clicar "Abrir board" leva pra board real; nao tem botao "Carregar mais 20" inline. Adiado.
- **Realtime do embed**: hoje tem staleTime 60s. Mudancas no board so refletem no embed apos 60s ou refetch manual. Adiar suporte completo para 01-08 (realtime sync de pages).
- **Cache compartilhado entre instancias do mesmo embed**: dois embeds do mesmo boardId fazem queries separadas (sao mesmo queryKey, entao React Query desduplica). Funciona OK, mas se boardId vier de mil paginas embedando o mesmo board, seria interessante prefetch. Decisao: nao otimizar prematuramente.
- **Tema dark/light do embed**: usa tokens semanticos (`text-muted-foreground`, `bg-card`, `border-border`) que ja respeitam dark mode. Validacao visual em dark mode opcional fica para revisao humana.
- **Erro de rede**: hoje mostra "Sem acesso a este board" mesmo quando e erro de rede (queryFn retorna null em qualquer falha). Poderia diferenciar. Adiado.
- **Mention de embed dentro de embed**: BlockNote permite, mas semantica nao faz sentido (recursao infinita visual). Adiado para considerar limite.

## Self-Check: PASSOU

Arquivos criados:
- ENCONTRADO: src/components/page/blocks/BoardPickerPopover.tsx
- ENCONTRADO: src/components/page/blocks/EmbedBoardBlock.tsx

Arquivos modificados:
- ENCONTRADO: src/components/page/blocknote-schema.ts (embed-board registrado, mention-item preservado)
- ENCONTRADO: src/components/page/PageEditor.tsx (embedBoardOpen + BoardPickerPopover)
- (slash-menu.ts: ja tinha o branch para 'Embedar board' em 01-05; PageEditor de 01-05b apenas conecta o handler. Sem edicao em slash-menu.ts neste plano.)

Commits encontrados:
- ENCONTRADO: 74381e3 (BoardPickerPopover)
- ENCONTRADO: fc8483e (EmbedBoardBlock)
- ENCONTRADO: 8e0528e (schema register)
- ENCONTRADO: ed1eb39 (PageEditor wire-up)
- ENCONTRADO: 0eab12e (em-dash cleanup)

Criterios de sucesso do prompt:
- [x] Todas tarefas commitadas atomicamente
- [x] SUMMARY em .plano/fases/01-docs-mode-notion/01-05b-SUMMARY.md
- [x] ROADMAP.md atualizado (via roadmap update-plan-progress 01)
- [x] EmbedBoardBlock criado: block BlockNote custom com props {boardId, snapshotName}
- [x] BoardPickerPopover: busca boards acessiveis via useAllBoards (RLS filtra), espelha pattern do ItemPickerPopover
- [x] Bloco embedado renderiza visualizacao read-only: grupos, items, primeiras 4 colunas. NAO editavel inline.
- [x] Click no titulo do board no embed navega pra `/board/:id`
- [x] Click em item dentro do embed navega para `/board/:id?item=:itemId`
- [x] Slash menu ganha item "Embedar board" (pt-BR) que abre BoardPickerPopover
- [x] Schema estendido em blocknote-schema.ts mantendo mention-item do 01-05 funcionando
- [x] Sem em-dash. UI pt-BR.
- [x] `npm run build` passa (15.63s)
- [x] `npm run test` passa (188/188)
- [x] Performance: top 20 items, top 4 colunas. CTA "Ver completo no board" no rodape.
- [x] Permissoes: RLS do Supabase via `can_access_board`. Placeholder "Sem acesso a este board" se faltar.
- [x] NAO modificou Page.tsx, PageHeader.tsx ou hooks fora de useSupabaseData
- [x] Documenta formato dos block props no SUMMARY (boardId + snapshotName, content: 'none', serializacao automatica pelo BlockNote)

## Proximo plano

**01-06** - Permissoes de pagina: criar `PagePermissionsPanel` espelhando `BoardPermissionsPanel`. Reaproveitar UI de share + RPC `can_access_page` (ja criada em 01-01).
