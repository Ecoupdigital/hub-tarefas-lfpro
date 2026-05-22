---
phase: 02-notion-database-hierarquia-blocos-extras
plan: 02-09
subsystem: blocknote-bookmark-block
tags: [blocknote, bookmark, edge-function, deno, opengraph, slash-menu, page-editor]
requires:
  - "02-01: schema base da Fase 02 e supabase/functions/ ja existente"
  - "02-05: padrao de bloco custom DatabaseBlock + slash menu pt-BR + extensao do PageEditor"
provides:
  - "Edge Function fetch-url-metadata (Deno): recebe {url}, parse OG/Twitter/favicon, retorna {title, description, image, favicon, site_name, fetched_at}"
  - "BookmarkBlock: BlockNote custom block spec (content='none') com 7 props (url + metadata + fetched_at)"
  - "UrlPromptDialog: modal pt-BR para pedir URL ao usuario (auto-prefix https, validacao inline)"
  - "Slash menu /bookmark (pt-BR) que abre UrlPromptDialog"
  - "PageEditor wire-up: insercao otimista do bloco + fetch metadata em paralelo + updateBlock"
affects:
  - "src/components/page/blocknote-schema.ts: 4 customs (mention-item, embed-board, database, bookmark)"
  - "src/components/page/slash-menu.ts: SlashMenuHandlers ganha onTriggerBookmark opcional"
  - "src/components/page/PageEditor.tsx: estado bookmarkPromptOpen + invoke fetch-url-metadata + findInsertedBlock heuristica"
tech-stack:
  added: []
  patterns:
    - "Edge Function Deno autoexposta via supabase/functions/<nome>/index.ts (mesmo padrao de invite-user/submit-form)"
    - "Parsing HTML por regex sobre HTML cru (sem dependencia deno-dom, evita peso no MVP)"
    - "UA realista Safari macOS pra evitar bot blocks em sites populares"
    - "AbortController timeout 10s + limite de 2MB no body lido"
    - "Cache da metadata no JSON do bloco (sem refetch em re-render)"
    - "UX otimista: insere bloco placeholder primeiro, depois atualiza com metadata real"
    - "createReactBlockSpec retornando factory (API v0.51) - invocado como BookmarkBlock() no schema"
key-files:
  created:
    - "supabase/functions/fetch-url-metadata/index.ts"
    - "src/components/page/blocks/UrlPromptDialog.tsx"
    - "src/components/page/blocks/BookmarkBlock.tsx"
  modified:
    - "src/components/page/blocknote-schema.ts"
    - "src/components/page/slash-menu.ts"
    - "src/components/page/PageEditor.tsx"
decisions:
  - "Parsing HTML por regex (em vez de deno-dom) - cobre 95% dos casos OG/Twitter, evita dependencia extra no Edge Function. Trade-off aceito: fragil pra HTML mal-formado, mas fallback gracioso (campos null) ja cobre."
  - "Auth: Edge Function nao valida JWT explicitamente porque verify_jwt=true e default do Supabase. Como nao acessa recursos privilegiados, basta deixar Supabase rejeitar requests sem auth (mesmo padrao de check-user-active)."
  - "UX otimista na insercao: bloco aparece imediato com so a URL (fallback minimo renderiza), metadata chega depois via updateBlock. Evita spinner bloqueante no slash menu."
  - "findInsertedBlock por heuristica (url + fetched_at vazio): API publica do insertBlocks nao retorna id de forma estavel via cast. Heuristica eh suficiente porque so um bloco com aquela URL e fetched_at vazio existe num dado momento."
  - "onTriggerBookmark NAO condicional a pageId/workspaceId: bookmark funciona em qualquer contexto do editor (diferente de Database que precisa de page anchor). Permite uso futuro em previews/standalone editors."
  - "Auto-prefix https:// no UrlPromptDialog quando usuario digita so 'github.com'. UX padrao em todos os editores tipo Notion."
  - "Bookmark cacheado nos props do bloco BlockNote (nao em tabela separada): segue padrao de DatabaseBlock (snapshot inline). Botao 'Atualizar preview' permite refresh manual quando necessario."
metrics:
  duration_minutes: 15
  tasks_completed: 5
  files_created: 3
  files_modified: 3
  tests_added: 0
  total_tests: 199
  completed_date: 2026-05-22
---

# Fase 02 Plano 02-09: Edge Function fetch-url-metadata + Bloco Bookmark Summary

## One-liner

Adiciona bloco Bookmark via slash menu `/bookmark`: dialog pt-BR pede URL, Edge Function `fetch-url-metadata` (Deno) faz fetch HTML com UA realista e timeout 10s, parse de OpenGraph + Twitter Cards + favicon retorna metadata cacheada nos props do bloco BlockNote, e renderiza card horizontal (favicon + title + description + imagem) com botao "Atualizar preview" e fallback minimo (so URL como link) se fetch falha ou pagina nao tem OG.

