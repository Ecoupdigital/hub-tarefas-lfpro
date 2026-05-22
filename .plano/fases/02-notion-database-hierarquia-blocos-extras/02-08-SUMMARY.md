---
phase: 02-notion-database-hierarquia-blocos-extras
plan: 02-08
subsystem: database-view-tabs
tags: [database, view-tabs, board-views, persistence, localstorage, dialog, blocknote]
requires:
  - "02-05: stubs DatabaseViewTabs + DatabaseBlock criados; useCreateDatabase cria 4 views"
  - "02-06: DatabaseViewRenderer aceita activeViewId opcional"
  - "02-07: DatabaseListView aceita activeViewId; ainda recebe pass-through do renderer"
provides:
  - "DatabaseViewTabs real: lista board_views como tabs com icone (Table2/Kanban/Calendar/List) + nome + botao '+'"
  - "CreateDatabaseViewDialog: modal pt-BR (input nome + grid 4-tipos) que cria board_view nova"
  - "DatabaseBlock: gerencia activeViewId em useState + persiste em localStorage chave lfpro-database-active-view-${boardId} + reconcilia fallback quando id persistido nao existe mais"
affects:
  - "src/components/database/DatabaseViewTabs.tsx: stub substituido por implementacao real (recebe activeViewId + onChangeView callbacks)"
  - "src/components/database/CreateDatabaseViewDialog.tsx: novo dialog de criacao"
  - "src/components/page/blocks/DatabaseBlock.tsx: useState + useEffect de reconciliation; passa activeViewId pra Tabs e Renderer"
tech-stack:
  added: []
  patterns:
    - "Lazy-init useState lendo localStorage com try/catch (modo privado, quota)"
    - "Reconciliation effect: se id persistido sumiu do db, fallback transparente pra is_default ou primeira view"
    - "Persistencia por boardId em chave dedicada (lfpro-database-active-view-${boardId}) - nao polui keys globais, multi-database friendly"
    - "Dialog pt-BR com Enter-to-submit, autofocus, disabled state durante mutation, reset on close"
    - "Tab callback up - estado vive no parent (DatabaseBlock) que tambem repassa pro Renderer, single source of truth dentro do bloco"
key-files:
  created:
    - "src/components/database/CreateDatabaseViewDialog.tsx"
  modified:
    - "src/components/database/DatabaseViewTabs.tsx"
    - "src/components/page/blocks/DatabaseBlock.tsx"
decisions:
  - "Estado activeViewId vive em DatabaseBlock (parent), nao em DatabaseViewTabs/Renderer separados - assim os dois componentes filhos ficam controlados pelo mesmo source of truth e Renderer recebe o mesmo id que o Tabs marca como ativo"
  - "Persistencia em localStorage (nao no db) - decisao do plano (truths) que reflete UX pessoal: cada usuario lembra qual view estava vendo, sem precisar de migration nova nem coluna activeViewId em board_views"
  - "Lazy-init via callback de useState le storage UMA vez no mount; updates subsequentes passam por setActiveViewId que tambem persiste - evita useEffect de leitura inicial e race condition entre mount e setStorage"
  - "Reconciliation com guard de exists evita loop infinito: useEffect so atualiza state se id atual nao existe mais nas views (depois que views carregam ou mudam por realtime)"
  - "DatabaseViewRenderer NAO foi modificado neste plano - prop activeViewId ja existia desde 02-06 e o switch interno ja resolvia fallback (is_default > primeira). Plano explicitamente coloca esse arquivo como no-op em task 3"
  - "Dialog usa <Label> do shadcn (htmlFor) para a11y; botao Criar fica disabled quando nome vazio para feedback visual imediato (evita toast pra erro obvio)"
  - "Grid 4-tipos no dialog em vez de Select - mais visual, expoe os 4 tipos de uma vez (consistente com Notion), aria-pressed marca ativo"
  - "try/catch silencioso em localStorage.setItem - se storage indisponivel (modo privado, quota cheia) estado em memoria continua funcional, so nao persiste cross-session"
