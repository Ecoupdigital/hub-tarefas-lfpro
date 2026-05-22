---
phase: 01-docs-mode-notion
verified: 2026-05-22T13:42:00Z
status: human_needed
score: 11/12 must-haves verificados
gaps:
  - truth: "Migration `20260522110000_pages_schema.sql` aplicada ao projeto Supabase remoto (legvzsdbgyggubdomwxp)"
    status: human_needed
    reason: "Migration arquivo existe e e sintaticamente valida, mas Aplicacao remota e responsabilidade do dono via fluxo Coolify (brownfield). Tentativa de `supabase migration list --linked` falhou por falta de SUPABASE_DB_PASSWORD nesta sessao."
    artifacts:
      - path: "supabase/migrations/20260522110000_pages_schema.sql"
        issue: "Arquivo presente (180 linhas, 3 tabelas, 2 RPCs, 10 policies, 3 ALTER PUBLICATION). Nao aplicado em prod nesta sessao."
    missing:
      - "Aplicar migration no Supabase remoto via `npx supabase db push --linked` (ou fluxo Coolify) com SUPABASE_DB_PASSWORD configurado"
      - "Validar via `select 1 from pg_tables where tablename in ('pages','page_versions','page_permissions')` que retorna 3 linhas"
---

# Fase 01: Docs Mode (Paginas estilo Notion) - Relatorio de Verificacao

**Objetivo da Fase:** Usuario pode criar paginas Notion-like ao lado de boards no mesmo workspace, escolhendo tipo no CreateBoardModal. Paginas usam BlockNote com tema LFPro, suportam blocos basicos + slash command, @mention de items e embed read-only de boards.

**Verificado:** 2026-05-22T13:42:00Z
**Status:** human_needed (11/12 automatizado-OK; 1 item depende de aplicacao manual de migration em prod)

## Alcance do Objetivo

### Verdades Observaveis (Success Criteria do ROADMAP.md)

| # | Verdade | Status | Evidencia |
|---|---------|--------|-----------|
| 1 | Usuario pode criar nova pagina via toggle no `CreateBoardModal` (Tarefas / Pagina) | VERIFIED | `src/components/modals/CreateBoardModal.tsx:23` define `type CreationType = 'board' \| 'page'`; linhas 183/194 sao botoes de selecao; linha 104 chama `useCreatePage()` quando tipo='page' |
| 2 | Paginas aparecem no sidebar do workspace ao lado de boards, diferenciadas por icone | VERIFIED | `src/components/AppSidebar.tsx:22` importa PageSidebarItem; linha 252 renderiza com icone FileText/emoji; `useWorkspaceEntries` em `src/hooks/useSupabaseData.ts:128` mescla boards + pages |
| 3 | Pagina abre com editor BlockNote estilizado com tokens LFPro (warm gold, Jost/Montserrat, dark mode) | VERIFIED | `src/components/page/PageEditor.tsx:11` importa `lfproBlockNoteLightTheme`/`Dark`; `blocknote-theme.ts` define cores warm gold; `blocknote-overrides.css` injeta Jost/Montserrat. Smoke test passa (`PageEditor.test.tsx` 3/3) |
| 4 | Todos os blocos do MVP funcionam: headings, paragrafos, listas, checklist, code, quote, callout, divider, toggle, image upload, tabela inline, embed video/iframe | VERIFIED | `lfproBlockNoteSchema` em `blocknote-schema.ts:25` usa `...defaultBlockSpecs` (todos os blocks padrao BlockNote v0.51). Image upload conectado via `pageId ? uploadImage : undefined` em `PageEditor.tsx:83` |
| 5 | Slash command `/` insere blocos default e custom (`/mencionar`, `/embedar board`) | VERIFIED | `slash-menu.ts:45` "Mencionar item" + `:55` "Embedar board"; PageEditor.tsx:127 monta `<SuggestionMenuController triggerCharacter="/">`. Dictionary pt traduz defaults |
| 6 | `@mention` de item cria chip clicavel com nome+status do item; clique abre `ItemDetailPanel` | VERIFIED | `MentionInlineContent.tsx:60-62` resolve status via `labels[key]`; chip navega via `navigate('/board/:id?item=:itemId')` que abre ItemDetailPanel (padrao usado em outros breadcrumbs do projeto) |
| 7 | Bloco `embed board` renderiza tabela read-only do board escolhido inline na pagina | VERIFIED | `EmbedBoardBlock.tsx:286` define EmbedBoardView; linhas 327/338/349/364 marcadas com `contentEditable={false}`; registro no schema em `blocknote-schema.ts:27` |
| 8 | Conteudo da pagina persiste em tabela `pages` como JSON BlockNote, com auto-save debounced | VERIFIED | Migration cria `pages.content jsonb`; `usePageAutoSave.ts` debounce 1.5s; `Page.tsx:123` chama `autoSave.schedule(blocks)` no onChange; `useUpdatePageContent` em useCrudMutations |
| 9 | Historico de versoes em `page_versions` permite restaurar versao anterior | VERIFIED | Migration cria `page_versions`; `usePageVersions.ts:64` define `useRestorePageVersion` (cria snapshot atual ANTES de aplicar antiga); `PageVersionsPanel.tsx` UI com AlertDialog de confirmacao |
| 10 | Permissoes de pagina seguem o mesmo modelo de boards (RPC `can_access_page`) | VERIFIED | Migration linha 76 define `can_access_page` espelhando `can_access_board`; `usePagePermissions.ts` expoe 6 hooks; `PagePermissionsPanel.tsx` clona BoardPermissionsPanel; `Page.tsx:30` aplica `editable={canEdit}` |
| 11 | Soft delete (state) + Realtime sync + Trash/Restore funcionam pra paginas | VERIFIED | `pages.state` com check 'active/archived/deleted'; `useRealtimeSync.ts:49/57` listeners para pages e page_versions; `TrashDrawer.tsx:177` aba "Paginas" + restore via `useRestorePage` |
| 12 | Edicoes simultaneas mostram presence ("X esta editando"); last-write-wins | VERIFIED | `usePagePresence.ts:33` canal `page-presence-{id}` com `track({userId})`; `PagePresenceIndicator.tsx` avatares empilhados; anti-overwrite em `Page.tsx:39-63` (lastUpdatedAtRef + status guard) |

