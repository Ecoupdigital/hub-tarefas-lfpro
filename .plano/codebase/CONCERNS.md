# Preocupacoes do Codebase

**Data da Analise:** 2026-05-22

## Divida Tecnica

### Acoplamento alto e direto com Supabase em todo o codebase
- Problema: Cliente Supabase importado e usado diretamente em hooks, componentes e Edge Functions sem camada de abstracao. Trocar de provider ou mockar para testes exige tocar dezenas de arquivos.
- Arquivos: `src/integrations/supabase/client.ts`, `src/hooks/useSupabaseData.ts`, `src/hooks/useCrudMutations.ts`, `src/hooks/useNotifications.ts`, `src/hooks/useActivityLog.ts`, `src/hooks/useMyWorkItems.ts`, e mais ~30 componentes que chamam `supabase.from(...)` diretamente.
- Impacto: Testes unitarios praticamente impossiveis sem rodar Supabase real. Logica de acesso a dados misturada com UI.
- Abordagem de correcao: Extrair gradualmente repositorios por entidade (ex: `src/repositories/items.ts`, `src/repositories/columns.ts`) e fazer hooks consumirem repos. Permite mock em testes e troca futura de backend.

### Tipos gerados do Supabase obrigam `as any` em muitos lugares
- Problema: 89 ocorrencias de `as any` / `@ts-ignore` / `@ts-expect-error` / `eslint-disable` no codigo. Causa principal: `column_values.value` e `workspace.settings`/`column.settings` sao `Json` no schema, sem tipo estreito.
- Arquivos: `src/integrations/supabase/types.ts` (1742 linhas gerado), `src/pages/Index.tsx:57`, `src/pages/MyWork.tsx:735`, `src/pages/SharedBoard.tsx:129,205`, `src/components/settings/BrandingSettings.tsx:44,125,128`, `src/components/settings/AdminSettings.tsx:76,101`.
- Impacto: Erros de tipo em runtime que TypeScript nao pega. Refactor de schema vira correria de runtime errors.
- Abordagem de correcao: Criar schemas Zod por tipo de coluna em `src/types/columnValues.ts` e validar `column_values.value` na entrada/saida.

### Zod instalado mas nao usado para validacao de input
- Problema: `zod ^3.25.76` esta em `package.json:81` mas `grep z\.object` retorna zero hits em `src/`. Toda validacao de input (forms, payloads, column_values) e manual ou inexistente.
- Arquivos: `package.json:81` (dependencia), uso esperado em `src/components/forms/FormBuilder.tsx`, `src/components/modals/*.tsx`, `supabase/functions/submit-form/index.ts`.
- Impacto: Input invalido pode chegar ao DB; tipos em `column_values.value` divergem do esperado pelos componentes Cell.
- Abordagem de correcao: Definir `ColumnValueSchema` discriminado por `column.type`, validar em `useCrudMutations.ts` antes de upsert e em `submit-form/index.ts`.

### Arquivos muito grandes (god components)
- Problema: Componentes/hooks excedendo 700 linhas, mistura de responsabilidades.
- Arquivos:
  - `src/components/board/ItemDetailPanel.tsx` (1211 linhas)
  - `src/components/workspace/WorkspaceFolders.tsx` (908 linhas)
  - `src/hooks/useCrudMutations.ts` (889 linhas, 23 ocorrencias de `any`)
  - `src/components/board/BoardHeader.tsx` (819 linhas)
  - `src/pages/MyWork.tsx` (782 linhas)
  - `src/pages/TeamWork.tsx` (760 linhas)
  - `src/hooks/useSupabaseData.ts` (748 linhas)
  - `src/components/settings/AdminSettings.tsx` (735 linhas)
  - `src/components/AppSidebar.tsx` (696 linhas)
- Impacto: Difícil de testar, escanear, dar manutencao. Re-render largo ao tocar qualquer parte.
- Abordagem de correcao: Quebrar `useCrudMutations.ts` por entidade (`useItemMutations`, `useColumnMutations`, etc.); `ItemDetailPanel` em subcomponentes (UpdatesPanel, ActivityPanel, AttachmentsPanel).