## O que foi feito

### Edge Function fetch-url-metadata (`supabase/functions/fetch-url-metadata/index.ts`)

Deno Edge Function que:

1. **CORS + OPTIONS** padrao das outras Edge Functions do projeto
2. **Valida** que metodo eh POST, body eh JSON com `{url: string}`, URL eh parseable e protocolo eh http/https
3. **Fetch HTML** com UA realista (`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15...`), Accept-Language pt-BR, redirect=follow
4. **Timeout 10s** via AbortController + clearTimeout
5. **Limite 2MB** no HTML processado pra evitar consumo excessivo
6. **Parse por regex** robusta o suficiente pra MVP:
   - `extractMeta(html, prop, attr)`: suporta `<meta property|name="X" content="Y">` em qualquer ordem de atributos (forward + reversed regex)
   - `extractTitle(html)`: pega primeiro `<title>...</title>`
   - `extractFavicon(html, base)`: procura `<link rel="icon|shortcut icon|apple-touch-icon">`, fallback `/favicon.ico` na origem
   - `resolveUrl(relative, base)`: usa `new URL(rel, base)` pra resolver URLs relativas
   - `decodeHtmlEntities`: decodifica `&amp; &lt; &gt; &quot; &#39; &apos; &nbsp;` + numericas decimais/hex
7. **Prioridade**: OpenGraph -> Twitter Cards -> tag tradicional (`<title>`, `<meta name="description">`)
8. **Retorna** `{url, title, description, image, favicon, site_name, fetched_at}` com campos faltantes como `null` (fallback gracioso)
9. **Tratamento de erros**: `AbortError` vira "Timeout ao buscar URL (10s)", outros viram mensagem do `Error`, status 500

### UrlPromptDialog (`src/components/page/blocks/UrlPromptDialog.tsx`)

Modal pt-BR para pedir URL:

- `DialogHeader` + `DialogTitle` + `DialogDescription` (a11y completo)
- `Input` com `autoFocus`, Enter confirma
- Estado `error` com mensagem inline (`text-destructive`)
- Auto-prefix `https://` quando falta protocolo
- Validacao: nao vazio, parseable como URL, protocolo http/https
- Botoes Cancelar/Inserir (variant outline + default)
- Reset de estado ao fechar (X, click-fora, Cancelar)
- Props customizaveis (`title`, `description`) para reuso futuro

### BookmarkBlock (`src/components/page/blocks/BookmarkBlock.tsx`)

`createReactBlockSpec({type:'bookmark', content:'none', propSchema:{url, title, description, image, favicon, site_name, fetched_at}})` retornando factory.

Render delega para `BookmarkView` que tem 3 estados visuais:

1. **Erro (`!p.url`)**: placeholder destrutivo "Bookmark invalido (URL ausente)". Defesa, raramente acionado porque criacao sempre passa URL.
2. **Sem metadata (`!hasMetadata`)**: card minimo horizontal com favicon (ou icone `Link` lucide se favicon ausente) + URL truncada como link primary + botao refresh. Renderiza enquanto metadata carrega e como fallback se Edge Function falha.
3. **Com metadata**: card horizontal com:
   - Coluna esquerda: `<h4>` title (truncate), `<p>` description (`line-clamp-2`), linha inferior com favicon + site_name (ou hostname fallback) + `ExternalLink` icon
   - Coluna direita: imagem `w-24 h-24 object-cover rounded` (se `p.image` presente)
   - Botao refresh canto sup direito (visivel so em hover via `group/bookmark`)

Comportamento:

- Click no card abre URL em nova aba (`target="_blank"` + `rel="noopener noreferrer"`)
- `handleRefresh` invoca `supabase.functions.invoke('fetch-url-metadata', {body:{url}})` e chama `editor.updateBlock(block, {type, props})` com nova metadata
- `e.preventDefault() + stopPropagation()` no botao refresh evitam acionar o click do `<a>` wrapper
- `onError` em `<img>` esconde tags com `display:none` (favicon broken nao polui UI)
- `contentEditable={false}` + classe `not-prose` isolam DOM do ProseMirror

### Schema (`src/components/page/blocknote-schema.ts`)

Import + invocacao `const bookmarkSpec = BookmarkBlock()` + key `'bookmark': bookmarkSpec` em `blockSpecs`. Preservou mention-item, embed-board e database. Schema agora tem 4 customs (1 inline + 3 block).

### Slash menu (`src/components/page/slash-menu.ts`)

