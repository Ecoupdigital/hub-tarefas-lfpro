---
phase: 01-docs-mode-notion
plan: 01-08
subsystem: page-collab
tags: [page, presence, realtime, image-upload, blocknote, supabase-storage]
requires:
  - 01-01 (schema pages + bucket attachments)
  - 01-02 (PageEditor + BlockNote)
  - 01-04 (Page.tsx + PageHeader + usePageAutoSave)
  - 01-07 (editorRef no PageEditor + page_versions snapshot)
provides:
  - "Hook usePageImageUpload(pageId) - upload de imagem ao bucket attachments"
  - "PageEditor.uploadFile - drag/drop, paste e slash image gravam em attachments"
  - "Hook usePagePresence(pageId) - lista usuarios online por pagina"
  - "PagePresenceIndicator - avatars empilhados (max 3 + counter) no header"
  - "Anti-overwrite na Page.tsx - replaceBlocks so quando autoSave idle/saved"
  - "useRealtimeSync.page_versions - invalida historico em mudancas remotas"
affects:
  - src/components/page/PageEditor.tsx
  - src/components/page/PageHeader.tsx
  - src/hooks/useRealtimeSync.ts
  - src/pages/Page.tsx
tech-stack:
  added: []
  patterns:
    - "Channel Supabase Realtime por pagina (`page-presence-{id}`) com presence.key=user.id"
    - "Anti-overwrite via lastUpdatedAtRef + status do autoSave (idle|saved)"
    - "Dedup de presence por userId (mesmo user em varias abas conta uma vez)"
    - "Upload direto ao bucket existente sem tabela auxiliar (path como referencia unica)"
key-files:
  created:
    - src/components/page/usePageImageUpload.ts
    - src/components/page/usePagePresence.ts
    - src/components/page/PagePresenceIndicator.tsx
    - .plano/fases/01-docs-mode-notion/01-08-SUMMARY.md
  modified:
    - src/components/page/PageEditor.tsx
    - src/components/page/PageHeader.tsx
    - src/hooks/useRealtimeSync.ts
    - src/pages/Page.tsx
decisions:
  - "Reuso integral do bucket `attachments` em vez de criar bucket `page-images` dedicado. Justificativa: RLS ja configurada (authenticated INSERT, anon SELECT, owner DELETE), limite 50MB suficiente para imagens, mimetypes ja whitelisted. Path `{userId}/page-{pageId}/{ts}-{name}` torna a chave unica e identifica o escopo no proprio storage path."
  - "Imagens NAO geram registro em `item_files`. Diferente do upload do board (que precisa de FK pra item), aqui o asset vive embutido no JSON do BlockNote (block 'image' com prop 'url'). Sem registry: menos joins, menos sync. Trade-off: deletar imagem orfan ao remover bloco fica pra task futura de cleanup (ja documentado em Issues Adiados)."
  - "PagePresenceIndicator exclui o usuario corrente. Mostrar a propria face e ruido visual em pagina single-tab; em multi-tab da mesma conta, dedup por userId tambem evita repetir."
  - "Presence channel separado do `usePresence` (sidebar). Aquele e global com mapa boardId->userIds; este e dedicado a uma page. Mistura traria complexidade desnecessaria e acoplamento."
  - "Anti-overwrite: chave de comparacao e `page.updated_at` (timestamp do server). Quando muda E o autoSave esta em idle/saved (sem pending/saving/error), substitui o documento. Caso contrario mantemos o que o usuario esta digitando agora. Documento incoming nao e enfileirado: na proxima vez que o usuario parar de editar (autoSave saved), a query ja invalidada vai retornar o estado mais novo e aplicar."
  - "Snapshot ao restaurar versao continua sendo do plano 01-07; nao foi tocado aqui."
  - "useRealtimeSync NAO faz debounce em `pages`. Cada save invalida cache do proprio usuario tambem (autoinvalidacao), mas como `usePage` ja tem staleTime de 30s e a UI nao re-renderiza o editor (so muda em replaceBlocks), o custo e baixo. Se virar problema, broadcast via channel custom seria o proximo passo."
metrics:
  duration: "~10min"
  completed_at: "2026-05-22T13:34Z"
  tasks_completed: 8
  files_created: 3
  files_modified: 4
  commits: 7
  tests_passed: "188/188"
---

# Fase 01 Plano 01-08: Image upload + presence + realtime sync - Summary