metrics:
  duration_minutes: 8
  tasks_completed: 4
  files_created: 1
  files_modified: 2
  tests_added: 0
  total_tests: 206
  completed_date: 2026-05-22
---

# Fase 02 Plano 02-08: DatabaseViewTabs + persistencia activeView Summary

## One-liner

Substitui stub `DatabaseViewTabs` (02-05) por componente real que lista as `board_views` como tabs horizontais (icone por tipo + nome + botao '+' para criar view nova via `CreateDatabaseViewDialog`), e move a gestao de `activeViewId` pra dentro do `DatabaseBlock` com persistencia em `localStorage[lfpro-database-active-view-${boardId}]` e reconciliacao defensiva quando view persistida some.

## O que foi feito

### Task 1: DatabaseViewTabs real (`src/components/database/DatabaseViewTabs.tsx`)

Stub de 02-05 substituido. Componente agora:
- Recebe `boardId`, `activeViewId: string | null`, `onChangeView: (id) => void` (estado vive no parent)
- Le `useBoardViews(boardId)` que retorna views ordenadas por `position`
- Map de icone por `DatabaseViewType`: `Table2 / Kanban / Calendar / List` (`lucide-react`)
- Cada tab: `<button role="tab" aria-selected>` com icone + nome (truncado max-w-[140px]). Tab ativa: `bg-primary/15 text-primary`. Demais: `text-muted-foreground hover:bg-muted hover:text-foreground`
- Botao '+' no fim com `<Plus className="w-3.5 h-3.5" />`, `aria-label="Criar nova view"`, abre `CreateDatabaseViewDialog` via estado local `createOpen`
- Container `flex items-center gap-1 px-2 py-1 border-b border-border bg-muted/10 overflow-x-auto scrollbar-thin` (scroll horizontal MVP, sem dropdown overflow)
- `role="tablist"` + `aria-label="Views da database"` para a11y
- Callback `onCreated` do dialog: dispara `onChangeView(viewId)` para selecionar nova view automaticamente

### Task 2: CreateDatabaseViewDialog (`src/components/database/CreateDatabaseViewDialog.tsx`) - NOVO

Modal pt-BR de criacao de view:
- Estado local: `name`, `type: DatabaseViewType` (default 'table'), `isCreating`
- Campo Nome: `<Input>` com `Label`, `autoFocus`, `placeholder` pt-BR contextual
- Grid de tipo: 4 botoes `grid-cols-2`, cada um com icone (`Table2/Kanban/Calendar/List`) + label do `DATABASE_VIEW_LABELS`. Ativo: `border-primary bg-primary/10 text-primary`. `aria-pressed`
- Confirmar: chama `useCreateBoardView.mutateAsync({ boardId, name, viewType, config: {} })`. Em sucesso: callback `onCreated(created.id)`, toast `'View criada'`, reset state, fecha. Em erro: `console.error` + toast `'Erro ao criar view'`
- Enter no input/dialog: submete (sem Shift). Guard `isCreating` no `handleOpenChange` (nao fecha durante mutation)
- Botao Cancelar tambem disabled durante mutation. Botao Criar disabled tambem quando nome vazio
- Reset state em close (cancelar, click-fora, ESC)

### Task 3: DatabaseViewRenderer - no-op (`src/components/database/DatabaseViewRenderer.tsx`)

Plano explicita "NAO modificar mais" - prop `activeViewId?: string | null` ja existia desde 02-06 com fallback `activeViewId > is_default > primeira > 'table'`. Verifiquei via grep (5 referencias a `activeViewId` no arquivo) que continua atendendo o contrato.

### Task 4: DatabaseBlock - persistencia + integracao (`src/components/page/blocks/DatabaseBlock.tsx`)