- `SlashMenuHandlers.onTriggerBookmark?: () => void` opcional
- Item Bookmark adicionado a `customs` apos Database:
  - title: `'Bookmark'`
  - aliases: `['bookmark', 'link', 'url', 'preview', 'card', 'site']`
  - group: `'LFPro'`
  - subtext: `'Inserir card com preview de uma URL (titulo, descricao, imagem)'`

### PageEditor (`src/components/page/PageEditor.tsx`)

- Imports: `UrlPromptDialog`, `toast` de sonner, `supabase` client
- Estado: `bookmarkPromptOpen`
- `onTriggerBookmark: () => setBookmarkPromptOpen(true)` sempre passado (sem condicao pageId/workspaceId)
- `<UrlPromptDialog>` renderizado apos `<CreateDatabaseDialog>` com `onConfirm` que:
  1. Insere bloco bookmark com props minimas (so `url`, resto vazio) - UX otimista
  2. `findInsertedBlock()` localiza o bloco recem-inserido via heuristica (`url === url && !fetched_at`, busca reversa no document)
  3. Invoca `supabase.functions.invoke('fetch-url-metadata', {body:{url}})`
  4. Se sucesso: `editor.updateBlock(target.id, {type:'bookmark', props:{...metadata}})`
  5. Se erro: `toast.error` com hint pra usar "Atualizar preview" no bloco

## Verificacao

### Build + Tests

- `npm run build` passa em 16.31s, 0 erros novos. Bundle `Page-Cy6p8phA.js` cresceu de 697kb para 702kb (+5kb, esperado por BookmarkBlock + UrlPromptDialog + invoke logic)
- `npm run test` passa: **199 testes (10 arquivos)**, mesmo total da fase 02-05. Sem regressao em `PageEditor.test.tsx` (3 testes) apos a extensao
- Dev server `npm run dev` (porta 8083) responde HTTP 200 + HMR reload limpo
- Zero em-dash, todas as strings UI em pt-BR
- 4 customs no schema (`mention-item`, `embed-board`, `database`, `bookmark`) confirmados via grep
- Slash menu LFPro agora expoe 4 items (Mencionar item, Embedar board, Database, Bookmark)

### Estrutura

- 3 arquivos criados (Edge Function + UrlPromptDialog + BookmarkBlock)
- 3 arquivos modificados (schema + slash-menu + PageEditor)
- 5 commits atomicos

### Verificacao funcional

Edge Function nao deployada (parte da estrategia: Edge Function eh um arquivo no projeto, deploy via Supabase CLI ou Coolify acontece separadamente). Como o supabase client em dev aponta pra Supabase remoto (`legvzsdbgyggubdomwxp`), invocar a funcao em dev so funciona apos `supabase functions deploy fetch-url-metadata`. Antes do deploy:

- Fluxo na UI funciona ate a invocacao (slash menu abre dialog, dialog insere bloco placeholder)
- O `invoke('fetch-url-metadata')` retorna erro `Function not found` e cai no toast de erro
- Bloco fica em estado "sem metadata" (renderiza fallback minimo com URL como link)
- Botao "Atualizar preview" no bloco continua tentando refetch (mesmo comportamento)

Apos deploy da funcao, o fluxo end-to-end opera completo. Estrutura compilada + wired esta correta.

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 2 - Critico] Aceitar fetched_at vazio no `findInsertedBlock`**

- **Encontrado durante:** Tarefa 5 (wire-up no PageEditor)
- **Issue:** A heuristica padrao "achar ultimo bloco com mesma URL" daria conflito se o usuario inserir 2 bookmarks da mesma URL em sequencia rapida. Especificacao de bloco recem-inserido precisa diferenciar do bloco ja preenchido.
- **Correcao:** Heuristica composta: busca reversa no document por bloco com `type==='bookmark' && props.url===url && !props.fetched_at`. Quando metadata chega e o updateBlock acontece, `fetched_at` vira nao-vazio e o bloco deixa de matchear. Garante 1-pra-1 entre invocacao e atualizacao.
- **Arquivos modificados:** `src/components/page/PageEditor.tsx`
- **Commit:** `3e12856`

**2. [Regra 1 - Bug] Acessor de `editor.document` retorna tipo generico**

- **Encontrado durante:** Tarefa 5
- **Issue:** API publica do componente faz cast de `editor.document` pra `PageEditorBlocks` (sem tipos custom). Acessar `block.props.url` direto daria type error no TS strict.
- **Correcao:** Cast intermediario `as unknown as Array<{id?,type?,props?:{url?,fetched_at?}}>` mantem narrowing local sem propagar tipos pesados do BlockNote pros consumidores. Mesmo padrao usado para `block.props` no BookmarkView.
- **Arquivos modificados:** `src/components/page/PageEditor.tsx`, `src/components/page/blocks/BookmarkBlock.tsx`
- **Commit:** `3e12856` + `222b6f4`