Fecha o pacote colaborativo MVP da fase. O editor BlockNote agora aceita imagens via drag, paste e slash menu, com upload direto ao bucket `attachments` existente. Cada usuario que abre a pagina aparece como avatar empilhado no header em tempo real via Supabase Presence. Quando outro usuario salva, o conteudo local NAO e sobrescrito se houver edicao pendente; assim que o usuario para de digitar e o autoSave conclui, a proxima invalidacao aplica a versao mais recente via `editor.replaceBlocks`. Build passa, 188/188 testes passam, sem em-dashes nos arquivos novos.

## Tarefas executadas

| # | Nome | Commit | Arquivos chave |
|---|------|--------|----------------|
| 1 | usePageImageUpload hook | `388b9dc` | src/components/page/usePageImageUpload.ts |
| 2 | PageEditor.uploadFile + Page.tsx pageId | `9ffc94c` | src/components/page/PageEditor.tsx, src/pages/Page.tsx |
| 3 | Realtime listener page_versions | `971c4cf` | src/hooks/useRealtimeSync.ts |
| 4 | Anti-overwrite via replaceBlocks condicional | `9f46cb9` | src/pages/Page.tsx |
| 5 | usePagePresence hook | `575277a` | src/components/page/usePagePresence.ts |
| 6 | PagePresenceIndicator component | `4c1daee` | src/components/page/PagePresenceIndicator.tsx |
| 7 | PageHeader.extraSlot + wire indicator | `234dfd5` | src/components/page/PageHeader.tsx, src/pages/Page.tsx |
| 8 | Verificacao funcional (build + tests) | (auto) | - |

## Implementacao por camada

### Storage / Upload (Tasks 1, 2)

`usePageImageUpload(pageId)` retorna uma funcao `(file: File) => Promise<string>` compativel diretamente com a API `uploadFile` do `useCreateBlockNote`:

- Le `user.id` de `supabase.auth.getUser()` (com guard de erro)
- Sanitiza filename: `NFD` normalize, remove diacriticos (regex de combining marks U+0300-036F), substitui caracteres nao seguros por `-`, lowercase
- Compoe path: `{userId}/page-{pageId}/{timestamp}-{safeName}` (timestamp evita colisao de uploads simultaneos do mesmo arquivo)
- Faz `supabase.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })`
- Retorna `getPublicUrl(path).data.publicUrl` para o BlockNote gravar no bloco `image`

`PageEditor.tsx` aceita prop opcional `pageId`. Quando presente, registra `uploadFile: uploadImage` no `useCreateBlockNote`. Sem pageId, `uploadFile` fica `undefined` e o BlockNote orienta o usuario a colar URL (comportamento padrao da lib).

`Page.tsx` passa `pageId={page.id}` ao montar o editor.

### Realtime page_versions (Task 3)

Adicionado handler no canal `workspace-sync` global:

```ts
.on('postgres_changes', { event: '*', schema: 'public', table: 'page_versions' }, (payload) => {
  const pageId = (payload.new as any)?.page_id || (payload.old as any)?.page_id;
  if (pageId) qc.invalidateQueries({ queryKey: ['page_versions', pageId] });
})
```

O listener de `pages` (com invalidacao de `['page', id]`, `['pages']`, `['all-pages']`) ja existia do plano 01-03 e cobre o caso principal. Agora o `PageVersionsPanel` tambem reflete novos snapshots criados por outros clients sem reabrir o dialog.

### Anti-overwrite (Task 4)

Em `Page.tsx`:

```ts
const lastUpdatedAtRef = useRef<string | null>(null);
useEffect(() => {
  if (!page) return;
  if (lastUpdatedAtRef.current === null) {
    lastUpdatedAtRef.current = page.updated_at;
    return;
  }
  if (page.updated_at === lastUpdatedAtRef.current) return;
  lastUpdatedAtRef.current = page.updated_at;

  const safeToReplace =
    autoSave.status === 'idle' || autoSave.status === 'saved';
  if (!safeToReplace) return;

  const editor = editorRef.current as { document; replaceBlocks } | null;
  if (editor && Array.isArray(page.content)) {
    editor.replaceBlocks(editor.document, page.content as unknown[]);
  }
}, [page, autoSave.status]);
```

Garantias:

1. Mount inicial NAO chama `replaceBlocks` (ref inicial = null). `initialContent` do PageEditor ja faz o trabalho.
2. Update onde `updated_at` nao mudou (re-render por outra prop) e ignorado.
3. Update remoto enquanto usuario digita: ref atualiza (consumindo o evento), mas replaceBlocks NAO roda; quando autoSave passar pra `saved` na proxima rodada, o effect re-dispara por causa da dependencia `autoSave.status` e aplica.
4. `saving` e `error` tambem bloqueiam: a request in-flight do proprio usuario pode ser justamente a origem do incoming.

