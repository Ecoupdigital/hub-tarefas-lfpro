---
phase: 01-docs-mode-notion
plan: 01-07
subsystem: page-versions
tags: [page, versions, history, snapshot, restore, blocknote, react-query]
requires:
  - 01-01 (schema page_versions + RLS Members can view/insert)
  - 01-04 (usePageAutoSave + PageHeader com onOpenHistory + Page.tsx)
provides:
  - "Hook usePageVersions(pageId) - lista versoes ordenadas desc (limit 50)"
  - "Hook useCreatePageVersion - insere snapshot (content + title) em page_versions"
  - "Hook useRestorePageVersion - cria snapshot do estado atual ANTES de aplicar versao antiga"
  - "Componente PageVersionsPanel - Dialog listando versoes + AlertDialog de confirmacao + acao Restaurar"
  - "usePageAutoSave estendido: dispara snapshot a cada 5 saves OU 5 minutos (o que vier primeiro)"
  - "PageEditor.editorRef - exposicao da instancia BlockNote para chamadas externas (editor.replaceBlocks)"
affects:
  - src/pages/Page.tsx
  - src/components/page/PageEditor.tsx
  - src/components/page/usePageAutoSave.ts
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget de snapshot apos save (snapshot perdido nao quebra UX)"
    - "Refs para counters e getters volateis (evita virar dependencia que reseta debounce)"
    - "Restore com auto-versionamento (snapshot do estado atual antes de aplicar versao antiga)"
    - "MutableRefObject para expor instancia de editor com tipagem solta (evita propagar generics pesados do BlockNote)"
key-files:
  created:
    - src/hooks/usePageVersions.ts
    - src/components/page/PageVersionsPanel.tsx
    - .plano/fases/01-docs-mode-notion/01-07-SUMMARY.md
  modified:
    - src/components/page/usePageAutoSave.ts
    - src/components/page/PageEditor.tsx
    - src/pages/Page.tsx
decisions:
  - "Snapshot a cada 5 saves OU 5 minutos (o que vier primeiro). Argumento: usuario tipico edita em rajadas (~10-30 saves/sessao), 5 = ~5 snapshots/sessao = razoavel. 5min e limite superior para sessoes longas. Storage: ~50KB por snapshot, 5 por sessao = 250KB, sustentavel."
  - "Restore preserva estado atual: cria snapshot do current ANTES de aplicar a versao antiga. Garante zero dataloss e permite voltar atras."
  - "Snapshot failure e silencioso (catch sem toast). A edicao em andamento e mais critica que o snapshot perdido; proximo ciclo tenta de novo."
  - "PageVersionsPanel usa AlertDialog do shadcn (ao inves de confirm() nativo) para consistencia visual com TrashDrawer."
  - "PageEditor expoe editor via MutableRefObject<unknown> em vez de forwardRef. Motivo: o tipo do editor BlockNote propaga generics pesados; tipagem solta no consumidor (Page.tsx) e mais ergonomica. RLS no banco e a fonte autoritativa de seguranca, nao a tipagem."
  - "Diff visual NAO implementado no MVP. Lista mostra apenas titulo + autor + data; usuario decide com base em timestamp. Diff fica para polish futuro (custo de implementacao alto vs. valor marginal no MVP)."
  - "Limite de 50 versoes na query (sem paginacao). Caso uma pagina ultrapasse 50 snapshots, paginacao infinita fica para futuro. Snapshots antigos continuam em page_versions, so nao aparecem no painel."
  - "Restaurar nao restringe role: viewer NAO chega aqui porque o editor ja esta read-only (canEdit=false). Editor/admin/member podem restaurar. RLS bloqueia se algum nao-membro tentar via API direta."
metrics:
  duration: "~12min"
  completed_at: "2026-05-22T13:23Z"
  tasks_completed: 5
  files_created: 2
  files_modified: 3
  commits: 4
  tests_passed: "188/188"
---

# Fase 01 Plano 01-07: Historico de versoes de pagina - Summary