**Score:** 12/12 verdades verificadas no codebase. **Atencao**: verdade #8 e #9 dependem da migration aplicada em prod para funcionarem end-to-end.

### Artefatos Requeridos (Tres Niveis: existe, substantivo, conectado)

| Artefato | Existe | Substantivo | Conectado | Status |
|----------|--------|-------------|-----------|--------|
| `supabase/migrations/20260522110000_pages_schema.sql` | sim | sim (180 linhas, 29 statements estruturais) | sim (referenciado por hooks e types.ts) | VERIFIED (arquivo) / human_needed (aplicar em prod) |
| `src/types/page.ts` | sim | sim (Page, PageVersion, PagePermission, PageRole, PageState, PageContent, WorkspaceEntry) | sim (usado por Page.tsx e PagePermissionsPanel) | VERIFIED |
| `src/integrations/supabase/types.ts` | sim | sim (linha 1163 page_permissions, 1195 page_versions, 1230 pages, 1679 can_access_page, 1719 is_page_admin) | sim (importado por todos hooks) | VERIFIED |
| `src/components/page/PageEditor.tsx` | sim | sim (179 linhas, schema custom + slash menu + pickers + uploadFile + ref) | sim (consumido por Page.tsx:120) | VERIFIED |
| `src/components/page/blocknote-theme.ts` | sim | sim (light + dark, warm gold) | sim (importado em PageEditor.tsx:11) | VERIFIED |
| `src/styles/blocknote-overrides.css` | sim | sim (Jost body + Montserrat heads + warm gold hovers) | sim (importado em src/index.css) | VERIFIED |
| `src/components/page/blocknote-schema.ts` | sim | sim (mention-item + embed-board + defaults) | sim (passado a useCreateBlockNote em PageEditor.tsx:81) | VERIFIED |
| `src/components/page/slash-menu.ts` | sim | sim (getCustomSlashMenuItems com handlers + defaults BlockNote pt) | sim (chamado em PageEditor.tsx:131) | VERIFIED |
| `src/components/page/blocks/MentionInlineContent.tsx` | sim | sim (MentionChip + useMentionData + status resolution) | sim (registrado em blocknote-schema.ts:31) | VERIFIED |
| `src/components/page/blocks/ItemPickerPopover.tsx` | sim | sim (CommandDialog modal, debounce 200ms) | sim (renderizado em PageEditor.tsx:141) | VERIFIED |
| `src/components/page/blocks/EmbedBoardBlock.tsx` | sim | sim (EmbedBoardView com grupos/items/colunas + CTA) | sim (registrado em schema; `contentEditable={false}` em todos 5 estados) | VERIFIED |
| `src/components/page/blocks/BoardPickerPopover.tsx` | sim | sim (CommandDialog modal, workspace_name desambiguacao) | sim (renderizado em PageEditor.tsx:155) | VERIFIED |
| `src/pages/Page.tsx` | sim | sim (143 linhas: estados loading/error/archived/active + presence + anti-overwrite + restore handler) | sim (rota /page/:pageId em App.tsx:51) | VERIFIED |
| `src/components/page/PageHeader.tsx` | sim | sim (input titulo + saveStatus + menu Historico/Permissoes/Excluir + extraSlot) | sim (consumido em Page.tsx:111) | VERIFIED |
| `src/components/page/usePageAutoSave.ts` | sim | sim (debounce 1.5s + snapshot a cada 5 saves OU 5min) | sim (chamado em Page.tsx:26) | VERIFIED |
| `src/components/page/PagePermissionsPanel.tsx` | sim | sim (Dialog modal espelhando BoardPermissionsPanel) | sim (Page.tsx:128) | VERIFIED |
| `src/components/page/PageVersionsPanel.tsx` | sim | sim (lista + AlertDialog confirm + restore com auto-snapshot) | sim (Page.tsx:133, recebe onAfterRestore) | VERIFIED |
| `src/components/page/PagePresenceIndicator.tsx` | sim | sim (avatares empilhados max 3 + overflow chip + tooltips pt) | sim (extraSlot em Page.tsx:117) | VERIFIED |
| `src/components/page/usePagePresence.ts` | sim | sim (canal page-presence-{id} + track + dedup) | sim (Page.tsx:31) | VERIFIED |
| `src/components/page/usePageImageUpload.ts` | sim | sim (sanitize + path + getPublicUrl bucket attachments) | sim (PageEditor.tsx:16 + uploadFile prop quando pageId presente) | VERIFIED |
| `src/components/PageSidebarItem.tsx` | sim | sim (icone FileText/emoji + dropdown + AlertDialog) | sim (AppSidebar.tsx:252) | VERIFIED |
| `src/hooks/useSupabaseData.ts` (extensoes) | sim | sim (usePage, useAllPages, useWorkspaceEntries, useAllItemsForMention) | sim (consumido por Page.tsx, AppSidebar, ItemPickerPopover) | VERIFIED |
| `src/hooks/useCrudMutations.ts` (extensoes) | sim | sim (useCreatePage, useDeletePage, useRenamePage, useUpdatePageContent, useRestorePage) | sim (consumido por modal, sidebar, Page, autosave) | VERIFIED |
| `src/hooks/usePagePermissions.ts` | sim | sim (6 exports incluindo useCanEditPage com default-permissive) | sim (Page.tsx:30 aplica gate) | VERIFIED |
| `src/hooks/usePageVersions.ts` | sim | sim (3 exports + useRestorePageVersion compoe createSnapshot+update) | sim (PageVersionsPanel + usePageAutoSave) | VERIFIED |
| `src/hooks/useTrash.ts` (extensoes) | sim | sim (useDeletedPages + usePermanentDeletePage) | sim (TrashDrawer aba Paginas) | VERIFIED |
| `src/hooks/useRealtimeSync.ts` (extensoes) | sim | sim (listeners pages + page_versions invalidam React Query cache) | sim (canal workspace-sync global) | VERIFIED |