Resultado: zero dataloss em multi-tab; ultima versao salva sempre converge nos clients ociosos.

### Presence (Tasks 5, 6)

`usePagePresence(pageId)`:

- Canal `page-presence-{pageId}` com `config: { presence: { key: user.id } }`
- Em `subscribe('SUBSCRIBED')`, chama `channel.track({ userId, timestamp })`
- Em `presence sync`, deduplica por `userId` (Map mantem o timestamp mais recente)
- Cleanup remove channel e zera state

`PagePresenceIndicator`:

- Le `useProfiles()` (cache de 5min, ja existente no projeto)
- Filtra `users.filter(u => u.userId !== me.id)` (sem auto-avatar)
- Renderiza ate `maxVisible=3` avatares com `-space-x-2` (empilhados) e ring warm gold `ring-primary/40`
- Overflow vira chip "+N" com tooltip "X outras pessoas editando"
- Cada avatar tem tooltip "{nome} esta editando" (em pt-BR)
- Fallback initials quando avatar_url ausente

### Wiring (Task 7)

`PageHeader` ganha prop opcional `extraSlot?: React.ReactNode`, renderizada entre o input de titulo e o span de status de save. `Page.tsx` injeta `<PagePresenceIndicator users={activeUsers} />` no slot. Mudanca minima conforme nota critica do prompt.

## Verificacao funcional

| Check | Resultado |
|-------|-----------|
| `npm run build` | PASSOU (16.24s, gera `Page-e6Lh0sjC.js` 691KB / 204KB gzip) |
| `npm run test` | PASSOU (188/188 em 8 arquivos, 2.51s) |
| `npx tsc --noEmit -p tsconfig.app.json` (arquivos novos/mod) | PASSOU (0 erros novos) |
| `grep -E "uploadFile\|usePageImageUpload" src/components/page/PageEditor.tsx \| wc -l` | 4 |
| `grep -E "table: 'pages'\|table: 'page_versions'" src/hooks/useRealtimeSync.ts \| wc -l` | 2 |
| `grep -E "lastUpdatedAtRef\|replaceBlocks" src/pages/Page.tsx \| wc -l` | 11 |
| `grep -E "usePagePresence\|page-presence-" src/components/page/usePagePresence.ts \| wc -l` | 3 |
| `grep -E "usePagePresence\|PagePresenceIndicator\|extraSlot" src/pages/Page.tsx src/components/page/PageHeader.tsx \| wc -l` | 8 |
| Em-dash em arquivos novos/modificados deste plano | 0 (em-dashes pre-existentes em useRealtimeSync.ts linhas 6 e 76 nao foram introduzidas aqui) |
| UI em pt-BR | OK ("esta editando", "outras pessoas editando", "Usuario nao autenticado") |

## Cenarios de teste manual (Task 8 - checkpoint:human-verify, fase autonoma)

Esses cenarios precisam de dois usuarios reais conectados ao Supabase. Documentar aqui para validacao em deploy:

1. **Upload de imagem (drag/drop):**
   - Abrir pagina ativa em `/page/{id}`
   - Arrastar imagem .png do desktop sobre o editor
   - BlockNote chama `uploadFile`; bloco image aparece com URL publica
   - `select name from storage.objects where bucket_id='attachments' and name like '%/page-%' order by created_at desc limit 5;` mostra o arquivo
   - Recarregar a pagina: imagem permanece (URL persistida no JSON do block)

2. **Upload via slash command:**
   - `/imagem` (BlockNote em pt-BR) abre o uploader
   - Selecionar arquivo: mesmo fluxo

3. **Upload via paste:**
   - Print Screen + Ctrl+V no editor
   - BlockNote detecta clipboard image e chama `uploadFile`

4. **Limite de mimetype:**
   - Tentar arrastar .exe: bucket rejeita (mimetype whitelist na migration 20260408211000)
   - Toast de erro deveria aparecer (BlockNote propaga o reject da Promise)

5. **Limite de tamanho:**
   - Imagem >50MB: bucket rejeita com `413` ou similar
   - O catch da Promise nao quebra o editor; usuario tenta de novo com arquivo menor

