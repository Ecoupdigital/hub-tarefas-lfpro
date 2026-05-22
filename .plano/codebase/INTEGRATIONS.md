# Integracoes Externas

**Data da Analise:** 2026-05-22

## APIs e Servicos Externos

**Backend-as-a-Service (BaaS):**
- **Supabase** - Backend completo (Postgres + Auth + Realtime + Storage + Edge Functions)
  - SDK: `@supabase/supabase-js` 2.95.3
  - Cliente: `src/integrations/supabase/client.ts`
  - Tipos gerados (1742 linhas): `src/integrations/supabase/types.ts`
  - Project ID: `legvzsdbgyggubdomwxp` (config em `supabase/config.toml`)
  - URL: `https://legvzsdbgyggubdomwxp.supabase.co`
  - Auth do client: `localStorage`, `persistSession: true`, `autoRefreshToken: true`

**Mensageria/Notificacao:**
- **Slack** - Notificacoes de mudanca de status via webhook
  - Configurado por workspace na tabela `integrations` (type = `slack`, campo `config.webhook_url`)
  - Webhook URL **nunca exposta ao cliente** - Edge Function lida server-side
  - Edge Function: `supabase/functions/send-slack-notification/index.ts`

## Armazenamento de Dados

**Banco de Dados:**
- PostgreSQL via Supabase
  - Cliente: `@supabase/supabase-js`
  - Schema: `public` (tabela principal) + `storage` (buckets)
  - 31 migrations versionadas em `supabase/migrations/`
  - PostgrestVersion: 14.4

**Tabelas principais (extraidas de `types.ts` e migrations):**
- `workspaces`, `workspace_members`, `workspace_settings`, `workspace_folders`
- `boards`, `board_permissions`, `board_forms`, `board_templates`
- `groups`, `columns`, `items`, `column_values`, `subitems`
- `profiles`, `user_roles`, `custom_roles`, `teams`, `team_members`
- `updates`, `update_reactions`, `activity_log`, `audit_log`, `notifications`
- `favorites`, `recent_boards`, `user_preferences`
- `automations`, `automation_logs`
- `dependencies`, `connections`
- `integrations`, `integration_logs`
- `item_files` (referencias para arquivos no Storage)

**Realtime:**
- Channel global `workspace-sync` (`src/hooks/useRealtimeSync.ts:17`)
  - Subscreve mudancas em `items`, `groups`, `columns`, `column_values`, `boards`
  - Invalida cache do React Query por board_id
  - `column_values` tem debounce de 2s para evitar storm
- Channel `favorites-global` (`useRealtimeSync.ts:70`)
- Channel `activity-item-${itemId}` (`src/hooks/useActivityLog.ts:100`)
- Channel `my-work-realtime-${userId}` (`src/hooks/useMyWorkItems.ts:67`)
- Channel `sidebar-presence` (`src/hooks/usePresence.ts:11`) - Presenca de usuarios online

**Armazenamento de Arquivos (Supabase Storage):**

| Bucket | Publico | Limite | Uso |
|--------|---------|--------|-----|
| `attachments` | Sim | 50 MB | Anexos de items e updates (`src/hooks/useFileUpload.ts`) |
| `avatars` | Sim (assumido) | 2 MB (app-side) | Logo de workspace/branding (`src/components/settings/BrandingSettings.tsx:79`) |

**Bucket `attachments` (`supabase/migrations/20260408211000_create_attachments_bucket.sql`):**
- MIME types permitidos: imagens (jpeg/png/gif/webp/svg), videos (mp4/webm/quicktime), PDF, Office (Word/Excel/PowerPoint), texto (plain/csv), zip
- Path convention: `{userId}/{itemId}/{fileName}` (ver `useFileUpload.ts:66`)
- RLS policies:
  - INSERT: authenticated users
  - SELECT: authenticated users + anon (publico para leitura)
  - DELETE: authenticated users em arquivos com seu `userId` como primeiro folder

