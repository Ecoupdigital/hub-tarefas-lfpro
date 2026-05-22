---
phase: 02-notion-database-hierarquia-blocos-extras
plan: 02-05
subsystem: blocknote-database-block
tags: [blocknote, database, slash-menu, page-editor, react-query, mutation]
requires:
  - "02-01: boards.page_id + board_views aceita view_type='list_detailed'"
  - "01-05b: padrao de bloco custom embed-board + slash menu pt-BR + dictionary"
provides:
  - "useCreateDatabase hook: cria board (page_id) + grupo + 3 colunas + 4 views com rollback"
  - "CreateDatabaseDialog: modal pt-BR para nome + emoji da database inline"
  - "DatabaseBlock: BlockNote custom block spec (content='none') com props {boardId, snapshotName}"
  - "Stubs DatabaseViewTabs e DatabaseViewRenderer (componentes em src/components/database/)"
  - "Slash menu /database (pt-BR) condicional ao handler onTriggerDatabase"
  - "PageEditor wire-up: dialog aberto via slash menu, insere bloco apos confirmar"
affects:
  - "src/components/page/blocknote-schema.ts: 3 customs registrados (mention-item, embed-board, database)"
  - "src/components/page/slash-menu.ts: SlashMenuHandlers ganha onTriggerDatabase opcional"
  - "src/components/page/PageEditor.tsx: estado databaseDialogOpen + lookup workspaceId via usePage"
tech-stack:
  added: []
  patterns:
    - "Mutation transacional client-side com rollback best-effort (soft delete do board se etapas posteriores falham)"
    - "createReactBlockSpec retornando factory (API v0.51) - invocar como DatabaseBlock() no schema"
    - "Handler opcional no slash menu (item condicional ao callback presente)"
    - "Lookup de workspace via usePage(pageId) reusa cache do React Query"
    - "Stubs minimos para componentes ainda nao implementados (mantem compilacao + integracao gradual)"
key-files:
  created:
    - "src/components/page/CreateDatabaseDialog.tsx"
    - "src/components/page/blocks/DatabaseBlock.tsx"
    - "src/components/database/DatabaseViewTabs.tsx"
    - "src/components/database/DatabaseViewRenderer.tsx"
  modified:
    - "src/hooks/useCrudMutations.ts"
    - "src/components/page/blocknote-schema.ts"
    - "src/components/page/slash-menu.ts"
    - "src/components/page/PageEditor.tsx"
decisions:
  - "useCreateDatabase usa rollback best-effort client-side (4 INSERTs separados, soft-delete em falha) ao inves de RPC SECURITY DEFINER porque mantem padrao do projeto (resto das mutations e tambem client-side) e evita migration nova"
  - "boards.icon armazena o emoji escolhido (nao um campo separado) - reusa coluna existente"
  - "Stub DatabaseBlock renderiza header funcional + placeholders (DatabaseViewTabs/Renderer) porque views completas sao 02-06/07/08; stub permite testar fluxo end-to-end ja em 02-05"
  - "EmojiColorPicker API real: {emoji, color, onEmojiChange, onColorChange, size} - difere da hipotese do plano (currentEmoji/currentColor/onSelectEmoji/onSelectColor). Ajustado para API correta"
  - "snapshotName armazenado nas props do bloco evita query extra so para renderizar o header e funciona como fallback se board for inacessivel"
  - "onTriggerDatabase condicional a pageId+workspaceId garante que item Database nao aparece em contextos de preview"
metrics:
  duration_minutes: 18
  tasks_completed: 6
  files_created: 4
  files_modified: 4
  tests_added: 0
  total_tests: 199
  completed_date: 2026-05-23
---

# Fase 02 Plano 02-05: Bloco Database no BlockNote (criacao e render inline) Summary

## One-liner

Adiciona criacao de database inline via slash menu `/database`: dialog pt-BR (nome + emoji) chama useCreateDatabase (board com page_id + grupo + 3 colunas Status/Data/Responsavel + 4 board_views Tabela/Kanban/Calendario/Lista detalhada com rollback best-effort), e insere bloco BlockNote custom `database` com props {boardId, snapshotName} - render stub com header clicavel pra abrir em tela cheia e placeholders pra views completas em 02-06+.

## O que foi feito

### Hook useCreateDatabase (`src/hooks/useCrudMutations.ts`)

Mutation transacional client-side (4 INSERTs em sequencia) com rollback best-effort:

1. `boards` INSERT com `page_id = pageId`, `workspace_id`, `icon` (emoji escolhido), `state='active'`, `created_by`.
2. `groups` INSERT: 1 grupo "Itens" cor `#a89172` (warm gold LFPro), position 0.
3. `columns` INSERT batch: 3 colunas iniciais
   - Status (column_type='status', labels: Pendente cinza / Em andamento ambar / Concluido verde com isDone=true)
   - Data (column_type='date')
   - Responsavel (column_type='people')