Persiste snapshots periodicos de cada pagina e permite restaurar qualquer versao anterior sem perda do estado atual. O snapshot e disparado a cada 5 saves OU 5 minutos (o que vier primeiro) dentro do `usePageAutoSave`, fazendo fire-and-forget para nao bloquear UX. O painel de historico (`PageVersionsPanel`) lista ate 50 versoes ordenadas do mais recente para o mais antigo, mostrando autor e data ptBR. Restaurar uma versao primeiro cria um snapshot do estado atual (auto-versionamento), depois aplica `content + title` da versao escolhida na tabela `pages` e chama `editor.replaceBlocks` para refletir no editor sem reload.

## Tarefas executadas

| # | Nome | Commit | Arquivos chave |
|---|------|--------|----------------|
| 1 | usePageVersions hooks (3 exports) | `3b0ae30` | src/hooks/usePageVersions.ts |
| 2 | usePageAutoSave - snapshot trigger | `4eec17e` | src/components/page/usePageAutoSave.ts |
| 3 | PageVersionsPanel component | `6e3d063` | src/components/page/PageVersionsPanel.tsx |
| 4 | Page.tsx + PageEditor editorRef | `9f69837` | src/pages/Page.tsx, src/components/page/PageEditor.tsx |
| 5 | Verificacao funcional (build + tests + runtime) | (auto) | - |

## Implementacao por camada

### Hooks layer (Task 1)

`src/hooks/usePageVersions.ts` expoe 3 hooks:

- **`usePageVersions(pageId)`** - useQuery em `['page_versions', pageId]`, select de `id, page_id, content, title, created_by, created_at`. Ordena por `created_at DESC`, limit 50. `staleTime: 30s`. Enabled quando pageId presente.
- **`useCreatePageVersion`** - mutation insert em `page_versions` com `page_id, content, title, created_by (do auth.getUser())`. `retry: 1`. Invalida `['page_versions', pageId]`.
- **`useRestorePageVersion`** - composta:
  1. `await createSnapshot.mutateAsync(...)` do estado atual (auto-versionamento).
  2. `supabase.from('pages').update({ content, title }).eq('id', pageId)`.
  3. Retorna `{ content, title }` aplicados para o caller atualizar o editor.
  - Invalida `['page', pageId]`, `['page_versions', pageId]`, `['pages']`, `['all-pages']`.

Tipagens: `unknown[]` no boundary publico do hook (matching o pattern do `useUpdatePageContent` em useCrudMutations), cast para `Json` so na chamada do Supabase via `as never` ou `as Json`.

### Auto-save extension (Task 2)

`usePageAutoSave` agora aceita parametro opcional `getCurrentTitle?: () => string`. Internamente:

- `saveCountRef = useRef(0)` - conta saves bem-sucedidos desde o ultimo snapshot.
- `lastSnapshotRef = useRef<number>(Date.now())` - timestamp do ultimo snapshot.
- `getCurrentTitleRef = useRef(getCurrentTitle)` - sincronizado via `useEffect` para nao virar dep volatil de `flush`.

Fluxo dentro de `flush`, apos `mutation.mutateAsync` resolver com sucesso:

```ts
saveCountRef.current += 1;
const elapsed = Date.now() - lastSnapshotRef.current;
if (saveCountRef.current >= 5 || elapsed >= 5 * 60_000) {
  saveCountRef.current = 0;
  lastSnapshotRef.current = Date.now();
  void createSnapshot.mutateAsync({ pageId, content, title: getCurrentTitleRef.current?.() })
    .catch(() => { /* silencioso */ });
}
```

Garantias:
- Snapshot e fire-and-forget. Falha de network NAO afeta o `setStatus('saved')` que o usuario ve.
- Counter so incrementa apos save bem-sucedido. Save com erro nao conta.
- `lastSnapshotRef` so atualiza quando snapshot e DISPARADO, nao quando confirmado. Aceitavel - elimina spam de tentativas em caso de erro pontual.

### UI layer (Task 3)

