---
phase: 01-docs-mode-notion
plan: 01-02
subsystem: editor
tags: [blocknote, editor, theme, ui, frontend]
requires: [01-01]
provides:
  - "PageEditor (src/components/page/PageEditor.tsx)"
  - "lfproBlockNoteTheme (light + dark)"
  - "BlockNote CSS overrides (Jost/Montserrat + warm gold)"
affects:
  - src/index.css
  - package.json
tech-stack:
  added:
    - "@blocknote/core@^0.51.2"
    - "@blocknote/react@^0.51.2"
    - "@blocknote/mantine@^0.51.2"
    - "@mantine/core@^8.3"
    - "@mantine/hooks@^8.3"
  patterns:
    - "Editor base reutilizavel com tema injetado via next-themes resolvedTheme"
    - "CSS overrides em arquivo dedicado importado a partir de src/index.css"
key-files:
  created:
    - src/components/page/PageEditor.tsx
    - src/components/page/PageEditor.test.tsx
    - src/components/page/blocknote-theme.ts
    - src/styles/blocknote-overrides.css
  modified:
    - src/index.css
    - package.json
    - package-lock.json
decisions:
  - "Pacote Mantine fixado em ^8.3 (Mantine 9 exige React 19; projeto e React 18.3.1)"
  - "BlockNote shadcn theme NAO escolhido; usado @blocknote/mantine + Theme object + CSS overrides para alinhar com tokens LFPro (warm gold + Jost/Montserrat)"
  - "Headings via CSS override (Montserrat) porque BlockNote Theme so aceita fontFamily global"
  - "PageEditor recebe initialContent uncontrolled (limitacao da API BlockNote); atualizacao externa via editor.replaceBlocks ficara em 01-04"
metrics:
  duration: "~10 min"
  tasks_completed: 7
  files_created: 4
  files_modified: 3
  commits: 6
  tests_added: 3
  tests_total: 188
  completed_at: "2026-05-22T11:42Z"
---

# Fase 01 Plano 01-02: BlockNote base + LFPro theme Summary

Componente reutilizavel `PageEditor` integrando o editor BlockNote com tematizacao LFPro (warm gold + Jost/Montserrat + dark mode automatico via next-themes), pronto para ser plugado pela rota /page/:pageId do plano 01-04.

## O Que Foi Construido

- **Pacotes BlockNote instalados** (`@blocknote/core`, `@blocknote/react`, `@blocknote/mantine` v0.51.2) com `@mantine/core` e `@mantine/hooks` fixados em ^8.3 para evitar conflito com React 18.
- **`lfproBlockNoteLightTheme` e `lfproBlockNoteDarkTheme`** (`src/components/page/blocknote-theme.ts`): objetos Theme do BlockNote/Mantine com cores warm gold em hovered/selected, fonte Jost, borderRadius 8.
- **CSS overrides** (`src/styles/blocknote-overrides.css`): forca Jost no container, Montserrat em h1/h2/h3, slash menu hovered com tom warm gold (light + dark), outline warm gold em bloco selecionado, caret colorido, side menu suave.
- **`PageEditor`** (`src/components/page/PageEditor.tsx`): React.FC com props `initialContent`, `onChange(blocks)`, `editable`, `className`. Usa `useTheme` do next-themes para alternar light/dark automaticamente. Importa estilos obrigatorios do BlockNote no proprio arquivo.
- **Smoke tests** (`src/components/page/PageEditor.test.tsx`): 3 cenarios (mount vazio, prop onChange, editable=false). 188 testes do projeto continuam passando.
- **Import global**: `src/index.css` agora carrega `./styles/blocknote-overrides.css` apos as diretivas Tailwind.

## Conexao com Outras Fases

- **Consome 01-01**: usa o ambiente Supabase + tipos `PageContent` (BlockNote JSON) ja definidos no plano anterior.
- **Habilita 01-03 (sidebar)**: nao tem dependencia direta, mas a sidebar exibira pages que vao abrir esse editor.
- **Habilita 01-04 (rota e autosave)**: monta `<PageEditor initialContent={page.content} onChange={debouncedSave} />`. A API uncontrolled (initialContent so lido uma vez) ja esta documentada — sincronizacao externa via `editor.replaceBlocks`.
- **Habilita 01-05 (mention + embed)**: extensoes customizadas serao injetadas via prop `schema` no `useCreateBlockNote`, mantendo o mesmo PageEditor.

## Commits

| Hash | Tarefa | Mensagem |
|------|--------|----------|
| 17fadf7 | 1 | chore: install BlockNote editor packages (pin Mantine 8) |
| 4444de4 | 2 | feat: add LFPro BlockNote theme (light + dark) |
| a43ba28 | 3 | feat: add LFPro CSS overrides for BlockNote DOM |
| a6a57ab | 4 | feat: import BlockNote overrides into global CSS |
| 7594233 | 5 | feat: add base PageEditor component (BlockNote + LFPro theme) |
| f324e7a | 6 | test: smoke tests for PageEditor |

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Bloqueante] Conflito de peer dependency Mantine 9 vs React 18**

