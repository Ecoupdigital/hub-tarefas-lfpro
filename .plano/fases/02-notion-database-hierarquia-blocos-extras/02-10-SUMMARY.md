---
phase: 02-notion-database-hierarquia-blocos-extras
plan: 02-10
subsystem: page/blocks/synced
tags: [blocknote, synced-block, realtime, workspace-scope]
dependency_graph:
  requires:
    - "02-01 (tabela synced_blocks, RLS, RPC can_access_synced_block, realtime publication)"
    - "page/PageEditor (01-04)"
    - "page/blocknote-schema (mantem embed-board, database, bookmark)"
  provides:
    - "Block spec custom 'synced' no schema BlockNote"
    - "Slash menu item 'Bloco sincronizado' (pt-BR) condicional a workspaceId"
    - "Hooks useSyncedBlock, useSyncedBlocksByWorkspace"
    - "Mutations useCreateSyncedBlock, useUpdateSyncedBlockContent"
    - "SyncedBlockPickerDialog (criar novo ou referenciar existente)"
  affects:
    - "PageEditor.tsx (novo dialog + handler)"
    - "blocknote-schema.ts (novo block spec)"
    - "slash-menu.ts (novo item LFPro)"
tech_stack:
  added: []
  patterns:
    - "createReactBlockSpec factory (BlockNote v0.51)"
    - "Mini-editor BlockNote interno com schema default (sem nesting)"
    - "Debounced save 1s (mesma faixa de usePageAutoSave)"
    - "Last-write-wins (sem CRDT no MVP)"
    - "Reconciliacao via lastSyncedSerializedRef + isLocalEditRef pra evitar stomp de cursor"
key_files:
  created:
    - "src/components/page/blocks/SyncedBlock.tsx"
    - "src/components/page/blocks/SyncedBlockPickerDialog.tsx"
  modified:
    - "src/hooks/useSupabaseData.ts (+ useSyncedBlock, useSyncedBlocksByWorkspace)"
    - "src/hooks/useCrudMutations.ts (+ useCreateSyncedBlock, useUpdateSyncedBlockContent)"
    - "src/components/page/blocknote-schema.ts (+ syncedSpec)"
    - "src/components/page/slash-menu.ts (+ onTriggerSyncedBlock + item LFPro)"
    - "src/components/page/PageEditor.tsx (+ state, handler, dialog)"
decisions:
  - "Mini-editor BlockNote interno usa schema DEFAULT (sem mention/embed/database/bookmark/synced) pra evitar nesting infinito e dependencias cruzadas"
  - "Last-write-wins no MVP; reconciliacao via duas refs (lastSyncedSerializedRef + isLocalEditRef) impede que echo do proprio save sobrescreva edicao em curso e mate o cursor"
  - "useSyncedBlock retorna null em vez de lancar quando RLS bloqueia, pra UI renderizar placeholder amigavel ('Bloco nao acessivel') em vez de quebrar"
  - "Slash menu item so aparece quando workspaceId esta disponivel (PageEditor sem workspace nao expoe a opcao, evitando erros de RLS)"
  - "Realtime invalidation completa do canal synced_blocks fica pra 02-11 (consolidacao); aqui o invalidate local via mutation ja garante refetch na mesma sessao"
metrics:
  duration: "execucao automatica (5 tarefas)"
  completed: "2026-05-22"
  tasks_completed: 5
  files_changed: 7
---

# Fase 02 Plano 02-10: Bloco Synced (synced_blocks) Summary

Adicao do bloco BlockNote `synced` com mini-editor interno editavel, persistencia compartilhada via tabela `synced_blocks` (workspace-scoped), e dialog que escolhe entre criar novo bloco sincronizado ou referenciar um existente do mesmo workspace.

## O que foi construido

1. **Hooks de leitura (`useSupabaseData.ts`)**
   - `useSyncedBlock(id)`: query individual com `staleTime: 0` (sempre fresh apos invalidacao via realtime, que vem em 02-11). Retorna `null` quando RLS bloqueia, pra UI renderizar placeholder em vez de quebrar.
   - `useSyncedBlocksByWorkspace(workspaceId, enabled)`: lista ordenada por `updated_at desc` pro picker dialog. `enabled` evita fetch quando o dialog esta fechado.

2. **Mutations (`useCrudMutations.ts`)**
   - `useCreateSyncedBlock`: insere row com `workspace_id`, `content` (PartialBlock[]) e `created_by = auth.uid()`. Invalida `['synced-blocks-workspace', workspaceId]`. Toast de erro no `onError`.
   - `useUpdateSyncedBlockContent`: update do JSON `content`. Invalida `['synced-block', id]`. Sem toast (chamada debounced; log apenas).

3. **Block spec (`SyncedBlock.tsx`)**
   - `createReactBlockSpec` type `'synced'`, prop `synced_block_id` (string), `content: 'none'` (bloco atomico no editor pai).
   - Render delega pra `SyncedBlockView` que:
     - Carrega `useSyncedBlock(id)` -> renderiza placeholder se id ausente ou syncedBlock null.
     - Monta editor BlockNote interno via `useCreateBlockNote({ dictionary: ptDictionary, initialContent })` usando schema DEFAULT (decisao: sem nesting de blocos custom).
     - Tema acompanha `next-themes` (light/dark) reaproveitando `lfproBlockNoteLightTheme` / `lfproBlockNoteDarkTheme`.
     - Salva com debounce de 1s; reconcilia updates externos via `replaceBlocks` apenas quando o serializado difere e nao e echo da edicao local.
     - Header visual: ícone `Repeat2` + label "Bloco sincronizado" + borda esquerda primary/40 + background `muted/10`.