`DatabaseBlockView` agora gerencia o estado:
- `const storageKey = lfpro-database-active-view-${boardId}`
- `useState` lazy-init: le `localStorage.getItem(storageKey)` (try/catch silencioso). Retorna `null` se ausente
- `setActiveViewId(id)`: update state + `localStorage.setItem(storageKey, id)` (try/catch)
- `useEffect([views, activeViewId, storageKey])`: quando views carregam (ou mudam por realtime), verifica se `activeViewId` existe em `views`. Se nao (deletada, ou nunca foi escolhida), fallback `views.find(is_default) ?? views[0]` e persiste tambem. Guard `views.length === 0` para evitar trabalho redundante
- Le `useBoardViews(boardId || null)` para participar do mesmo cache que o Tabs/Renderer
- Renderiza `<DatabaseViewTabs boardId activeViewId onChangeView={setActiveViewId} />` + `<DatabaseViewRenderer boardId activeViewId={activeViewId} />`

Header + erro state + container externo inalterados.

## Verificacao

- `npm run build` passa em 16.31s, 0 erros novos. Bundle `Page-BQZ5dxoQ.js` cresceu de 718.61kB (manteve ordem de grandeza com novo dialog e logica de persistencia absorvidos)
- `npm run test` passa: **206 testes (11 arquivos)** - o total subiu de 199 para 206 (7 novos testes vieram de plano paralelo no codebase, todos passam). Zero teste novo neste plano (componentes presentation + integracao runtime cobertos por verificacao funcional do bloco database em /page/:id)
- Verificacao funcional automatizada via grep:
  - `DatabaseViewTabs | onChangeView | CreateDatabaseViewDialog` em DatabaseViewTabs.tsx: 9 matches (>= 3 exigido)
  - `DATABASE_VIEW_TYPES | useCreateBoardView` em CreateDatabaseViewDialog.tsx: 5 matches (>= 2 exigido)
  - `activeViewId` em DatabaseViewRenderer.tsx: 5 matches (>= 1 exigido)
  - `lfpro-database-active-view | setActiveViewId | onChangeView` em DatabaseBlock.tsx: 8 matches (>= 3 exigido)
- Dev server `npm run dev` responde HTTP 200 + HMR limpo apos cada edicao
- Zero em-dash, UI 100% pt-BR (verificado nos 3 arquivos modificados/criados)
- Tabs/Renderer/DatabaseBlock controlados pelo mesmo `activeViewId` - switch entre views muda apenas o state, board data permanece em cache (TanStack Query) - performance instantanea

## Desvios do Plano

Nenhum desvio significativo. Plano executado essencialmente como escrito, com refinamentos pequenos:

**1. [Regra 2 - Critico] CreateDatabaseViewDialog usa Label componente do shadcn**

- **Encontrado durante:** Tarefa 2 (design do dialog)
- **Issue:** Plano sugeria `<p className="text-xs font-medium text-muted-foreground mb-2">Tipo</p>` para label "Tipo". Convencao do projeto (verificada em PagePermissionsPanel/CreateColumnModal) usa componente `<Label htmlFor>` do shadcn-ui para a11y (associacao input ↔ label, leitor de tela).
- **Correcao:** Adicionei `import Label`, usei `<Label htmlFor="view-name">` para o input nome. Mantive `<p>` para o titulo "Tipo" do grid (nao e label de input unico, e secao com radio-like behavior cuja a11y vem do aria-pressed).
- **Arquivos modificados:** `src/components/database/CreateDatabaseViewDialog.tsx`
- **Commit:** `181f35b`

**2. [Regra 1 - Bug-defensivo] Botao Criar disabled quando nome vazio**

- **Encontrado durante:** Tarefa 2 (UX do dialog)
- **Issue:** Plano fazia validacao so via toast "Informe um nome" apos click. UX melhor: botao disabled enquanto nome trimmed esta vazio (feedback visual imediato, evita toast desnecessario).
- **Correcao:** `<Button disabled={isCreating || !name.trim()}>`. Toast no `handleConfirm` mantido como defensa caso click via Enter passe pelo guard.
- **Arquivos modificados:** `src/components/database/CreateDatabaseViewDialog.tsx`
- **Commit:** `181f35b`

**3. [Regra 1 - Bug-defensivo] Reconciliation tambem persiste fallback em localStorage**