### Estado de UI persistido em localStorage + JSON.parse sem validacao
- Problema: Configs lidas com `JSON.parse(localStorage.getItem(...))` sem schema/try-catch consistente.
- Arquivos: `src/components/board/BoardCalendar.tsx:90,122,209`, `src/components/board/DateCell.tsx:23`, `src/components/board/ConditionalColorRules.tsx:46`.
- Impacto: localStorage corrompido (entre versoes do app) quebra a pagina silenciosamente ou lanca erro nao tratado.
- Abordagem de correcao: Helper `safeJsonParse<T>(raw, schema)` central. Migracao versionada por chave `lfpro-`.

## Bugs Conhecidos (padroes recentes no git log)

### Padrao recorrente: dropdowns e popovers com clipping em contextos com overflow
- Sintomas: Dropdowns/popovers cortados dentro de `MyWork`, status cells e celulas em geral.
- Commits relacionados (ultimos 30):
  - `a00352c fix: coluna oculta ficava inalcancavel no popover Ocultar/mostrar`
  - `0230f08 fix: dropdown clipping in all cell types — use position fixed`
  - `7a9a8a9 fix: status dropdown clipping — use position fixed with getBoundingClientRect`
  - `5a18f42 fix: dropdown/popover clipping in MyWork table (overflow)`
- Arquivos: `src/components/board/StatusCell.tsx`, `src/components/board/StatusPicker.tsx`, todas as `*Cell.tsx`, `src/components/ui/popover.tsx`.
- Gatilho: Container ancestral com `overflow: hidden`/`overflow: auto` + popover ancorado a celula.
- Causa subjacente: Cada Cell reimplementa posicionamento; nao usa um wrapper Portal unico.
- Abordagem de correcao: Padronizar todos os dropdowns em Radix Popover com `Portal` + `position: fixed`. Lint rule para proibir popover inline em Cell.

### Padrao recorrente: RLS policies / RPC filtros incorretos descobertos em producao
- Sintomas: Acoes sendo bloqueadas para usuarios legitimos, ou usuarios vendo coisas que nao deveriam.
- Commits relacionados:
  - `75e1666 fix: board_permissions INSERT blocked for admins — expand is_board_admin to include workspace admins and global admins`
  - `13cff9d fix: workspace_members INSERT policy allowing creator to add first member`
  - `08e7a2a fix: workspace SELECT policy allowing creator to see newly created workspace`
  - `4e9a947 fix: Edge Function invite-user usar anon key para validar JWT do caller`
  - `481b18a fix: restore subitems in MyWork — RPC was filtering parent_item_id IS NULL`
  - `fa4e447 fix: extra columns RPC excluding all status/date/people types — now only excludes the specific fixed columns`
- Arquivos: `supabase/migrations/20260219080000_fix_security_rls_policies.sql`, `supabase/migrations/20260408200000_fix_workspace_select_policy.sql`, `supabase/migrations/20260409100000_fix_board_permissions_insert_policy.sql`, `supabase/migrations/20260224000001_my_work_rpc.sql`.
- Causa subjacente: 3 niveis de permissao (global admin, workspace admin/member, board admin/member/viewer) com RPCs e RLS coordenando. Nenhuma suite de testes valida cenarios cruzados.
- Abordagem de correcao: Criar `supabase/tests/` com pgTAP ou seeds + Playwright cobrindo matriz papel x acao. Cada nova policy exige um teste antes do merge.

### Padrao recorrente: MyWork cross-board com edge cases
- Sintomas: PeopleCell vazia, datas nao renderizando, inline edits nao refletindo, subitems sumindo, double-click conflitando com single-click.
- Commits relacionados:
  - `5fe03a7 fix: PeopleCell empty in MyWork — fallback to profiles when no active board (cross-board context)`
  - `5ae35cb fix: date column not rendering in MyWork — was passing object instead of string to DateCell`
  - `ea0f18f fix: MyWork inline edits not reflecting — invalidate my-work-items cache on column value change`
  - `f940cb6 feat: inline editing in MyWork (item name + column values)`
  - `73b3935 fix: restore row click to open item in MyWork`
  - `4c8a4e9 fix: double-click to rename item conflicting with single-click to open`