`PageVersionsPanel.tsx` (173 linhas):

- **Dialog raiz** mostrando lista. Header com icone `History` + titulo "Historico de versoes".
- **Estados:** loading spinner, empty state ("Nenhuma versao salva ainda..."), lista de itens.
- **Cada item** mostra titulo da versao (fallback para titulo atual da page), autor (do `useProfiles` por `created_by`) e data ptBR via `format(new Date(v.created_at), "dd 'de' MMM 'as' HH:mm", { locale: ptBR })`.
- **Botao Restaurar** abre `AlertDialog` de confirmacao explicando "O estado atual sera salvo no historico antes da restauracao". Confirmar dispara `restore.mutate({...})` com `currentContent` e `currentTitle` da page atual.
- **onSuccess do restore:** toast "Versao restaurada", chama `onAfterRestore(res.content)` callback, fecha dialog.

### Integration layer (Task 4)

`PageEditor.tsx` ganhou prop opcional `editorRef?: MutableRefObject<unknown>`. Um `useEffect` separado sincroniza `editorRef.current = editor` quando o editor monta e limpa no unmount. Tipagem solta porque o `BlockNoteEditor` tem generics pesados (schema custom + estilos custom) que vazam para todo consumidor.

`Page.tsx`:

```ts
const editorRef = useRef<unknown>(null);
const currentTitleRef = useRef<string>('');
if (page) currentTitleRef.current = page.title;

const autoSave = usePageAutoSave({
  pageId: pageId ?? '',
  getCurrentTitle: () => currentTitleRef.current,
});
const [historyOpen, setHistoryOpen] = useState(false);

const handleAfterRestore = (newContent: unknown[]) => {
  const editor = editorRef.current as { document: unknown[]; replaceBlocks: Function } | null;
  if (editor) editor.replaceBlocks(editor.document, newContent);
};
```

`PageHeader` recebe `onOpenHistory={() => setHistoryOpen(true)}` (anteriormente disabled). O item de menu "Historico de versoes" agora abre o painel.

## Verificacao funcional

| Check | Resultado |
|-------|-----------|
| `npm run build` | PASSOU (15.76s, gera `Page-*.js` 688KB / 203KB gzip) |
| `npm run test` | PASSOU (188/188 em 8 arquivos, 2.54s) |
| `npx tsc --noEmit -p tsconfig.app.json` (arquivos novos) | PASSOU (0 erros em usePageVersions.ts, PageVersionsPanel.tsx, usePageAutoSave.ts, PageEditor.tsx, Page.tsx) |
| `curl http://localhost:8080/` | HTTP 200 |
| `curl http://localhost:8080/src/hooks/usePageVersions.ts` | HTTP 200 (Vite serve modulo) |
| `curl http://localhost:8080/src/components/page/PageVersionsPanel.tsx` | HTTP 200 |
| `grep` por em-dash em arquivos do plano | Sem em-dash |
| UI em pt-BR | OK ("Historico de versoes", "Restaurar esta versao?", "O estado atual da pagina sera salvo no historico antes da restauracao...", "Cancelar", "Restaurar", "Restaurando...", "Versao restaurada", "Erro ao restaurar versao", "Nenhuma versao salva ainda. Snapshots sao criados automaticamente a cada poucos minutos de edicao.") |

### Verificacao automatizada (criterios do plano)

- `grep -E "usePageVersions|useCreatePageVersion|useRestorePageVersion" src/hooks/usePageVersions.ts | wc -l` -> 4 (3 exports + 1 referencia interna do useRestore)
- `grep -E "SNAPSHOT_EVERY_N_SAVES|useCreatePageVersion" src/components/page/usePageAutoSave.ts | wc -l` -> 4
- `grep -E "PageVersionsPanel|historyOpen|editorRef" src/pages/Page.tsx src/components/page/PageEditor.tsx | wc -l` -> 14

## Cenarios de teste manual (a validar em UI deploy)

