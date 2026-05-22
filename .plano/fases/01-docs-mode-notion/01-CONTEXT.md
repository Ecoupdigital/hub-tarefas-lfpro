# Fase 01: Páginas estilo Notion (Docs Mode) - Contexto

**Reunido:** 2026-05-22
**Status:** Pronto para planejamento

<domain>
## Limite da Fase

Adicionar ao Hub LFPro um segundo formato de "board": **página rich-text estilo Notion** ("Docs Mode"), construída em cima de editor open-source consolidado (BlockNote). Usuário escolhe ao criar novo board: formato Tarefas (atual) OU formato Página. Páginas vivem ao lado de boards dentro do mesmo workspace, com permissões e realtime espelhando o modelo atual. Cross-link bidirecional permite que páginas mencionem items de boards e embedem boards read-only, e items linkem páginas.

**Fora do dominio (vai para fases futuras):**
- Subpáginas / hierarquia aninhada (árvore Notion-like)
- Database inline (tabela editável dentro do doc, mini-board)
- Comentários inline em seleção de texto (tipo Google Docs)
- AI commands no editor
- Export PDF / compartilhamento público de página
- Collab realtime full com CRDT (Yjs)

</domain>

<decisions>
## Decisões de Implementação

### Modelo de Mescla (como tarefa-board e doc-page convivem)
- **Criação:** `CreateBoardModal` ganha campo "tipo" no topo: `Tarefas` ou `Página`. Resto do modal se adapta condicionalmente. Mesmo entry point, sem dobrar UX.
- **Navegação:** Páginas aparecem **misturadas** com boards na lista do workspace no sidebar, diferenciadas por ícone (documento vs grade). Reusa hierarquia atual de `workspace > folder > item`.
- **Cross-linking:** Bidirecional no MVP.
  - Página menciona item via @mention (chip clicável com preview)
  - Página embeda board inteiro (read-only)
  - Item pode linkar página (via coluna existente `Link` ou nova coluna tipo `Page`)
- **Permissões:** Modelo **idêntico ao de boards**. Página herda do workspace + tem permissões próprias por página. Reaproveita RPCs existentes (`can_access_board` será espelhado por `can_access_page`) e UI de `BoardPermissionsPanel`.

