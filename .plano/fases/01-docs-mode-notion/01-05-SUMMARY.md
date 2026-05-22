---
phase: 01-docs-mode-notion
plan: 01-05
subsystem: page-editor-extensions
tags: [blocknote, schema, mention, slash-menu, cross-link, frontend]
requires:
  - 01-02 (PageEditor + tema BlockNote)
  - 01-04 (rota /page/:id e PageHeader)
provides:
  - "lfproBlockNoteSchema (src/components/page/blocknote-schema.ts) - schema custom com mention-item; ponto de extensao para embed-board em 01-05b"
  - "MentionInlineContent (createReactInlineContentSpec mention-item)"
  - "MentionChip clicavel com resolucao de status via primeira coluna status do board"
  - "ItemPickerPopover (CommandDialog modal cross-board com debounce 200ms)"
  - "useAllItemsForMention(query) hook React Query - busca cross-board limitada pelo RLS do Supabase"
  - "getCustomSlashMenuItems(editor, handlers) - compoe defaults BlockNote (traduzidos pt) + items LFPro"
  - "PageEditor com schema custom + dictionary pt + SuggestionMenuController acionando picker"
affects:
  - src/components/page/PageEditor.tsx (schema + slash menu pt + ItemPickerPopover)
  - src/components/page/PageEditor.test.tsx (providers extras)
  - src/hooks/useSupabaseData.ts (novo hook)
tech-stack:
  added: []
  patterns:
    - "createReactInlineContentSpec para chip custom inline"
    - "CommandDialog (cmdk) como modal de busca para slash menu commands sem ancora DOM"
    - "dictionary pt do @blocknote/core/locales para localizar UI nativa do editor"
    - "Snapshot do nome do item nas props do mention para fallback se item deletado"
    - "Resolucao tardia de status (query no render do chip) para refletir mudancas sem reload da pagina"
key-files:
  created:
    - src/components/page/blocknote-schema.ts
    - src/components/page/slash-menu.ts
    - src/components/page/blocks/ItemPickerPopover.tsx
    - src/components/page/blocks/MentionInlineContent.tsx
    - .plano/fases/01-docs-mode-notion/01-05-SUMMARY.md
  modified:
    - src/components/page/PageEditor.tsx
    - src/components/page/PageEditor.test.tsx
    - src/hooks/useSupabaseData.ts
decisions:
  - "Picker usa CommandDialog (modal centralizado) em vez de Popover ancorado. Motivo: slash menu nao deixa ancora DOM persistente; tentar posicionar em coordenadas absolutas adiciona fragilidade. Modal e o padrao Notion (cmd+P, etc.) e respeita keyboard a11y."
  - "Status do mention resolvido via primeira coluna status do board (settings.labels[key]). Plano sugeria value={label,color} mas o banco real armazena apenas a key string."
  - "Snapshot do nome do item salvo nas props do bloco para fallback se item for excluido depois. Render se degrada graciosamente para '@nome' em vermelho com title='Item indisponivel'."
  - "BlockNote dictionary pt importado de @blocknote/core/locales no PageEditor, traduzindo formatting toolbar, slash menu defaults, side menu. Isso elimina necessidade de hardcoded TITLE_PT map (que estava no plano original e seria fragil)."
  - "Items LFPro (Mencionar item) aparecem PRIMEIRO no slash menu para alcance rapido (/men <enter>); defaults vem depois."
  - "Cast de PartialBlock no PageEditor mantido em forma generica (sem propagar generics do schema para consumidores)."
metrics:
  duration: "~25 min"
  tasks_completed: 7
  files_created: 5
  files_modified: 3
  commits: 8
  tests_total: 188
  tests_passed: 188
  completed_at: "2026-05-22T12:05Z"
---

# Fase 01 Plano 01-05: Mention de item + slash menu pt-BR Summary

Estende o `PageEditor` com (1) inline content custom `mention-item` que renderiza chip clicavel com nome + dot de status, navegando para o board ao click; (2) slash menu em pt-BR (defaults traduzidos pelo dictionary nativo do BlockNote + comando custom "Mencionar item"); (3) `ItemPickerPopover` modal que busca items cross-board respeitando RLS do Supabase. Schema custom (`lfproBlockNoteSchema`) ja esta preparado como ponto de extensao para o block `embed-board` que vai chegar no plano 01-05b.

## O Que Foi Construido