- Arquivos: `src/pages/MyWork.tsx`, `src/hooks/useMyWorkItems.ts`, `src/components/work/*`, `supabase/migrations/20260224000001_my_work_rpc.sql`, `supabase/migrations/20260329100000_mywork_subitems.sql`.
- Causa subjacente: MyWork agrega items cross-board e reusa Cells que esperam contexto de board (active board, colunas, columnValues). Cells nao tem assinatura abstraindo isso.
- Abordagem de correcao: Definir contrato explicito de Cell (`CellContext` com `boardId?`, `columns?`, `profiles?`). Documentar quais Cells funcionam cross-board. Adicionar suite de teste cobrindo MyWork.

### Batch update e cache invalidation em subitems
- Sintomas: Updates em lote nao refletindo, batch action bar com z-index errado.
- Commits relacionados:
  - `eb7d8f0 fix: batch update for subitems — add missing column_values to optimistic cache + detect silent upsert errors`
  - `88244b9 fix: batch actions bar z-index for subitems + stopPropagation on subitem checkbox`
- Arquivos: `src/hooks/useCrudMutations.ts`, `src/components/board/BatchActionsBar.tsx`.
- Causa subjacente: Cache otimista em React Query escrito a mao em multiplas mutations; cada nova feature precisa redescobrir as queryKeys afetadas.
- Abordagem de correcao: Centralizar invalidacoes em `src/lib/queryKeys.ts` + helper `invalidateItemRelated(itemId)` que atualiza todas as caches relacionadas.

## Consideracoes de Seguranca

### Edge Function `submit-form` aceita `values: Record<string, unknown>` sem schema
- Risco: Forms publicos aceitam qualquer payload com ate 50 chaves e `itemName` de ate 500 chars, mas o conteudo de `values` nao e validado contra os tipos de coluna esperados pelo board.
- Arquivos: `supabase/functions/submit-form/index.ts:55-75`.
- Mitigacao atual: Rate limiting in-memory (10 req/min/IP), trim de `itemName`, limite de 50 campos.
- Gap: Atacante pode injetar JSON arbitrario em `column_values.value`. Tipos de coluna nao sao consultados antes do upsert.
- Abordagem: Carregar `columns` do board pelo slug, validar cada chave de `values` contra `column.type` (zod por tipo de coluna).

### Rate limiting in-memory por instancia da Edge Function
- Risco: `submit-form/index.ts:11-37` mantem `ipSubmissions: Map` em memoria. Supabase Edge escala em multiplas instancias; cada uma tem seu proprio Map, multiplicando o limite efetivo.
- Arquivos: `supabase/functions/submit-form/index.ts:11-37`.
- Mitigacao atual: Limite de 10/min por instancia.
- Abordagem: Usar tabela Postgres com TTL (uma row por IP, cleanup via cron) ou Redis externo se houver.

### `column_values.value` JSON sem CHECK constraint
- Risco: Coluna `value` em `column_values` aceita qualquer JSON. RLS controla acesso mas nao formato.
- Arquivos: `supabase/migrations/20260216230617_*.sql:176-179`, schema de `column_values`.
- Mitigacao atual: Validacao no app (parcial, espalhada por Cells).
- Abordagem: Funcao `validate_column_value(column_id, value)` chamada em trigger BEFORE INSERT/UPDATE.

### CORS permissivo (`Access-Control-Allow-Origin: *`) em todas Edge Functions
- Risco: `Access-Control-Allow-Origin: '*'` em `invite-user`, `check-user-active`, `list-sessions`, `send-slack-notification`, `submit-form`. Forms publicos justificam `*` em `submit-form`; outras funcoes nao.
- Arquivos: `supabase/functions/invite-user/index.ts:5`, `supabase/functions/check-user-active/index.ts`, `supabase/functions/list-sessions/index.ts`, `supabase/functions/send-slack-notification/index.ts`.
- Mitigacao atual: Funcoes validam JWT (`invite-user` checa caller admin via `user_roles`).
- Abordagem: Restringir CORS aos dominios LFPro (`gestor.lfpro.com.br` e dominio do hub) em funcoes autenticadas. Manter `*` apenas em `submit-form`.

### `supabase/.temp/linked-project.json` versionado parcialmente
- Risco: Arquivo contem `ref` e `organization_id` do projeto Supabase. Nao e segredo (anon key e publico), mas vaza estrutura organizacional.
- Arquivos: `supabase/.temp/linked-project.json`, `.gitignore` (nao tem `supabase/.temp/`).
- Mitigacao atual: Nenhuma; status atual mostra `.temp/storage-migration`, `.temp/storage-version` modificados e `.temp/linked-project.json` untracked.
- Abordagem: Adicionar `supabase/.temp/` em `.gitignore` e remover do indice (`git rm --cached supabase/.temp/*`).