4. `board_views` INSERT batch: 4 views
   - Tabela (view_type='table', is_default=true, position 0)
   - Kanban (view_type='kanban', position 1)
   - Calendario (view_type='calendar', position 2)
   - Lista detalhada (view_type='list_detailed', position 3, config.visibleProps=['status', 'date', 'people'])

Em qualquer falha pos-step 1, executa `rollback()` que marca o board como `state='deleted'` (soft delete, sem migration extra) antes de re-lancar o erro. Retorna `{boardId, viewIds, defaultViewId}` pro consumidor inserir o bloco.

Invalida queries `['boards']`, `['all-boards']`, `['databases-for-page', pageId]`, `['pages-tree']` em `onSuccess`.

### CreateDatabaseDialog (`src/components/page/CreateDatabaseDialog.tsx`)

Modal pt-BR com:
- `EmojiColorPicker` (API correta: emoji + onEmojiChange) - cor nao usada no MVP (callback no-op)
- `Input` para nome com `autoFocus` e Enter -> confirma
- Helper text descrevendo o que sera criado
- Botoes Cancelar/Criar com `isCreating` desabilitando ambos
- Toast `sonner` em sucesso/erro
- Reset de estado ao fechar (Cancelar, X, click-fora)
- Validacao: nome trimmed obrigatorio

### DatabaseBlock + stubs

- **`src/components/page/blocks/DatabaseBlock.tsx`**: `createReactBlockSpec({type:'database', content:'none', propSchema:{boardId, snapshotName}})` retornando factory. Render delega para `DatabaseBlockView` (componente React funcional) que:
  - Estado de erro se `boardId` ausente (`border-destructive`)
  - Card com `border border-border rounded-md bg-card overflow-hidden not-prose` e `contentEditable={false}` no wrapper externo (isola ProseMirror)
  - Header: icone `Database` lucide + nome snapshot (botao com `hover:underline`) que navega `/board/:id`
  - `<DatabaseViewTabs boardId>` stub
  - `<DatabaseViewRenderer boardId>` stub
- **`src/components/database/DatabaseViewTabs.tsx`**: stub com placeholder "Tabs de view (implementacao em 02-08)"
- **`src/components/database/DatabaseViewRenderer.tsx`**: stub com placeholder e exibe boardId em fonte mono

### Schema BlockNote (`src/components/page/blocknote-schema.ts`)

Adicionado import `DatabaseBlock`, invocacao `const databaseSpec = DatabaseBlock()`, e key `'database': databaseSpec` em `blockSpecs`. Schema agora suporta 3 customs: `mention-item` (inline), `embed-board` (block), `database` (block). Preservou inteiramente os dois anteriores.

### Slash menu (`src/components/page/slash-menu.ts`)

- `SlashMenuHandlers.onTriggerDatabase?: () => void` adicionado (opcional, condicional)
- Item Database adicionado a `customs` apos "Embedar board":
  - title: `'Database'`
  - aliases: `['database', 'db', 'mini board', 'mini-board', 'tabela editavel', 'kanban', 'calendario']`
  - group: `'LFPro'`
  - subtext: `'Inserir mini-board com Tabela, Kanban, Calendario e Lista detalhada'`

### PageEditor (`src/components/page/PageEditor.tsx`)

- Imports: `CreateDatabaseDialog`, `usePage`
- Estado: `databaseDialogOpen` + lookup do `workspaceId` via `usePage(pageId)?.workspace_id`
- `onTriggerDatabase` passado ao slash menu **somente** quando `pageId && workspaceId` estao definidos (preview/uso fora da rota `/page/:id` nao expoe a opcao - degrade gracioso)
- `<CreateDatabaseDialog>` renderizado apos `<BoardPickerPopover>` com condicao `pageId && workspaceId`
- `onCreated` insere bloco `database` no editor apos o cursor com `props.boardId` e `props.snapshotName` (cast `as unknown as PartialBlock[]` mesmo padrao do embed-board)

## Verificacao

- `npm run build` passa em 16.80s, 0 erros novos. Bundle Page-CCGBDAzo.js cresceu de 693kb para 697kb (+4kb, esperado pelo DatabaseBlock + dialog)
- `npm run test` passa: **199 testes (10 arquivos)**, mesmo total da fase 02-04 (zero teste novo neste plano - smoke do fluxo viria com runtime do bloco). Inclui PageEditor.test.tsx (3 testes) que continua passando apos as mudancas
- `npx tsc --noEmit -p tsconfig.app.json` nao introduz erros nos arquivos modificados (erros pre-existentes em outras areas permanecem - fora de escopo)
- Dev server `npm run dev` (porta 8080) responde HTTP 200 + HMR reload limpo apos cada edicao
- Zero em-dash, todas as strings UI em pt-BR
- 3 customs no schema (`mention-item`, `embed-board`, `database`) confirmados via grep
- Slash menu agora expoe 3 items LFPro (Mencionar item, Embedar board, Database) quando handlers presentes
- Verificacao funcional do fluxo `/database` -> dialog -> bloco end-to-end requer login + page existente (browser); estrutura compilada e wired esta correta. Testes de integracao runtime virao com 02-06+ quando views forem implementadas

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 1 - Bug] API real do EmojiColorPicker diverge da hipotese do plano**