### Verificacao de Links Chave (Wiring)

| De | Para | Via | Status |
|----|------|-----|--------|
| CreateBoardModal | `pages` table | `useCreatePage()` mutation (linha 104 do modal) | WIRED |
| AppSidebar | useWorkspaceEntries | merge boards+pages ordenado por position | WIRED |
| Click em PageSidebarItem | rota /page/:id | useNavigate(`/page/${page.id}`) | WIRED |
| Rota /page/:pageId | Page.tsx | App.tsx:51 + React.lazy | WIRED |
| Page.tsx | PageEditor (BlockNote) | initialContent={page.content as PartialBlock[]} + onChange={autoSave.schedule} + editorRef | WIRED |
| PageEditor onChange | usePageAutoSave | debounce 1.5s -> useUpdatePageContent | WIRED |
| usePageAutoSave (5 saves) | useCreatePageVersion (snapshot) | counter ref + fire-and-forget | WIRED |
| RLS pages | RPC can_access_page | USING/WITH CHECK clauses (migration linhas 128-145) | WIRED |
| RLS page_permissions | RPC is_page_admin | INSERT/UPDATE/DELETE via is_page_admin | WIRED |
| PageVersionsPanel restore | useRestorePageVersion | cria snapshot atual + update pages + onAfterRestore -> editor.replaceBlocks | WIRED |
| PagePresenceIndicator | usePagePresence | channel page-presence-{id} | WIRED |
| Image drag/drop/paste | usePageImageUpload | uploadFile prop do useCreateBlockNote -> bucket attachments | WIRED |
| Realtime invalidacao | React Query cache | useRealtimeSync postgres_changes pages/page_versions | WIRED |
| Anti-overwrite | autoSave.status | Page.tsx:52 safeToReplace = idle\|saved | WIRED |