**Cache:**
- React Query (client-side cache em memoria) - `@tanstack/react-query`
- Nao ha Redis/Memcached server-side

## Autenticacao e Identidade

**Provedor de Auth:** Supabase Auth (email/senha)
- Hook: `src/hooks/useAuth.ts`
- Sessao persistida em `localStorage`
- Rotas protegidas via `ProtectedRoute` e `AuthRoute` em `App.tsx`
- Trigger DB `handle_new_user` (RPC) cria workspace + board iniciais para novos usuarios (onboarding automatico)
- Bloqueio de usuarios via `profiles.preferences.is_active = false` (Edge Function `check-user-active`)

**Convite de Usuarios:**
- Edge Function: `supabase/functions/invite-user/index.ts`
- Chama `supabase.auth.admin.inviteUserByEmail()` (requer service role)
- Apenas admins globais (verificado via `user_roles.role = 'admin'`)
- Invocado em `src/components/settings/AdminSettings.tsx:191` e `src/components/workspace/InviteModal.tsx:56`

## Edge Functions

Todas em `supabase/functions/`, Deno runtime, importam de `https://deno.land/std@0.168.0` e `https://esm.sh/@supabase/supabase-js@2`. Todas tem CORS aberto (`Access-Control-Allow-Origin: *`).

| Funcao | Path | Auth | Service Role | Descricao |
|--------|------|------|--------------|-----------|
| `send-slack-notification` | `supabase/functions/send-slack-notification/index.ts` | Nao (publica) | Sim | Le `integrations.config.webhook_url` por workspace, faz POST para Slack com timeout 5s, registra resultado em `integration_logs` |
| `invite-user` | `supabase/functions/invite-user/index.ts` | JWT obrigatorio + admin role | Sim | Convida usuario por email via `auth.admin.inviteUserByEmail`, valida que email nao existe em `profiles` |
| `check-user-active` | `supabase/functions/check-user-active/index.ts` | Nao | Sim | Verifica `profiles.preferences.is_active`; se false, banido via `auth.admin.updateUserById` |
| `list-sessions` | `supabase/functions/list-sessions/index.ts` | JWT obrigatorio | Sim | Retorna info da sessao atual via `auth.admin.getUserById` (last_sign_in_at, user_agent) |
| `submit-form` | `supabase/functions/submit-form/index.ts` | Nao (publica, com rate limit) | Sim | Submete formulario publico: rate limit 10 req/min/IP, valida slug em `board_forms`, cria `items` + `column_values` (max 50 campos, name <= 500 chars) |

**Invocacoes do client (`supabase.functions.invoke`):**
- `list-sessions` <- `src/components/settings/SessionManagement.tsx:59`
- `submit-form` <- `src/pages/PublicForm.tsx:90`
- `invite-user` <- `src/components/settings/AdminSettings.tsx:191`, `src/components/workspace/InviteModal.tsx:56`
- `send-slack-notification` <- `src/hooks/useIntegrations.ts:236` (test), `src/hooks/useSupabaseData.ts:481` (real-time)

## RPCs Supabase (Funcoes Postgres)

Funcoes definidas em migrations e expostas via PostgREST. Lista completa:

**Permissoes (security definer, usadas em RLS policies):**
- `has_role(user_id, role)` - Checa se user tem role global
- `is_workspace_member(workspace_id, user_id)` - Checa membership de workspace
- `is_board_admin(board_id, user_id)` - Checa admin do board (expandido em commit 75e1666 para incluir workspace admins e global admins)
- `can_access_board(board_id, user_id)` - Checa acesso a board
- `can_access_item(item_id, user_id)` - Checa acesso a item