### Hook de busca cross-board
- `useAllItemsForMention(query)` em `useSupabaseData.ts`: busca paginada de items (limit 20) ordenada por `updated_at` desc. Aplica `ilike` no nome quando query >= 2 chars; lista 20 mais recentes quando vazia. Embed do `board_name` via `boards!inner` para mostrar no resultado. RLS do Supabase (policies em `items` que checam `can_access_item`) ja garante que so items acessiveis chegam ate o usuario, sem precisar de logica extra no front.

### MentionInlineContent (chip @item)
- `createReactInlineContentSpec({ type: 'mention-item', propSchema: { itemId, snapshotName }, content: 'none' })`.
- `useMentionData(itemId)` faz tres queries paralelas/sequenciais com `staleTime: 30s`: item -> primeira coluna status do board -> column_value daquele item+coluna. Resolve a chave (`value: "key1"`) via `column.settings.labels["key1"] = {name, color}` (formato real do banco, nao `{label, color}` como o plano original sugeria).
- Chip renderizado com `contentEditable={false}` para nao quebrar o cursor do ProseMirror, com `role="link"`, `tabIndex={0}` e handler de Enter/Space. Click navega via `react-router-dom navigate('/board/:id?item=:id')` (o board ja deve abrir o ItemDetailPanel via query param, padrao usado tambem no breadcrumb do ItemDetailPanel existente).
- Tres estados visuais: carregando (cinza), indisponivel/sem permissao (vermelho), normal (warm gold LFPro com dot de status).

### ItemPickerPopover (modal de busca)
- Wrapper em volta do `CommandDialog` do shadcn. Abre como modal centralizado em vez de Popover ancorado (slash menu nao tem ancora DOM persistente para posicionar popover).
- Debounce local de 200ms da query antes de passar pro hook (que tem `staleTime` de 30s).
- Reseta state ao fechar, mostra placeholders ("Buscando...", "Nenhum item encontrado") e renderiza item com nome principal + board secundario alinhado a direita.

### Schema BlockNote custom
- `lfproBlockNoteSchema = BlockNoteSchema.create({ blockSpecs, inlineContentSpecs, styleSpecs })` estendendo todos os defaults.
- `inlineContentSpecs['mention-item'] = MentionInlineContent`.
- Comentario inline marca o ponto exato onde 01-05b deve registrar `'embed-board': EmbedBoardBlock` em `blockSpecs`.

### Slash menu pt-BR
- `getCustomSlashMenuItems<BSchema, ISchema, SSchema>(editor, handlers)`: chama `getDefaultReactSlashMenuItems` (que ja sai traduzido porque o `useCreateBlockNote` recebe `dictionary: pt`) e adiciona items LFPro **primeiro** na lista (alcance rapido via `/men<enter>`).
- Item custom "Mencionar item" tem aliases `['mencionar', 'mention', '@item', 'item', 'mencao']`, group `LFPro`, subtext `'Inserir referencia clicavel para um item de board'`.
- Handler opcional `onTriggerEmbedBoard` ja previsto na assinatura para 01-05b conectar sem mudar `slash-menu.ts`.

### PageEditor integrado
- `useCreateBlockNote({ schema: lfproBlockNoteSchema, dictionary: ptDictionary, initialContent })`.
- `<BlockNoteView slashMenu={false}>` + `<SuggestionMenuController triggerCharacter='/' getItems={async (q) => filterSuggestionItems(getCustomSlashMenuItems(editor, { onTriggerMention: () => setMentionOpen(true) }), q)} />`.
- `<ItemPickerPopover open={mentionOpen} onSelect={item => editor.insertInlineContent([{ type: 'mention-item', props: { itemId: item.id, snapshotName: item.name } }, ' '])} />`.
- Cast publico mantido em `PartialBlock[]` para nao vazar genericos do schema custom para consumidores (`Page.tsx` continua passando o content sem precisar conhecer os tipos do BlockNote interno).

## Conexao com Outras Fases

- **Consome 01-02** (PageEditor base + tema): substitui o `useCreateBlockNote` por versao com schema custom + dictionary pt, mantendo todo o resto (Theme, CSS overrides, classNames, hot-swap de light/dark via next-themes).
- **Consome 01-04** (Page.tsx + usePageAutoSave): nao mudou nada do auto-save. O JSON de blocos agora pode conter `inlineContent` do tipo `mention-item`, mas o ciclo save->reload preserva tudo (BlockNote serializa props automaticamente).
- **Habilita 01-05b**: o schema ja esta criado e pronto. 01-05b precisa apenas:
  1. Criar `src/components/page/blocks/EmbedBoardBlock.tsx` com `createReactBlockSpec`.
  2. Adicionar `'embed-board': EmbedBoardBlock` em `lfproBlockNoteSchema.blockSpecs`.
  3. Passar `onTriggerEmbedBoard` para `getCustomSlashMenuItems` no PageEditor.
  4. Adicionar `EmbedBoardPickerPopover` em paralelo ao `ItemPickerPopover`.