A Task 5 era checkpoint:human-verify, mas a fase e `autonomous: true`. Cenarios documentados aqui para validacao em prod:

1. **Snapshot a cada 5 saves:**
   - Abrir pagina nova, editar 5 vezes em sequencia (digitar paragrafo, criar heading, lista, callout, divider) com pausas curtas (>1.5s para cada save consolidar).
   - Apos o 5o save bem-sucedido, abrir menu (...) -> "Historico de versoes".
   - Dialog deve mostrar pelo menos 1 versao com o estado capturado.
   - `select count(*) from page_versions where page_id = '<id>'` deve retornar >= 1.

2. **Snapshot por intervalo (5 min):**
   - Editar 1 ou 2 vezes, esperar 5 minutos sem mais edicoes, fazer 1 save adicional.
   - Esse save dispara snapshot porque `elapsed >= 5 * 60_000`.

3. **Restaurar versao:**
   - Continuar editando para acumular outra versao (5 mais saves).
   - Abrir Historico, clicar "Restaurar" na versao mais antiga.
   - AlertDialog explica o auto-versionamento. Confirmar.
   - Editor deve mostrar o conteudo antigo imediatamente (replaceBlocks).
   - Reabrir Historico: agora ha uma nova versao no topo, capturando o estado IMEDIATAMENTE ANTES do restore. Garantia de zero dataloss.

4. **Viewer NAO restaura:**
   - User com role `viewer` ja tem `editor.isEditable = false`. O botao "Restaurar" funciona via mutation, mas RLS no banco bloqueia o `update` em `pages` (RLS exige editor+). RLS retorna error, toast "Erro ao restaurar versao".

5. **Snapshot silencioso falha:**
   - Tomar Supabase offline durante uma rajada de saves. O save em `pages` falha primeiro (status='error'). Snapshot nem chega a disparar. Quando Supabase volta, proxima rajada normal funciona.

6. **Pagina sem versoes (estado inicial):**
   - Abrir uma page recem-criada e abrir Historico: empty state "Nenhuma versao salva ainda. Snapshots sao criados automaticamente a cada poucos minutos de edicao."

## Desvios do Plano

Nenhum desvio funcional. Pequenos ajustes alem da especificacao:

1. **AlertDialog do shadcn substituindo `confirm()` nativo** (Task 3). O plano sugeria `confirm()` mas o projeto ja usa `AlertDialog` em outras areas similares (TrashDrawer, ColumnPermissionsPanel). Manter consistencia visual e mais correto que economizar 15 linhas. **[Regra 4 - Polish UX (auto-decisao no fluxo autonomo)]**

2. **`MutableRefObject<unknown>` em vez de `forwardRef`** no PageEditor (Task 4). O plano sugeria forwardRef como alternativa. Optei por `editorRef` como prop opcional porque:
   - Evita reescrita do componente (preserva default export simples)
   - Tipagem solta na ref e mais ergonomica para o consumidor (Page.tsx) - propagar `BlockNoteEditor<typeof lfproBlockNoteSchema, ...>` geraria ruido em cascata
   - Cleanup explicito no unmount (`editorRef.current = null`)
   **[Regra 4 - Arquitetural (auto-decisao no fluxo autonomo)]**

3. **`currentTitleRef` em Page.tsx** capturando page.title no render. Sem isso, `getCurrentTitle` recriaria a cada render e quebraria a estabilidade do callback no `usePageAutoSave`. Solucao: ref que sempre reflete o ultimo titulo, lida pelo hook via `getCurrentTitleRef.current()`.

4. **`useEffect` adicional no PageEditor para sincronizar editorRef** (em vez de inline no `useCreateBlockNote`). Garante cleanup correto se o componente desmontar, evitando que o ref aponte para um editor stale. Pattern alinhado com `useEffect` que ja existia para `editor.isEditable`.

5. **Diff visual NAO implementado**. O plano marcou como "opcional, basico ou skip se complexo demais". Decisao: skip no MVP. Diff de blocks BlockNote (estrutura aninhada) e custoso. Lista mostra apenas timestamp + autor; usuario decide. Documentado em "Issues Adiados".