### `.env` e segredos no `.gitignore` mas duplicacao confusa
- Risco: `.gitignore` tem dois blocos AIOS sobrepostos, com `.env` repetido. Manutencao confusa pode levar a remocao acidental de regras.
- Arquivos: `.gitignore` (linhas com "AIOS" repetidas).
- Mitigacao atual: Regras cobrem `.env`, `.env.local`, `.env.*.local`, `*.key`, `*.pem`.
- Abordagem: Consolidar `.gitignore`, remover duplicacao, adicionar `supabase/.temp/` e `.claude/`.

## Gargalos de Performance

### Realtime invalidando caches a nivel workspace, nao board
- Problema: `useRealtimeSync.ts:13-58` escuta `items`, `groups`, `columns`, `column_values`, `boards` para o workspace inteiro. Mesmo com debounce de 2s em `column_values`, equipes grandes geram refetch contínuo.
- Arquivos: `src/hooks/useRealtimeSync.ts:13-58`, `src/context/BoardContext.tsx:71`.
- Causa: Subscricao unica sem filtro por `board_id` para suportar boards inativos terem cache fresca ao trocar.
- Impacto: Em workspace com muitos boards/items, custos de banda e CPU do cliente sobem; risco de invalidate storms quando muitos usuarios editam ao mesmo tempo.
- Abordagem de correcao: Subscricoes por board ativo + invalidate seletivo do board ativo. Boards inativos refetcham lazy ao serem abertos.

### N+1 implicito em `useColumnValues` mitigado com chunks mas ainda pesado
- Problema: `src/hooks/useSupabaseData.ts:244-273` faz `Promise.all` em chunks de `column_values.in('item_id', chunk)`. Funciona, mas com boards de 1000+ items + 20 colunas, payload total e grande.
- Arquivos: `src/hooks/useSupabaseData.ts:244-273`.
- Causa: Schema fragmentado (item -> column_values N:M).
- Abordagem de correcao: RPC server-side que retorna items + values agregados em um payload (similar ao que `my_work_rpc` faz).

### Virtualizacao instalada mas presenca incerta
- Problema: `@tanstack/react-virtual ^3.13.18` no `package.json:52`. `grep` por `useVirtualizer`/`useVirtual`/`Virtualizer` em `src/` nao retornou matches em buscas iniciais. Verificar se a dependencia esta de fato em uso.
- Arquivos: candidatos para virtualizacao -- `src/components/board/BoardTable.tsx`, `src/pages/MyWork.tsx` (782 linhas), `src/pages/TeamWork.tsx` (760 linhas).
- Impacto: Boards com muitos items renderizam todas as rows; scroll trava.
- Abordagem de correcao: Confirmar e, se nao usada, aplicar `useVirtualizer` em `BoardTable`, `MyWork.tsx`, `TeamWork.tsx`, `BoardKanban` (colunas com muitos cards).

### Componentes muito grandes re-renderizam por inteiro
- Problema: `ItemDetailPanel.tsx` (1211 linhas) e `BoardHeader.tsx` (819 linhas) reagem a qualquer mudanca de estado. Memoizacao pontual nao ajuda quando componente todo le contexto.
- Arquivos: `src/components/board/ItemDetailPanel.tsx`, `src/components/board/BoardHeader.tsx`.
- Causa: God components consumindo `AppContext` direto.
- Abordagem de correcao: Quebrar consumo de contexto via seletores; subcomponentes com props estaveis.

## Areas Frageis

### Permissoes em 3 niveis (global / workspace / board) com RLS + RPC + checks no app
- Arquivos: `supabase/migrations/20260219080000_fix_security_rls_policies.sql`, `supabase/migrations/20260217150000_fix_rls_policies.sql`, `supabase/migrations/20260217160000_granular_rls_policies.sql`, `supabase/migrations/20260408200000_fix_workspace_select_policy.sql`, `supabase/migrations/20260408201000_fix_workspace_members_insert_policy.sql`, `supabase/migrations/20260409100000_fix_board_permissions_insert_policy.sql`, `src/hooks/usePermissions.ts`.
- Por que fragil: 6 dos 28 commits recentes (>20%) sao fixes de policies. Helpers (`is_board_admin`, `is_workspace_member`, `can_access_board`, `can_access_item`, `has_role`) precisam casar com checks no app.
- Cobertura de testes: Zero. Nenhum teste pgTAP ou E2E cobrindo matriz papel x acao.