**Operacoes atomicas:**
- `duplicate_board_with_options(p_board_id, p_mode, p_name)` - Duplica board com modos `structure` / `with_data` / `with_updates` (`src/hooks/useCrudMutations.ts:871`)
- `duplicate_board_full(board_id)` - Duplicacao completa legacy
- `duplicate_item_full(item_id)` - Duplica item com subitems e column_values
- `delete_workspace_cascade(workspace_id)` - Delete em cascata

**Triggers/utilidades:**
- `handle_new_user()` - Trigger pos-signup: cria workspace e board iniciais com colunas Status/People/Date
- `update_updated_at()` - Trigger para campo `updated_at`

**Queries especializadas (chamadas do client):**
- `get_my_work_items(p_user_id)` - Retorna items atribuidos ao user cross-board (`src/hooks/useMyWorkItems.ts:40`)
- `search_all(p_query)` - Busca global (`src/components/GlobalSearch.tsx:109`, `src/components/CommandPalette.tsx:71`)

## Monitoramento e Observabilidade

**Rastreamento de Erros:** Nao configurado no projeto (Sentry mencionado em `.env.example` global do template Synkra AIOS, mas nao usado no codigo).

**Logs:**
- Edge Functions: `console.log` / `console.error` (capturados pelo Supabase)
- Integration logs: tabela `integration_logs` (criada em `supabase/migrations/20260219081000_create_integration_logs.sql`) - registra `event_type`, `status`, `error_message`, `metadata` por integration
- Audit log: tabela `audit_log` (acoes sensiveis de usuarios)
- Activity log: tabela `activity_log` (eventos por item)
- Cliente: `console.error` em hooks de mutation (sem servico externo)

## CI/CD e Deploy

**Hospedagem (dois alvos suportados):**

1. **Vercel** (`vercel.json`)
   - Rewrites: `/(.*) -> /index.html` (SPA fallback)
   - Build automatico do `package.json`

2. **Docker / Coolify VPS** (`Dockerfile`)
   - Multi-stage: `node:22-alpine` build + `nginx:alpine` serve
   - Build args: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Nginx serve `dist/` na porta 3000 com fallback SPA
   - Producao em `gestor.lfpro.com.br` (Coolify, conforme `~/.claude/CLAUDE.md`)

**Pipeline CI:** Nao detectado (sem `.github/workflows/` ou similar visivel)

## Webhooks e Callbacks

**Entrada:**
- Edge Function `submit-form` aceita POSTs publicos para criar items via formularios publicos (slug-based)

**Saida:**
- Slack webhook outgoing via `send-slack-notification` Edge Function (URL configurada por workspace na tabela `integrations`)

## Variaveis de Ambiente

**Em uso no projeto (`.env`):**

| Variavel | Onde usada | Tipo |
|----------|-----------|------|
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts:4` | Client (build-time) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `src/integrations/supabase/client.ts:5` | Client (anon key, publica) |
| `VITE_SUPABASE_PROJECT_ID` | Build/deploy | Build-time |
| `ACCESS_TOKEN_SUPABASE` | CLI Supabase local | Dev tool |

**Em Edge Functions (injetadas pelo Supabase):**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (nunca exposta ao client)

**Nota:** O arquivo `.env.example` no repositorio e um template generico do "Synkra AIOS" com placeholders nao relacionados ao projeto (DEEPSEEK, OPENROUTER, ANTHROPIC, EXA, GITHUB_TOKEN, CLICKUP, N8N, SENTRY, RAILWAY, VERCEL etc.). Esses servicos **nao** sao usados pelo `hub-tarefas-lfpro` em si. As unicas variaveis realmente necessarias para rodar o projeto sao as listadas acima. Considerar substituir `.env.example` por um template especifico do projeto.

**Fallback hardcoded:** Em `src/integrations/supabase/client.ts:4-5` ha URL e anon key hardcoded como fallback (apontando para o projeto `legvzsdbgyggubdomwxp`). Isso permite o app rodar sem `.env` configurado, mas trava a configuracao em um unico projeto Supabase.