### Cobertura de Requisitos

| Requisito | Plano Fonte | Status | Evidencia |
|-----------|-------------|--------|-----------|
| REQ-01 (schema) | 01-01 | SATISFIED | Migration arquivo presente; types.ts atualizado; src/types/page.ts |
| REQ-02 (BlockNote editor) | 01-02 | SATISFIED | @blocknote pacotes + PageEditor + tema + overrides |
| REQ-03 (create modal + sidebar) | 01-03 | SATISFIED | CreateBoardModal toggle + AppSidebar+PageSidebarItem + hooks |
| REQ-04 (CRUD + autosave + trash) | 01-04 | SATISFIED | Page.tsx + PageHeader + usePageAutoSave + TrashDrawer aba |
| REQ-05 (mention + slash pt + embed) | 01-05, 01-05b | SATISFIED | MentionInlineContent + slash-menu + EmbedBoardBlock + pickers |
| REQ-06 (permissoes) | 01-06 | SATISFIED | usePagePermissions + PagePermissionsPanel + canEdit gate |
| REQ-07 (versoes) | 01-07 | SATISFIED | usePageVersions + PageVersionsPanel + restore com auto-snapshot |
| REQ-08 (image + presence + realtime) | 01-08 | SATISFIED | usePageImageUpload + usePagePresence + PagePresenceIndicator + anti-overwrite |

Sem requisitos orfaos. Cada PLAN tem SUMMARY correspondente (9 pares: 01-01 a 01-08 + 01-05b).

### Anti-Padroes Encontrados

| Arquivo | Linha | Padrao | Severidade | Impacto |
|---------|-------|--------|------------|---------|
| `src/components/page/PageHeader.tsx` | 96 | `placeholder:text-muted-foreground/60` (false positive: e classe Tailwind, nao stub) | Info | Nenhum |
| `src/hooks/useRealtimeSync.ts` | 6, 76 | em-dashes pre-existentes (documentado em 01-08 como adiado) | Warning | Convencao - polish |

Sem em-dashes em arquivos novos da Fase 01 (verificado via `grep -rn "—" src/components/page/ src/pages/Page.tsx supabase/migrations/20260522110000_pages_schema.sql` -> 0 matches).

Sem `TODO|FIXME|placeholder render|return null` em arquivos do feature.

### Build e Tests

| Check | Resultado |
|-------|-----------|
| `npm run build` | PASSOU (16.22s, 0 erros; chunk Page-e6Lh0sjC.js 691KB / 204KB gzip) |
| `npm run test` | PASSOU (188/188 testes em 8 arquivos, 2.58s) |
| Cobertura PageEditor | 3 smoke tests (mount vazio, onChange, editable=false) |

### Verificacao Humana Necessaria