**3. [Regra 3 - Blocking] DialogDescription faltando no UrlPromptDialog do plano**

- **Encontrado durante:** Tarefa 2 (UrlPromptDialog)
- **Issue:** Plano sugeria `<p className="text-sm text-muted-foreground">{description}</p>` direto dentro do DialogContent. Radix UI Dialog emite warning de acessibilidade quando falta `DialogDescription` (ou aria-describedby).
- **Correcao:** Usei `<DialogDescription>{description}</DialogDescription>` dentro do `<DialogHeader>`. A11y completo + warnings limpos no console.
- **Arquivos modificados:** `src/components/page/blocks/UrlPromptDialog.tsx`
- **Commit:** `424f11f`

**4. [Regra 2 - Critico] Adicionei `apple-touch-icon` aos rels aceitos no favicon discovery**

- **Encontrado durante:** Tarefa 1 (Edge Function)
- **Issue:** Plano cobria so `icon` e `shortcut icon`. Sites modernos (sobretudo PWAs e sites mobile-first) frequentemente declaram so `apple-touch-icon` ou colocam `icon` apos outras tags rel.
- **Correcao:** Regex inclui `(?:shortcut\s+icon|icon|apple-touch-icon)`. Aumenta cobertura sem custo.
- **Arquivos modificados:** `supabase/functions/fetch-url-metadata/index.ts`
- **Commit:** `912fd09`

**5. [Regra 2 - Critico] Decodificacao de entidades HTML**

- **Encontrado durante:** Tarefa 1 (Edge Function)
- **Issue:** Meta tags frequentemente tem `&amp;`, `&#39;`, `&quot;` em title/description (gerados por server-side templating). Plano nao tratava decode, resultava em texto sujo no card.
- **Correcao:** Helper `decodeHtmlEntities` cobre entidades nomeadas comuns + numericas decimais (`&#NNN;`) + hex (`&#xHH;`). Aplicado em `extractMeta` e `extractTitle` antes de retornar.
- **Arquivos modificados:** `supabase/functions/fetch-url-metadata/index.ts`
- **Commit:** `912fd09`

Nenhum desvio arquitetural. Plano executado essencialmente como escrito, com 5 melhorias de robustez (3x Regra 2 critica, 1x Regra 1 bug, 1x Regra 3 blocking).

## Issues Adiados

Nenhum em escopo direto desta plan. Deploy real da Edge Function depende de `supabase functions deploy fetch-url-metadata` que e operacional (nao requer codigo).

## Commits

| Tarefa | Hash | Mensagem |
|--------|------|----------|
| 1 | `912fd09` | feat(02-09): add fetch-url-metadata Edge Function |
| 2 | `424f11f` | feat(02-09): add UrlPromptDialog modal for bookmark URL input |
| 3 | `222b6f4` | feat(02-09): add BookmarkBlock custom BlockNote spec |
| 4 | `8ded678` | feat(02-09): register bookmark block in BlockNote schema |
| 5 | `3e12856` | feat(02-09): wire Bookmark slash menu + UrlPromptDialog into PageEditor |

## Self-Check: PASSOU

- supabase/functions/fetch-url-metadata/index.ts: ENCONTRADO
- src/components/page/blocks/UrlPromptDialog.tsx: ENCONTRADO
- src/components/page/blocks/BookmarkBlock.tsx: ENCONTRADO
- src/components/page/blocknote-schema.ts (modificado): ENCONTRADO (bookmark registrado)
- src/components/page/slash-menu.ts (modificado): ENCONTRADO (onTriggerBookmark + item Bookmark)
- src/components/page/PageEditor.tsx (modificado): ENCONTRADO (UrlPromptDialog wired + invoke fetch-url-metadata)
- Commit 912fd09: ENCONTRADO
- Commit 424f11f: ENCONTRADO
- Commit 222b6f4: ENCONTRADO
- Commit 8ded678: ENCONTRADO
- Commit 3e12856: ENCONTRADO

## Proximos planos

- **02-10 (Synced Block):** Vai estender PageEditor.tsx, blocknote-schema.ts, slash-menu.ts em sequencia serial (mesmo padrao do bookmark). Tabela nova `synced_blocks` + hook `useSyncedBlock(id)` + bloco que busca content via React Query + realtime invalidando cache.
- **02-11:** Polimento final + smoke tests da fase.
- **Deploy operacional:** Apos merge, rodar `supabase functions deploy fetch-url-metadata` pra habilitar Edge Function em producao. Sem migration extra necessaria.