### Subitems compartilham tabela `items` com `parent_item_id`
- Arquivos: `src/hooks/useSupabaseData.ts:117,183`, `src/pages/MyWork.tsx`, `supabase/migrations/20260329100000_mywork_subitems.sql`.
- Por que fragil: Queries de items precisam filtrar `parent_item_id IS NULL` para items raiz e `NOT NULL` para subitems. Esquecer um filtro = bug.
- Bug recente: `481b18a fix: restore subitems in MyWork — RPC was filtering parent_item_id IS NULL`.
- Cobertura de testes: Nenhuma cobrindo subitems.

### MyWork cross-board (Cells fora de contexto de board)
- Arquivos: `src/pages/MyWork.tsx`, `src/components/work/*`, todas as `*Cell.tsx` em `src/components/board/`.
- Por que fragil: 6 fixes recentes envolvendo MyWork (`5fe03a7`, `5ae35cb`, `ea0f18f`, `f940cb6`, `73b3935`, `4c8a4e9`). Cells assumem contexto que nao existe.

### Tipos de coluna acoplados a logica espalhada
- Arquivos: ~20 `*Cell.tsx` em `src/components/board/`, `src/types/board.ts`, `src/components/board/FilterBuilder.tsx` (575 linhas).
- Por que fragil: Adicionar novo tipo exige tocar Cell, Filter, Sort, Export CSV, Kanban, Calendar, Timeline, Dashboard widgets, FormBuilder. Sem registry central de tipo de coluna.
- Abordagem: Criar `src/columnTypes/registry.ts` mapeando `type -> { Cell, FilterUI, sortFn, csvSerializer, formInput, default }`.

### Cache otimista escrito a mao em cada mutation
- Arquivos: `src/hooks/useCrudMutations.ts` (889 linhas, 23 `any`).
- Por que fragil: Cada mutation atualiza varias queryKeys manualmente. Erro silencioso quando esquece de invalidar uma chave.
- Bug recente: `ea0f18f fix: MyWork inline edits not reflecting — invalidate my-work-items cache on column value change`.

### `column_values.value` JSON sem schema
- Arquivos: schema `column_values`, ~20 `*Cell.tsx`.
- Por que fragil: Formato esperado vive na cabeca do dev. Mudanca em uma Cell pode quebrar dados antigos sem aviso.
- Bug recente: `5ae35cb fix: date column not rendering in MyWork — was passing object instead of string to DateCell`.

## Lacunas de Cobertura de Teste

### Playwright instalado, configurado, mas sem testes E2E
- O que nao e testado: Nenhum cenario E2E. `playwright.config.ts:4` aponta para `./tests` mas o diretorio nao existe (`ls tests/` retorna nada).
- Arquivos: `playwright.config.ts`, ausencia de `tests/`.
- Risco: Bugs de UI/permissoes/realtime so sao pegos em producao. Confirmado pelo padrao "fix em producao" no git log.
- Prioridade: Alta.

### Testes unitarios minimos
- O que e testado: Apenas 6 arquivos em `src/test/`: `dateTimeSupport.test.ts`, `work-components.test.ts`, `tab-context.test.ts`, `filter.test.ts`, `utils.test.ts`, `example.test.ts` (este ultimo so faz `expect(true).toBe(true)`).
- O que nao e testado: 35 hooks customizados, todas as mutations (`useCrudMutations.ts` 889 linhas), permissoes (`usePermissions.ts`), Cells (~20 componentes), automation engine (`useAutomationEngine.ts`), realtime sync, formula parser (`src/utils/formulaParser.ts:408`).
- Risco: Refactor de qualquer hook quebra silenciosamente.
- Prioridade: Alta para `useCrudMutations`, `usePermissions`, `useAutomationEngine`, `formulaParser`.