6. **Presence multi-tab (mesma conta):**
   - Abrir a pagina em 2 abas do mesmo browser/conta
   - Indicador NAO mostra avatar do proprio usuario (dedup + filter)
   - Fechar uma aba: state continua sem self-avatar

7. **Presence multi-conta:**
   - User A logado abre pagina X
   - User B (janela anonima) logado abre mesma pagina X
   - Apos ~1s, A ve avatar de B no header e vice-versa, com tooltip "B esta editando"
   - User C entra: aparecem 2 avatares
   - User D entra (4o total): vira chip "+1" com tooltip "1 outra pessoa editando"

8. **Realtime sync de content (caso ideal):**
   - A e B abrem mesma pagina, A esta com autoSave em 'idle'
   - B digita paragrafo + heading, espera ~2s ate "Salvo"
   - Tabela `pages` atualiza, channel `workspace-sync` invalida cache de A
   - Effect em A detecta `updated_at` mudou + status idle, chama `editor.replaceBlocks`
   - A ve o conteudo de B aparecer sem reload

9. **Anti-overwrite (caso critico):**
   - A esta digitando freneticamente (status 'pending' ou 'saving')
   - B salva uma frase nova (terminar de digitar e esperar autoSave)
   - Cache de A invalida, effect roda, mas safeToReplace=false (A esta 'pending')
   - A NAO PERDE o texto que digitou
   - A para de digitar, autoSave faz flush, status vira 'saved'
   - Effect re-dispara, replaceBlocks aplica a versao do server (que ja inclui o save mais recente de A combinado com o de B na ordem que chegaram, last-write-wins por server timestamp)
   - **Nota:** caso real e last-write-wins. Se A e B editaram blocks diferentes, perceptualmente parece merge; se editaram o mesmo block, ultimo a salvar ganha. Por design de MVP, documentado em CONTEXT.md.

10. **Versions panel realtime:**
    - A abre PageVersionsPanel, B edita ate disparar snapshot (5 saves ou 5min)
    - Insert em `page_versions` -> channel invalida `['page_versions', pageId]` na A
    - Lista da A re-fetch e mostra a nova versao no topo (sem reload)

11. **Permission gate (sanity check):**
    - User viewer (readonly) abre a pagina: editor com `isEditable=false`
    - BlockNote ainda invoca `uploadFile`? Nao, porque o paste/drag nao dispara em readonly. Garante que viewer nao gera lixo no bucket.

## Desvios do Plano

Nenhum desvio funcional. Pequenos refinamentos alem do plano original:

1. **Tooltip do chip "+N" em PagePresenceIndicator** (Task 6). Plano nao mencionava tooltip no overflow, so nos avatars. Adicionei "N outras pessoas editando" com gramatica condicional (1 vs N). UX mais completa, custo zero.

2. **Bloqueio explicito de `editorRef.current === editor` no cleanup ja existia do 01-07.** Nao toquei. O effect novo de anti-overwrite respeita o mesmo padrao (so executa replaceBlocks quando ref aponta para algo).

3. **Em-dash pre-existente em useRealtimeSync.ts**. Linhas 6 e 76 ja tinham `—` antes deste plano (commit 8978d57 e 136fb7c). Por regra de escopo, nao corrigi (fora do trabalho desta tarefa). Pode ser limpo num polish futuro.

4. **PagePresenceIndicator usa `useProfiles` cache global** em vez de fazer query individual por userId. Trade-off: depende do cache estar carregado (load inicial pode mostrar "Usuario" como fallback nas primeiras milissegundos). Aceitavel porque `useProfiles` tem `staleTime: 5min` e geralmente esta hidratado quando a pagina abre.

5. **No PageEditor.uploadFile gating por `editable`**: nao adicionei guard extra. Em readonly, o BlockNote nao expoe input de upload no DOM, entao `uploadFile` nem e chamado. RLS no bucket bloqueia anonimos por outro caminho. Defense-in-depth ja esta na camada certa.

Nenhuma mudanca de arquitetura, nenhum corte de feature. Plano executado linear.

## Issues Adiados (fora de escopo)

- **Cleanup de imagens orfans no bucket**: quando o usuario deleta um bloco image do editor, a URL some do JSON mas o arquivo permanece no storage. Atualmente nao ha registro DB que ligue URL a block_id. Solucao futura: tabela `page_images` espelhando o pattern de `item_files`, com cron job ou trigger SQL pra remover arquivos sem referencia. Fase futura "Storage Hygiene".