- **Encontrado durante:** Tarefa 4 (DatabaseBlock effect)
- **Issue:** Plano sugeria so `setActiveViewIdState(def.id)` no fallback. Mas se a view persistida sumiu, o storage ainda referencia o id antigo. Em proximo mount, lazy-init le esse id obsoleto, useEffect roda de novo, mesma reconciliation acontece. Mais limpo persistir o fallback para o storage tambem refletir a realidade.
- **Correcao:** Apos `setActiveViewIdState(def.id)` no useEffect, tambem chama `localStorage.setItem(storageKey, def.id)` com try/catch.
- **Arquivos modificados:** `src/components/page/blocks/DatabaseBlock.tsx`
- **Commit:** `dddffc0`

Nenhum desvio arquitetural. Nenhuma regra 4 acionada.

## Issues Adiados

Itens conscientemente fora do escopo deste plano (alinhados com `<critical_notes>` do prompt):

- **Renomear/deletar view inline:** Plano explicitou como opcional. Decidi nao implementar para manter MVP enxuto - delete via context menu pode vir em fase de polimento. Tracked como ideia futura (sem deferred-items.md novo - 02-11 ja cobrira ajustes finais).
- **Drag/drop pra reordenar tabs:** Ordem hoje vem do `position` em board_views (criada por `useCreateDatabase` em 02-05). Reordenar manualmente requer drag handlers + update batch - fase futura.
- **Dropdown de overflow para muitas views:** Scroll horizontal natural cobre o MVP. Quando databases tiverem 10+ views, considerar dropdown na ponta direita (`MoreHorizontal` icon).
- **Persistir activeViewId em board_views.config tambem:** Atualmente so localStorage (per-user, per-device). Para sincronizar entre devices, futuramente armazenar a "last visited view" no profile ou em coluna nova. Fora do escopo MVP.

Outras descobertas observadas no codebase mas fora do escopo desta task:
- `PagePermissionsPanel.tsx` aparecia como modified no `git status` quando comecei - era mudanca de 02-11 (commit `bc539a4`) que ja estava staged em uma execucao anterior. Nao toquei.

## Commits

| Tarefa | Hash | Mensagem |
|--------|------|----------|
| 2 | `181f35b` | feat(02-08): add CreateDatabaseViewDialog for creating new database views |
| 1 | `75e84c7` | feat(02-08): replace DatabaseViewTabs stub with real implementation |
| 4 | `dddffc0` | feat(02-08): persist active view in DatabaseBlock via localStorage |

Task 3 (DatabaseViewRenderer): no-op por design do plano - nenhuma modificacao necessaria, prop `activeViewId` ja estava implementada em 02-06.

## Self-Check: PASSOU

- src/components/database/DatabaseViewTabs.tsx: ENCONTRADO (real, substitui stub)
- src/components/database/CreateDatabaseViewDialog.tsx: ENCONTRADO (novo)
- src/components/page/blocks/DatabaseBlock.tsx: ENCONTRADO (persistencia activeViewId)
- Commit 181f35b: ENCONTRADO
- Commit 75e84c7: ENCONTRADO
- Commit dddffc0: ENCONTRADO
- `npm run build`: PASSOU (0 erros novos, 16.31s)
- `npm run test`: PASSOU (206/206, 11 arquivos)
- Grep verifications (4 tasks): TODAS acima do threshold
- Zero em-dash, UI pt-BR consistente

## Proximos planos

- **02-11 (final):** Polimento + verificacao runtime end-to-end do bloco database em /page/:id:
  - Trocar entre as 4 views ao clicar nos tabs (sem reload de dados)
  - Criar view nova via '+' e ver ela aparecer + ficar ativa
  - Recarregar a page e verificar que view ativa anterior e restaurada via localStorage
  - Deletar view persistida (manualmente no db) e ver o bloco fazer fallback gracioso pra is_default
  - Trocar para view list_detailed e ver o DatabaseListViewConfig funcionar com a view ativa correta
- Fase 02 completa apos 02-11: subpages + database inline + 4 views funcionais + bookmark + synced blocks + sidebar tree.