- **Encontrado durante:** Tarefa 1
- **Issue:** `npm install @blocknote/mantine` resolveu `@mantine/hooks@9.2.1` que exige `react@^19.2.0`. Projeto e `react@^18.3.1`.
- **Correcao:** Instalado explicitamente `@mantine/core@^8.3` e `@mantine/hooks@^8.3` junto com os pacotes BlockNote, forcando o solver do npm a usar a familia 8.x (que aceita React 18 e e compativel com `@blocknote/mantine@0.51.2` cujo peer e `^8.3.11 || ^9.0.2`).
- **Arquivos modificados:** `package.json`, `package-lock.json`
- **Commit:** 17fadf7

**2. [Regra 1 - Tipo] Remocao de `brown` em highlights do Theme**

- **Encontrado durante:** Tarefa 2
- **Issue:** O plano sugeria incluir `brown` em `colors.highlights`. O tipo `ColorScheme` em `@blocknote/mantine` (visto em `BlockNoteTheme.d.ts`) lista 8 cores (gray, red, orange, yellow, green, blue, purple, pink) e NAO inclui `brown`.
- **Correcao:** Removida a entrada `brown` em ambos os temas light e dark. Demais 8 cores mantidas com paletas LFPro-friendly.
- **Arquivos modificados:** `src/components/page/blocknote-theme.ts`
- **Commit:** 4444de4

**3. [Regra 1 - Convencao] Ajuste no seletor `.ProseMirror` do CSS override**

- **Encontrado durante:** Tarefa 3
- **Issue:** O plano usava `.ProseMirror` como seletor global; no DOM real do BlockNote ele e filho de `.bn-editor`, e o seletor solto poderia colidir com o TipTap legado do projeto (`src/components/shared/RichTextEditor.tsx`, que ja estiliza `.rich-editor-content .ProseMirror` em `src/index.css`).
- **Correcao:** Escopo restringido para `.bn-editor .ProseMirror`, garantindo que o RichTextEditor existente nao seja afetado.
- **Arquivos modificados:** `src/styles/blocknote-overrides.css`
- **Commit:** a43ba28

**4. [Regra 3 - Teste] ResizeObserver ausente em jsdom**

- **Encontrado durante:** Tarefa 6
- **Issue:** Mantine usa `ResizeObserver` internamente. jsdom 29 nao o implementa, e o componente quebrava no mount em ambiente Vitest.
- **Correcao:** Polyfill local no proprio arquivo de teste (`globalThis.ResizeObserver = class { observe/unobserve/disconnect }`). Decidi nao mexer em `src/test/setup.ts` para nao introduzir polyfill global afetando outros testes; pode ser promovido se outros testes do feature precisarem.
- **Arquivos modificados:** `src/components/page/PageEditor.test.tsx`
- **Commit:** f324e7a

**5. [Regra 4 (autonoma em builder mode) - Escolha de UI Wrapper] @blocknote/mantine vs @blocknote/shadcn**

- **Encontrado durante:** Tarefa 1
- **Issue:** O plano deu opcao entre `@blocknote/shadcn` e `@blocknote/mantine`. Apesar de o projeto usar shadcn-ui, `@blocknote/shadcn` instalaria toda a infra do shadcn como peer e exigiria copiar os primitivos para `src/components/ui/blocknote/`; alem disso ele e menos maduro e tem menos overrides de tema via prop.
- **Decisao autonoma:** Usar `@blocknote/mantine`. Tema visual ja e 100% customizado via objeto Theme + CSS overrides, entao a presenca do Mantine fica isolada ao editor. Mantine 8 e leve (~30 pacotes adicionados, alguns ja eram peer indireto).
- **Arquivos modificados:** `package.json`
- **Commit:** 17fadf7

## Tarefa 7 (Checkpoint)

O plano explicita que a verificacao visual real fica para o plano 01-04 (que monta a rota /page/:pageId). Aqui o checkpoint foi auto-resolvido:

- `npm run build` passa (build de producao em 10.6s, sem erros)
- `npm run test` passa (188 testes, incluindo os 3 novos do PageEditor)
- `npx tsc --noEmit` passa sem erros
- `npm run lint` nos arquivos do plano: 0 erros, 0 warnings novos (CSS sem regra ESLint e esperado)
- Nenhum erro `Cannot find module '@blocknote/...'` em qualquer comando

## Self-Check: PASSOU

- [x] 4 arquivos criados (PageEditor.tsx, PageEditor.test.tsx, blocknote-theme.ts, blocknote-overrides.css)
- [x] 3 arquivos modificados (index.css, package.json, package-lock.json)
- [x] 3 dependencias BlockNote presentes em package.json
- [x] Import de overrides presente em src/index.css
- [x] 6 commits encontrados no historico (17fadf7, 4444de4, a43ba28, a6a57ab, 7594233, f324e7a)