4. **Picker dialog (`SyncedBlockPickerDialog.tsx`)**
   - Botao primario "Criar novo bloco sincronizado" -> mutation + propaga id pro caller -> dialog fecha.
   - Lista condicional "Ou referencie um existente" so aparece quando `synced.length > 0` (evita secao vazia).
   - Cada item da lista mostra preview textual (extraido dos primeiros blocos, tolerante a varios formatos) + "Atualizado em DD de MMM de YYYY" (locale pt-BR).

5. **Integracao (`blocknote-schema.ts`, `slash-menu.ts`, `PageEditor.tsx`)**
   - Schema: registra `'synced': syncedSpec` preservando embed-board/database/bookmark/mention-item.
   - Slash menu: novo `onTriggerSyncedBlock?` opcional. Item "Bloco sincronizado" so adiciona ao menu quando o handler e passado, com aliases pt-BR/en (sincronizado, synced, sync, compartilhado, shared).
   - PageEditor: estado `syncedDialogOpen`, handler que cria/referencia + `editor.insertBlocks([{ type: 'synced', props: { synced_block_id } }])` apos o cursor. Item so e exposto quando `workspaceId` esta disponivel.

## Tarefas (commits)

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | hooks de leitura | fdb48d6 | src/hooks/useSupabaseData.ts |
| 2 | mutations | 09ae630 | src/hooks/useCrudMutations.ts |
| 3 | SyncedBlock spec + view | ebe2d96 | src/components/page/blocks/SyncedBlock.tsx |
| 4 | SyncedBlockPickerDialog | 81819c7 | src/components/page/blocks/SyncedBlockPickerDialog.tsx |
| 5 | wire schema + slash + PageEditor | 9f1febb | blocknote-schema.ts, slash-menu.ts, PageEditor.tsx |

## Modelo de sync (importante pra 02-11)

Quando 02-11 adicionar listener realtime para `synced_blocks`, ele deve invalidar `['synced-block', id]`. O `useSyncedBlock` ja esta com `staleTime: 0` e o `SyncedBlockView` ja tem o `useEffect` que aplica `replaceBlocks` quando o JSON serializado muda e nao e echo da edicao local. Logo, ao plugar o invalidate o sync entre pages funciona end-to-end sem mudancas em 02-10.

## Verificacoes automatizadas

- Tarefa 1: `grep -E "useSyncedBlock|useSyncedBlocksByWorkspace"` -> 3 matches (>= 2)
- Tarefa 2: `grep -E "useCreateSyncedBlock|useUpdateSyncedBlockContent"` -> 4 matches (>= 2)
- Tarefa 3: arquivo existe, `grep -E "useSyncedBlock|useUpdateSyncedBlockContent|replaceBlocks"` -> 11 matches (>= 3)
- Tarefa 4: arquivo existe, `grep -E "useSyncedBlocksByWorkspace|useCreateSyncedBlock"` -> 7 matches (>= 2)
- Tarefa 5: `grep -E "SyncedBlock|onTriggerSyncedBlock|syncedDialogOpen"` nos 3 arquivos -> 11 matches (>= 4)
- `npm run build` -> compila com sucesso (16.47s, sem novos warnings)
- `npm run test` -> 199 testes passam (10 arquivos)
- `curl -s http://localhost:8080/` -> 200 (dev server saudavel)
- `grep "—"` em SyncedBlock.tsx + SyncedBlockPickerDialog.tsx -> nenhum em-dash

## Desvios do Plano

Nenhum. Plano executado conforme escrito.

Pequenos refinamentos vs. snippets do plano (todos compativeis com `must_haves`):
- Adicionei `onError` com `toast.error` em `useCreateSyncedBlock` e log silencioso em `useUpdateSyncedBlockContent` (debounced; toast em cada save iria poluir).
- Reformulei o `useEffect` de reconciliacao em `SyncedBlockView` pra ser mais explicito sobre os 3 caminhos (sem mudanca, echo da nossa edicao, edicao externa) com comentarios. Comportamento identico ao do plano.
- `previewText` no Picker recebe parser tolerante a varios formatos de `content` (string vs array de inline content) pra nao quebrar se algum synced block antigo tiver estrutura inesperada.
- `format(..., "dd 'de' MMM 'de' yyyy", { locale: ptBR })` em vez de `"dd MMM yyyy"` pra formato mais natural pt-BR no Picker.
- Comentei o cast `as PartialBlock[]` no `editor.insertBlocks` (mantem padrao dos outros blocos custom no PageEditor).

## Self-Check: PASSOU

- Arquivos criados existem (SyncedBlock.tsx, SyncedBlockPickerDialog.tsx)
- Arquivos modificados contem as referencias esperadas (useSyncedBlock, syncedSpec, onTriggerSyncedBlock, syncedDialogOpen)
- 5 commits 02-10 no git log
- `npm run build` passa
- `npm run test` passa (199 testes)
- Sem em-dash; pt-BR; sem n8n; sem mencao de cortes de equipe