### Sem testes de RLS / RPC
- O que nao e testado: 31 migrations em `supabase/migrations/`, 5 RPCs (`can_access_board`, `can_access_item`, `has_role`, `is_workspace_member`, `duplicate_board_with_options`, e os helpers `is_board_admin`, `is_workspace_admin`).
- Risco: Cada fix de policy poderia ter sido pego em CI. 6 fixes de policy nos ultimos 30 commits.
- Prioridade: Alta. Adicionar pgTAP ou seeds + Playwright.

### Sem testes de Edge Functions
- O que nao e testado: 5 Edge Functions em `supabase/functions/`. `submit-form` aceita input publico sem teste.
- Arquivos: `supabase/functions/submit-form/index.ts`, `supabase/functions/invite-user/index.ts`.
- Risco: Mudanca em rate limit / validacao quebra forms publicos.
- Prioridade: Alta para `submit-form` e `invite-user`.

## Outros Riscos

### AGENTS.md de outra ferramenta ainda presente
- Problema: `AGENTS.md` (65 linhas) e do "Codex CLI / Synkra AIOS", referenciando `.aios-core/`, `bin/`, `packages/`, `tests/`, `docs/stories/` que nao existem ou nao se aplicam.
- Arquivos: `AGENTS.md` raiz.
- Impacto: Agentes (Claude, Codex) leem instrucoes conflitantes com `CLAUDE.md`. Confunde IA e dev novo.
- Abordagem: Remover `AGENTS.md` ou substituir conteudo por redirect para `CLAUDE.md`.

### `docs/prd.md` e `docs/architecture/` de processo AIOS antigo
- Problema: `docs/prd.md` linha 4 cita "Morgan (PM Agent) via AIOS *create-brownfield-prd". `docs/architecture/technical-debt-assessment.md` e outros sao artefatos do mesmo processo.
- Arquivos: `docs/prd.md`, `docs/architecture/*`.
- Impacto: Documentacao desatualizada compete com `.plano/` (UP) e `CLAUDE.md`. Risco de IA seguir requisitos obsoletos.
- Abordagem: Decidir se mantem (atualizar versao) ou arquiva em `docs/legacy/`.

### `supabase/.temp/` parcialmente versionado
- Problema: Estado atual mostra `M supabase/.temp/storage-migration`, `M supabase/.temp/storage-version`, `?? supabase/.temp/linked-project.json`. Esses arquivos sao gerados pelo CLI do Supabase.
- Arquivos: `supabase/.temp/*`, `.gitignore` sem entrada.
- Impacto: Diff barulhento em todo `git status`. Conflitos de merge em arquivos gerados.
- Abordagem: Adicionar `supabase/.temp/` em `.gitignore` e remover do indice.

### 41 `console.log/warn/error` no codigo de producao
- Problema: Logs espalhados sem nivel/configuracao. Vazam para devtools em producao.
- Arquivos: `src/hooks/useAutomationEngine.ts:50,82,98,313`, `src/hooks/useUndoRedo.ts:85`, `src/hooks/useIntegrations.ts:274`, `src/hooks/useAuditLog.ts:123`, `src/hooks/useCrudMutations.ts:203,222,260`, e outros.
- Impacto: UX poluida; logs sensiveis podem vazar; sem rastreabilidade em servico externo.
- Abordagem: Wrapper `src/lib/logger.ts` com nivel por ambiente. Encaminhar erros para Sentry/PostHog.

### Sem documentacao interna para 35 hooks customizados
- Problema: `src/hooks/` tem 35 hooks. Apenas `useRealtimeSync.ts` tem JSDoc no topo. Maioria sem doc explicando entrada/saida/invariantes.
- Arquivos: `src/hooks/*.ts`.
- Impacto: Dev novo (ou IA agindo no codebase) tem que ler 800 linhas para entender se pode usar `useCrudMutations`.
- Abordagem: JSDoc curto em cada hook exportado (proposito, entrada, queryKeys afetadas).

### Sem `npm run typecheck` no `package.json`
- Problema: Quality gate citado no `AGENTS.md` antigo (`npm run typecheck`) nao existe em `package.json`. `npm run lint` existe mas nao roda `tsc --noEmit`.
- Arquivos: `package.json`.
- Impacto: Erros de tipo so aparecem no `npm run build`.
- Abordagem: Adicionar `"typecheck": "tsc --noEmit"` e rodar em pre-commit / CI.