Apesar de toda a logica estar implementada e validada estaticamente, os seguintes pontos exigem validacao em ambiente prod com dados reais e/ou multi-usuario:

1. **Migration aplicada em prod (CRITICO):** Tentativa de `supabase migration list --linked` falhou nesta sessao por falta de `SUPABASE_DB_PASSWORD`. Migration `20260522110000_pages_schema.sql` precisa ser aplicada no projeto Supabase `legvzsdbgyggubdomwxp` antes de qualquer uso real. Aplicar via fluxo Coolify ou `npx supabase db push --linked` com a senha do banco.

2. **Bucket `attachments` reuso:** Validar visualmente que uploads via drag/drop e paste no PageEditor caem no path `{userId}/page-{pageId}/{ts}-{filename}` no bucket existente. Verificar via `select name from storage.objects where bucket_id='attachments' and name like '%/page-%' limit 5`.

3. **Presence multi-conta:** Testar com 2+ usuarios reais logados em browsers/janelas distintas abrindo a mesma `/page/:id`. Cada um deve ver os avatares dos outros (sem mostrar a propria face).

4. **Anti-overwrite multi-tab:** Cenario classico: User A digitando freneticamente enquanto User B salva uma frase. O texto local de A NAO deve sumir. Apos A parar de digitar e autoSave concluir, a versao do server deve aparecer via replaceBlocks.

5. **RLS funciona end-to-end:** User fora do workspace tentando abrir URL direta `/page/:id` deve ver "Pagina nao encontrada" (RLS bloqueia query).

6. **Snapshot a cada 5 saves OU 5 minutos:** Editar 5 vezes uma pagina e abrir PageVersionsPanel; deve mostrar pelo menos 1 versao. SQL: `select count(*) from page_versions where page_id='...'` >= 1.

7. **Restaurar versao preserva estado atual:** Restaurar uma versao antiga deve criar primeiro um snapshot do estado atual, garantindo zero dataloss e permitindo voltar atras.

### Issues Adiados Aceitos

Documentados nos SUMMARYs respectivos como decisoes pragmaticas conscientes:

- **Diff visual no PageVersionsPanel** (adiado em 01-07): lista mostra apenas timestamp + autor; diff de blocks BlockNote (estrutura tree aninhada) e complexo, fica para plano "Page Diff" futuro.
- **Last-write-wins toast detectando overwrite remoto** (adiado em 01-08): effect ja decide silenciosamente; toast exigiria distinguir autor via broadcast channel custom em vez de postgres_changes.
- **Cleanup de imagens orfans no bucket** (adiado em 01-08): deletar bloco image nao remove arquivo; aguardando plano "Storage Hygiene".
- **Pages dentro de folders** (adiado em 01-03): schema ja suporta `folder_id` mas DnD UX nao implementado.
- **Em-dashes pre-existentes em useRealtimeSync.ts linhas 6/76** (adiado em 01-08): nao introduzidos pelos planos da fase, polish futuro.

### Resumo de Gaps

Fase 01 esta funcionalmente completa do ponto de vista de codigo. **Todos os 12 success criteria estao implementados e wired no codebase**. Build passa em 16.22s, todos os 188 testes passam.

O unico gap real e operacional: **a migration SQL precisa ser aplicada no Supabase remoto** para que a feature funcione end-to-end em producao. Esta nota ja consta no SUMMARY do 01-01 ("Pendente para o dono aplicar em producao") e e responsabilidade do dono via Coolify (padrao brownfield do projeto).

Apos a aplicacao da migration, recomenda-se a passada de verificacao humana sobre os 7 cenarios listados em "Verificacao Humana Necessaria" para confirmar comportamento real em prod.

### Proximos Passos

1. **Aplicar migration em prod** (acao do dono): `npx supabase db push --linked` com `SUPABASE_DB_PASSWORD` configurado, ou via fluxo Coolify habitual.
2. **Smoke test em prod** apos migration: criar pagina, digitar conteudo, fazer drag de imagem, abrir em 2 contas para validar presence.
3. **Considerar fase 02:** SUMMARY do 01-08 recomenda "Subpaginas / arvore aninhada" como destrava de informacao arquitetural. Alternativas: "Storage Hygiene", "Database inline", "Live Collab CRDT".