- **Encontrado durante:** Tarefa 2 (CreateDatabaseDialog)
- **Issue:** Plano sugeria props `currentEmoji`, `currentColor`, `onSelectEmoji`, `onSelectColor`. O componente real em `src/components/shared/EmojiColorPicker.tsx` exporta `{emoji, color, onEmojiChange, onColorChange, size}`.
- **Correcao:** Usei a API correta. `onColorChange` recebe callback no-op porque o MVP da database inline so usa o emoji (cor sera adicionada em fase futura se necessario).
- **Arquivos modificados:** `src/components/page/CreateDatabaseDialog.tsx`
- **Commit:** `86f0abe` (junto com a criacao do dialog)

**2. [Regra 3 - Blocking] Sugestao do plano usava `as never` em INSERTs**

- **Encontrado durante:** Tarefa 1 (useCreateDatabase)
- **Issue:** Plano sugeria `as never` em insert/update por preocupacao de que `boards.page_id` nao estivesse nos tipos gerados.
- **Correcao:** A Fase 02-01 ja estendeu manualmente `src/integrations/supabase/types.ts` incluindo `page_id` em `boards.Row/Insert/Update`. Verifiquei e remover `as never` mantem type-safety. O INSERT de `boards` com `page_id` compila limpo. Mesmo para colunas iniciais e board_views, os tipos gerados aceitam as colunas sem cast.
- **Arquivos modificados:** `src/hooks/useCrudMutations.ts`
- **Commit:** `85fbe16`

Nenhum desvio arquitetural. Plano executado essencialmente como escrito, com 2 correcoes pequenas baseadas no estado real do codebase (Regra 1 + Regra 3).

## Issues Adiados

Nenhum. Decisoes de UI futuras (tabs de view, conteudo das views, configuracao de visibleProps) sao explicitamente parte dos planos 02-06/07/08.

## Commits

| Tarefa | Hash | Mensagem |
|--------|------|----------|
| 1 | `85fbe16` | feat(02-05): add useCreateDatabase hook with transactional rollback |
| 2 | `86f0abe` | feat(02-05): add CreateDatabaseDialog with name input + emoji picker |
| 3 | `7db9c1f` | feat(02-05): add DatabaseBlock custom BlockNote spec + view stubs |
| 4 | `828ea1c` | feat(02-05): register database block in BlockNote schema |
| 5 | `43775f7` | feat(02-05): add Database item to slash menu (pt-BR) |
| 6 | `01e8141` | feat(02-05): wire CreateDatabaseDialog into PageEditor |

## Self-Check: PASSOU

- src/components/page/CreateDatabaseDialog.tsx: ENCONTRADO
- src/components/page/blocks/DatabaseBlock.tsx: ENCONTRADO
- src/components/database/DatabaseViewTabs.tsx: ENCONTRADO
- src/components/database/DatabaseViewRenderer.tsx: ENCONTRADO
- src/hooks/useCrudMutations.ts (modificado): ENCONTRADO (useCreateDatabase presente)
- src/components/page/blocknote-schema.ts (modificado): ENCONTRADO (database registrado)
- src/components/page/slash-menu.ts (modificado): ENCONTRADO (onTriggerDatabase + item Database)
- src/components/page/PageEditor.tsx (modificado): ENCONTRADO (dialog wired)
- Commit 85fbe16: ENCONTRADO
- Commit 86f0abe: ENCONTRADO
- Commit 7db9c1f: ENCONTRADO
- Commit 828ea1c: ENCONTRADO
- Commit 43775f7: ENCONTRADO
- Commit 01e8141: ENCONTRADO

## Proximos planos

- **02-06:** BoardTable/Kanban/Calendar ganham prop `mode?: 'board' | 'database'`. Em `'database'`: sem BoardHeader, sem TabBar, container reduzido. Substituem o stub DatabaseViewRenderer pra view ativa.
- **02-07:** Novo componente `DatabaseListView` (lista detalhada Notion-style). Adicionado ao DatabaseViewRenderer quando view_type='list_detailed'.
- **02-08:** DatabaseViewTabs real - lista board_views deste boardId, tab ativa, botao "+" pra criar view nova.
- **02-09 (Bookmark) e 02-10 (Synced):** Vao estender PageEditor.tsx, blocknote-schema.ts, slash-menu.ts em sequencia serial (Wave 2b). Padrao de extensao deste plano serve de modelo.