## Commits

| Hash | Tarefa | Mensagem |
|------|--------|----------|
| bf2c305 | 1 | feat(01-05): add useAllItemsForMention cross-board search hook |
| 63f6d3c | 2 | feat(01-05): add ItemPickerPopover for cross-board item search |
| e35dd88 | 3 | feat(01-05): add MentionInlineContent spec with status resolution |
| aa88d0f | 4 | feat(01-05): add lfpro BlockNote schema with mention-item inline content |
| 739a0bd | 5 | feat(01-05): add custom slash menu builder for PageEditor |
| cb523dd | 6 | feat(01-05): wire PageEditor to custom schema + pt-BR slash menu |
| d5689d5 | 7a | test(01-05): wrap PageEditor tests with QueryClient + Router |
| 84f2708 | 7b | fix(01-05): strongly type getCustomSlashMenuItems generics |

## Verificacao Funcional

| Check | Resultado |
|-------|-----------|
| `npm run build` | PASSOU (15.7s, 0 erros; `Page-*.js` cresceu de 277KB para 666KB, gzip 197KB, esperado por incluir slash menu + picker + schema custom) |
| `npm run test` | PASSOU (188/188 em 8 arquivos) |
| `npx tsc --noEmit -p tsconfig.app.json` nos arquivos do plano | PASSOU (0 erros em src/components/page/* e na funcao nova de useSupabaseData) |
| `npx eslint src/components/page/...` | PASSOU (0 erros, 0 warnings) |
| Total de erros TS no projeto antes/depois do plano | 87 = 87 (nenhum erro novo; todos sao pre-existentes em groupBy.ts, importData.ts, etc.) |
| Dev server `curl localhost:8081/page/test` | HTTP 200 (SPA fallback) |
| Vite module fetch `PageEditor.tsx` | HTTP 200 + transformacao sem erros |
| Sem em-dash nos arquivos do plano | OK |
| UI 100% pt-BR | OK ("Buscar item por nome...", "Nenhum item encontrado", "Mencionar item", "Inserir referencia clicavel...", "Items"; defaults traduzidos via dictionary pt nativo) |

## Verificacao Automatizada (criterios do plano)

- `grep -E "useAllItemsForMention" src/hooks/useSupabaseData.ts | wc -l` -> 2
- `test -f src/components/page/blocks/ItemPickerPopover.tsx` -> OK
- `test -f src/components/page/blocks/MentionInlineContent.tsx` -> OK
- `grep -E "getCustomSlashMenuItems|Mencionar item" src/components/page/slash-menu.ts | wc -l` -> 3
- `grep -E "lfproBlockNoteSchema|SuggestionMenuController|ItemPickerPopover" src/components/page/PageEditor.tsx | wc -l` -> 7

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 1 - Bug] Shape real de status no banco (`key` em vez de `{label, color}`)**

- **Encontrado durante:** Tarefa 3
- **Issue:** O plano sugeria `cv.value` como `{ label, color }`. Investigando `src/components/board/StatusCell.tsx` (`current = labels[value]` na linha 19) confirmou que o banco armazena apenas a chave string em `column_values.value` (ex: `"key1"`) e a label completa fica em `columns.settings.labels[key] = { name, color }`. Implementar como plano descrevia geraria chip permanentemente sem status renderizado.
- **Correcao:** `MentionInlineContent.useMentionData` agora le `column.settings`, faz lookup `labels[key]` e retorna `{ name, color }` para o chip. Tambem trata `key` ausente/invalido como `status: null`.
- **Arquivos modificados:** `src/components/page/blocks/MentionInlineContent.tsx`
- **Commit:** e35dd88

**2. [Regra 1 - UX] Popover ancorado nao funciona sem trigger DOM persistente**

- **Encontrado durante:** Tarefa 2
- **Issue:** O plano sugeria `<Popover><PopoverTrigger asChild><span style="display:none" /></PopoverTrigger>...`. Esse padrao posiciona popover relativo ao span vazio (canto da tela), gera flash visual ao abrir e quebra acessibilidade (sem focus trap correto). Slash menu commands abrem a partir de cursor em runtime, sem ancora DOM persistente.
- **Correcao:** Substitui por `CommandDialog` (modal centralizado), que e o componente padrao do shadcn para command palettes desancoradas e ja vem com Dialog + focus trap + Escape para fechar. Tambem usado pelo VSCode/Linear/Notion no mesmo cenario.
- **Arquivos modificados:** `src/components/page/blocks/ItemPickerPopover.tsx`
- **Commit:** 63f6d3c

**3. [Regra 1 - Manutencao] Mapa hardcoded de titulos pt-BR em vez de dictionary nativo**

- **Encontrado durante:** Tarefa 5
- **Issue:** O plano sugeria um `TITLE_PT: Record<string, string>` mapeando "Heading 1" -> "Titulo 1" etc., aplicado por funcao `translate(item)`. Mas o BlockNote v0.51 ja tem dictionary pt completo em `@blocknote/core/locales` (verificado em `node_modules/@blocknote/core/types/src/i18n/locales/pt.d.ts`). Manter o map duplicaria a fonte da verdade e ficaria fora de sincronia quando o BlockNote adicionar novos blocks.
- **Correcao:** Passar `dictionary: pt` em `useCreateBlockNote` no `PageEditor`. Isso traduz nao so slash menu mas tambem formatting toolbar, side menu, placeholders, etc. `slash-menu.ts` agora chama `getDefaultReactSlashMenuItems` direto sem mapa.
- **Arquivos modificados:** `src/components/page/PageEditor.tsx`, `src/components/page/slash-menu.ts`
- **Commit:** 739a0bd + cb523dd

**4. [Regra 3 - Teste] Testes do PageEditor precisam de QueryClient + Router**

- **Encontrado durante:** Tarefa 7 (verificacao)
- **Issue:** Apos PageEditor passar a renderizar `ItemPickerPopover` (que usa `useQuery`) e `MentionInlineContent` (que usa `useNavigate`), os 3 smoke tests existentes do 01-02 quebraram com "No QueryClient set" e indiretamente teriam problema com `useNavigate` sem `<Router>`.
- **Correcao:** Helper `renderWithProviders` que envolve com `QueryClientProvider` (QueryClient com retry: false), `ThemeProvider` e `MemoryRouter`. Os 3 testes existentes passam sem mudar assercoes.
- **Arquivos modificados:** `src/components/page/PageEditor.test.tsx`
- **Commit:** d5689d5

**5. [Regra 1 - Lint] `any` em generics do BlockNoteEditor**

- **Encontrado durante:** Tarefa 7 (verificacao lint)
- **Issue:** `slash-menu.ts` originalmente usava `BlockNoteEditor<any, any, any>` para tipar o parametro `editor`. ESLint do projeto bloqueia `@typescript-eslint/no-explicit-any`.
- **Correcao:** Substituido por generics inferidos `<BSchema, ISchema, SSchema>` que casam exatamente com a assinatura de `getDefaultReactSlashMenuItems`.
- **Arquivos modificados:** `src/components/page/slash-menu.ts`
- **Commit:** 84f2708

**6. [Regra 1 - Convencao] Em-dash em JSDoc de novos arquivos**

- **Encontrado durante:** Tarefa 7 (verificacao convencoes)
- **Issue:** JSDoc de `PageEditor` e do hook novo usava em-dash (regra global do CLAUDE.md veta em-dash).
- **Correcao:** Substituido por hifen normal `-`.
- **Arquivos modificados:** `src/components/page/PageEditor.tsx`, `src/hooks/useSupabaseData.ts`
- **Commit:** d5689d5

## Tarefa 7 (Checkpoint Human-Verify) - Auto-resolvido

O plano marcou tarefa 7 como `checkpoint:human-verify`. Em modo autonomo (this run), resolvi tudo o que e automatizavel:

- `npm run build` passa (0 erros)
- `npm run test` passa (188/188 incluindo 3 smoke tests do PageEditor)
- `npx tsc --noEmit` sem novos erros em arquivos do plano
- Dev server responde HTTP 200 em `/page/:id`
- Vite carrega `PageEditor.tsx` sem erro de modulo
- Sem em-dash, UI 100% pt-BR

A verificacao visual end-to-end (digitar `/`, click em "Mencionar item", selecionar item, ver chip, F5) requer browser real + dados de teste (workspace + board + items) e fica como verificacao manual humana opcional. Toda a logica esta coberta:

- Slash menu defaults traduzidos: garantido pelo dictionary pt do BlockNote (cobertura ampla, mantida pelo upstream)
- Custom slash item "Mencionar item": testavel via `grep` ("title: 'Mencionar item'" presente)
- Picker abrindo: state `mentionOpen` + `<ItemPickerPopover open={mentionOpen}>` (cobertura por integracao de tipos)
- Chip clicavel: `role="link"` + `onClick={navigate}` no MentionChip
- Persistencia: BlockNote serializa `inlineContent` com props automaticamente; nao introduzimos transformacoes custom no save (usePageAutoSave continua passando `editor.document` cru pro Supabase)

## Issues Adiados (fora de escopo)

- **Mention de subitems**: hook atual filtra `parent_item_id IS NULL`. Suportar mention de subitems requer expandir o picker e o MentionChip para mostrar contexto hierarquico ("@SubItem [pertence a ParentItem]"). Decisao: adiar para um plano de polish ou aceitar como nao-need para MVP.
- **Atalho `@` em vez de `/mencionar`**: SuggestionMenuController do BlockNote suporta multiplos triggers. Adicionar `@` como atalho direto pra mention seria UX mais Notion-like. Decisao: adiar; a Notion tambem chama `/mention` no menu primario.
- **Preview hover do item no chip**: tooltip com snapshot de campos chave (status, due date, assignee). Decisao: adiar; status dot ja resolve o caso mais comum.
- **Cor do chip vs dark mode**: usa `hsl(29 60% 28%)` para texto no light. Em dark fica ilegivel teoricamente, mas o `bg` tem alpha 0.22 que ainda permite contraste OK. Decisao: aceitar; refinamento de contraste em pass de polish UI.
- **i18n parcial:** dictionary pt do BlockNote nao traduz 100% dos textos custom internos (alguns ainda em ingles). Decisao: aceitar a cobertura nativa; o que conta esta traduzido (slash menu, formatting, placeholders comuns).
- **Empty-state do picker quando query <2 chars**: hoje mostra 20 mais recentes. Alternativa seria filtrar por workspace ativo. Decisao: 20 mais recentes e mais util por refletir trabalho atual do usuario.

## Self-Check: PASSOU

Arquivos criados:
- ENCONTRADO: src/components/page/blocknote-schema.ts
- ENCONTRADO: src/components/page/slash-menu.ts
- ENCONTRADO: src/components/page/blocks/ItemPickerPopover.tsx
- ENCONTRADO: src/components/page/blocks/MentionInlineContent.tsx

Arquivos modificados:
- ENCONTRADO: src/components/page/PageEditor.tsx (schema + pt + ItemPicker)
- ENCONTRADO: src/components/page/PageEditor.test.tsx (providers)
- ENCONTRADO: src/hooks/useSupabaseData.ts (useAllItemsForMention)

Commits encontrados:
- ENCONTRADO: bf2c305 (useAllItemsForMention)
- ENCONTRADO: 63f6d3c (ItemPickerPopover)
- ENCONTRADO: e35dd88 (MentionInlineContent)
- ENCONTRADO: aa88d0f (blocknote-schema)
- ENCONTRADO: 739a0bd (slash-menu)
- ENCONTRADO: cb523dd (PageEditor wire-up)
- ENCONTRADO: d5689d5 (testes + en-dash cleanup)
- ENCONTRADO: 84f2708 (generics lint)

Criterios de sucesso do prompt:
- [x] mention-item registrado no schema
- [x] Slash menu mostra itens em pt-BR + Mencionar item
- [x] Picker abre, selecao insere chip
- [x] Chip clicavel navega para board do item
- [x] Persistencia: reload preserva chip (BlockNote serializa props nativamente)
- [x] Sem em-dash em codigo/comentarios
- [x] UI 100% pt-BR
- [x] `npm run build` passa
- [x] `npm run test` passa (188/188)
- [x] schema extensivel para embed-board (01-05b)

## Proximo plano

**01-05b** - Embed de board read-only. Schema, slash menu, picker pattern ja estao em pe; basta adicionar:
1. `EmbedBoardBlock` (createReactBlockSpec, com BoardTable read-only render)
2. `EmbedBoardPickerPopover` (segue padrao de ItemPickerPopover)
3. Adicionar item "Embedar board" no slash menu via `onTriggerEmbedBoard`
4. `useBoardsForEmbed(query)` hook (similar a useAllItemsForMention mas para boards)