### Editor Open-Source
- **Escolha:** **BlockNote** (https://www.blocknotejs.org/). Razões:
  - Construído sobre TipTap 3 — projeto já tem TipTap 3 instalado (`@tiptap/react`, `@tiptap/starter-kit`, etc. nos updates)
  - Blocos Notion-like prontos (heading, list, code, quote, callout, image, table, etc.)
  - MIT, manutenção ativa, doc sólida
  - Slash command e formatting toolbar inclusos
- **Estratégia:** Pacote npm padrão (`@blocknote/core`, `@blocknote/react`, `@blocknote/mantine` ou shadcn theme). Extensões customizadas via API do BlockNote/TipTap para `mention-item` e `embed-board`. Sem fork.
- **Customização visual:** Aplicar tokens LFPro:
  - Paleta: cor primária `hsl(29 45% 71%)` (warm gold)
  - Fontes: Jost (corpo), Montserrat (headings)
  - Dark mode obrigatório (já é classe CSS no projeto)
  - Sobrescrever CSS variables do BlockNote
- **Colaboração realtime:** MVP usa **presence + lock simples** (last-write-wins).
  - Reusa `usePresence` existente para mostrar "X está editando"
  - Debounced save (~2s) na coluna `content`
  - Sem cursores ao vivo, sem CRDT
  - Realtime channel Supabase invalida cache React Query em outros clients (mostra refresh visual após save)

### Modelo de Dados (Schema)
- **Armazenamento:** Conteúdo serializado como **JSON de blocos (`jsonb`)**, formato nativo BlockNote.
  - Permite query (contar blocos, buscar texto)
  - Permite exportar pra MD/HTML quando necessário (BlockNote tem helpers)
  - Preserva fidelidade de blocos especiais (callout, embed custom, mention)
- **Tabela nova `pages`:** Espelha estrutura de `boards`.
  - Colunas principais: `id`, `workspace_id`, `folder_id` (nullable), `title`, `content jsonb`, `state`, `icon`, `cover_url`, `created_by`, `created_at`, `updated_at`
  - **Não estender `boards`** com `type='doc'` — mantém concerns separados, queries mais simples
  - Page **não é filha obrigatória de board** — vive direto no workspace
- **Versionamento:** Tabela `page_versions` com snapshot periódico.
  - Snapshot em: a cada N saves (ex: 10) OU intervalo (ex: 5min) — definir no planejamento
  - Colunas: `id`, `page_id`, `content jsonb`, `created_by`, `created_at`
  - UI: botão "Histórico" abre panel listando versões, permite restaurar (cria nova versão atual a partir da antiga, não sobrescreve)
  - Aproveita padrão de `audit_log` existente
- **Soft delete e Realtime:** Espelhar boards.
  - Campo `state` (active/archived/trashed) — reaproveita fluxo de Trash/Restore
  - Subscription Supabase Realtime no canal `pages` invalida cache React Query (padrão `useRealtimeSync`)

### Features MVP — Editor
- **Blocos inclusos no MVP (todos os 4 grupos selecionados):**
  - Headings H1/H2/H3
  - Paragraph, bullet list, numbered list, checklist
  - Code block (com syntax highlight) + inline code
  - Quote, callout, divider
  - Toggle (collapsible)
  - Image upload (reusa bucket `attachments` já criado, RLS já configurada)
  - Tabela inline (block table — distinta de embed de board)
  - Embed de URL (vídeo YouTube/Loom/iframe genérico)
- **Slash command (`/`):** Sim. BlockNote default + custom items:
  - `/mencionar` → abre picker de items (busca cross-board)
  - `/embedar board` → abre picker de boards, insere bloco read-only
- **Cross-link:**
  - `@mention` de item: chip inline clicável, mostra nome + status atual (resolvido via query no momento do render), abre `ItemDetailPanel` ao clicar
  - Embed de board: bloco renderiza `BoardTable` em modo read-only com filtros opcionais (`?status=Done` etc.)
  - Coluna `Page link` em items (nova ou via coluna existente `Link`) — definir no planejamento

### Critério do Claude
- Definir exata granularidade do snapshot de `page_versions` (a cada N saves ou intervalo) no planejamento, baseado em uso esperado e custo de storage
- Definir se cross-link de item→página usa coluna existente `Link` ou cria coluna nova tipo `Page` (com preview embutido)
- Definir estratégia de upload de imagem: direto no bucket Supabase Storage via cliente vs Edge Function intermediária (preferir direto se RLS bater)
- Layout do editor em mobile (pode usar `use-mobile.tsx` existente)
- Atalhos de teclado (alinhar com `useKeyboardShortcuts` existente)

</decisions>

<specifics>
## Ideias Específicas

- **Inspiração visual:** Notion (estética, hierarquia, slash command). Manter feeling LFPro via tokens (warm gold, Jost/Montserrat).
- **Open-source de referência confirmado:** BlockNote (https://github.com/TypeCellOS/BlockNote).
- **Estratégia "não criar do zero":** Reusar componente, customizar só superfície (tema + extensões). Reduz risco e tempo.
- **Reaproveitamento explícito do que existe:**
  - TipTap 3 já no package.json
  - `usePresence`, `useRealtimeSync`, `useCrudMutations`, `useAuditLog` — padrões a estender pra pages
  - `attachments` bucket pra imagens
  - `BoardPermissionsPanel` (espelhar como `PagePermissionsPanel`)
  - RPCs de permissão (criar `can_access_page` espelhando `can_access_board`)
  - `Trash`/`Undo/Redo` flows
  - Sidebar workspace (estender para listar pages junto)

</specifics>

<deferred>
## Ideias Adiadas

Adiadas para fases futuras (NÃO incluir no MVP):

- **Subpáginas / árvore Notion-like:** Páginas aninhadas (page dentro de page). Fase futura: "Docs Tree".
- **Database inline:** Mini-tabela editável dentro do doc, com colunas tipadas (mini-board). Fase futura: "Inline Databases".
- **Comentários inline em blocos:** Selecionar texto e comentar (Google Docs/Notion). Fase futura: "Doc Comments".
- **AI commands no editor:** `/ai escreva`, `/ai resuma`, etc. Vai pra fase IA dedicada do produto.
- **Export PDF / Share público da página:** Aproveitar fluxo de `SharedBoard` existente. Fase futura: "Page Sharing".
- **Realtime collab full com CRDT (Yjs/Hocuspocus):** Cursores ao vivo e merge automático multi-usuário. Pesado de infra. Fase futura: "Live Collab".
- **Comentários, AI, share público e export** confirmados como fora pelo usuário implicitamente (recomendações marcadas como "Fora MVP"); subpáginas, database inline e collab full também adiadas por escopo.

</deferred>

---

*Fase: 01-docs-mode-notion*
*Contexto reunido: 2026-05-22*