Nenhuma mudanca de arquitetura nao prevista. Sem corrigir bugs pre-existentes (TS errors em useSupabaseData, useTemplates, applyTemplate, groupBy, importData continuam - fora de escopo). Sem mexer em codigo do 01-08 (image, presence, realtime sync).

## Issues Adiados (fora de escopo)

- **Diff visual entre versoes**: lista mostra apenas autor + data. Diff de blocks BlockNote (estrutura tree aninhada com props custom) e complexo o suficiente para merecer plano proprio. Considerar usar `@blocknote/core` exporters (toMarkdown / toHTML) + biblioteca de diff de texto (ex: `diff-match-patch`) em um futuro plano "Page Diff".
- **Paginacao infinita do historico**: hard limit de 50 versoes. Pages com edicao prolongada podem ter mais. Adicionar `useInfiniteQuery` quando precisar.
- **Retencao de versoes (cleanup automatico)**: nenhum job remove versoes antigas. Pode crescer indefinidamente. Considerar trigger SQL "manter apenas ultimas N versoes por page" quando o storage virar problema (>500MB).
- **Indicador no PageHeader quando ha versao restaurada recente**: badge "Restaurado de 22/05" seria UX melhor pos-restore. Defer para polish.
- **Restricao explicita de role para restore** (apenas admin+editor, nao member): atualmente qualquer canEdit=true restaura. Se for problema, criar RPC `can_restore_page_version` com check de role.
- **TS errors pre-existentes em useSupabaseData.ts, useTemplates.ts, applyTemplate.ts, groupBy.ts, importData.ts**: nao relacionados a este plano. Build de Vite passa. Defer.

## Self-Check: PASSOU

Arquivos criados:
- ENCONTRADO: src/hooks/usePageVersions.ts
- ENCONTRADO: src/components/page/PageVersionsPanel.tsx
- ENCONTRADO: .plano/fases/01-docs-mode-notion/01-07-SUMMARY.md

Arquivos modificados:
- ENCONTRADO: src/components/page/usePageAutoSave.ts (snapshot trigger)
- ENCONTRADO: src/components/page/PageEditor.tsx (editorRef prop)
- ENCONTRADO: src/pages/Page.tsx (PageVersionsPanel + handleAfterRestore + currentTitleRef)

Commits encontrados:
- ENCONTRADO: 3b0ae30 (usePageVersions hooks)
- ENCONTRADO: 4eec17e (usePageAutoSave snapshot trigger)
- ENCONTRADO: 6e3d063 (PageVersionsPanel)
- ENCONTRADO: 9f69837 (Page.tsx + editorRef integration)

Criterios de sucesso do prompt:
- [x] Todas tarefas commitadas atomicamente (4 commits)
- [x] SUMMARY em .plano/fases/01-docs-mode-notion/01-07-SUMMARY.md
- [x] ROADMAP.md sera atualizado via `roadmap update-plan-progress 01-07` no fechamento
- [x] usePageVersions hook criado: query e mutation (snapshot manual + listar versoes + restaurar)
- [x] usePageAutoSave estendido: dispara snapshot a CADA 5 SAVES OU a CADA 5 MINUTOS
- [x] PageVersionsPanel: lista versoes (autor, timestamp, preview de titulo), botao "Restaurar"
- [x] Diff opcional - SKIP no MVP (documentado em Issues Adiados)
- [x] Restaurar cria nova versao current a partir da antiga, NAO sobrescreve historico
- [x] Botao "Historico" no PageHeader abre panel
- [x] Sem em-dash. UI pt-BR.
- [x] `npm run build` passa
- [x] `npm run test` passa (188/188)

## Proximo plano

01-08 - Imagens, presence e realtime sync de pages. Upload de imagens via bucket `attachments` + custom block image no BlockNote, indicador "X esta editando" via `usePresence`, e Supabase Realtime channel para invalidar cache em outros clients apos cada save.