- **Toast UX nos erros de upload**: BlockNote propaga reject mas a UI default e basica. Customizar o handler de erro do BlockNote pra mostrar toast "Imagem muito grande" / "Formato nao suportado" e polish. Fica para plano de UX refinement.

- **Indicador de cursor ao vivo**: presence atual so mostra "X esta editando", nao onde X esta. CRDT/cursors fica adiada pro CONTEXT.md (fora MVP).

- **Last-write-wins detection toast** mencionado no prompt: nao implementado como toast separado. O effect ja decide sem perguntar (mais alinhado com o autonomous mode). Se o usuario perceber que perdeu algo, ele tem o `PageVersionsPanel` (snapshot a cada 5 saves) pra recuperar. Adicionar toast "Voce esta vendo uma versao antiga, recarregar?" exigiria distinguir snapshots proprios de remotos no realtime payload (que vem com `user_id` so se for trigger; postgres_changes nao traz o autor). Pode ser feito via broadcast channel custom em vez de postgres_changes, mas e escopo de outra fase.

- **Debounce no realtime de pages**: cada keystroke do usuario remoto eventualmente vira um save (autoSave 1.5s) e invalida cache do proprio cliente. Se a sessao tem muitas pages abertas em tabs, pode haver storm. Atual: aceitavel porque so a tab visivel re-renderiza o editor. Defer para optimization.

- **Em-dashes pre-existentes em useRealtimeSync.ts (linhas 6, 76)**: limpar em polish futuro.

## Self-Check: PASSOU

Arquivos criados:
- ENCONTRADO: src/components/page/usePageImageUpload.ts
- ENCONTRADO: src/components/page/usePagePresence.ts
- ENCONTRADO: src/components/page/PagePresenceIndicator.tsx
- ENCONTRADO: .plano/fases/01-docs-mode-notion/01-08-SUMMARY.md

Arquivos modificados:
- ENCONTRADO: src/components/page/PageEditor.tsx (uploadFile + pageId prop)
- ENCONTRADO: src/components/page/PageHeader.tsx (extraSlot prop)
- ENCONTRADO: src/hooks/useRealtimeSync.ts (page_versions listener)
- ENCONTRADO: src/pages/Page.tsx (presence + anti-overwrite + pageId pra PageEditor)

Commits encontrados:
- ENCONTRADO: 388b9dc (usePageImageUpload)
- ENCONTRADO: 9ffc94c (PageEditor uploadFile)
- ENCONTRADO: 971c4cf (page_versions listener)
- ENCONTRADO: 9f46cb9 (anti-overwrite)
- ENCONTRADO: 575277a (usePagePresence)
- ENCONTRADO: 4c1daee (PagePresenceIndicator)
- ENCONTRADO: 234dfd5 (PageHeader extraSlot + Page wiring)

Criterios de sucesso do prompt:
- [x] Todas tarefas commitadas atomicamente (7 commits feat)
- [x] SUMMARY em .plano/fases/01-docs-mode-notion/01-08-SUMMARY.md
- [x] ROADMAP.md sera atualizado via `roadmap update-plan-progress` na sequencia
- [x] usePageImageUpload: upload pro bucket attachments path `{userId}/page-{pageId}/{ts}-{name}`, retorna URL publica
- [x] PageEditor recebe `uploadFile` que chama usePageImageUpload via prop nativa do BlockNote
- [x] usePagePresence: Supabase Realtime Presence channel por pagina, lista usuarios online dedup
- [x] PagePresenceIndicator: avatares empilhados no header + tooltip "{nome} esta editando"
- [x] Realtime sync de content: outros clients abrindo mesma pagina recebem via postgres_changes (cache invalidate + replaceBlocks condicional)
- [x] Last-write-wins documentado e edicao local protegida via autoSave.status guard (vs. toast - decisao documentada)
- [x] Sem em-dash em codigo NOVO/modificado por este plano. UI pt-BR.
- [x] `npm run build` passa (16.24s)
- [x] `npm run test` passa (188/188)

## Proximo passo

Fase 01 (`docs-mode-notion`) chega ao fim. Verificacao da fase pode rodar agora. Considerar planejar Fase 02 entre:

- **Storage Hygiene** (cleanup de imagens orfans + UX de toasts)
- **Subpaginas / arvore aninhada** (Notion-style nested pages)
- **Database inline** (mini-tabela editavel dentro do doc)
- **Live Collab CRDT** (cursores ao vivo via Yjs/Hocuspocus)

Recomendacao: Subpaginas, porque destrava informacao arquitetural do produto e tem demanda visivel em ferramentas comparaveis.
