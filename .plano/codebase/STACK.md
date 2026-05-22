# Stack de Tecnologia

**Data da Analise:** 2026-05-22

## Linguagens

**Principal:**
- TypeScript 5.8.3 - Toda a aplicacao (`src/**/*.{ts,tsx}`), strict desligado mas `strictNullChecks: true`
- TSX/JSX (`react-jsx` transform) - Componentes React

**Secundaria:**
- SQL (PostgreSQL) - 31 migrations em `supabase/migrations/*.sql`
- Deno TypeScript - Edge Functions em `supabase/functions/*/index.ts` (importa de `https://deno.land` e `https://esm.sh`)

## Runtime

**Ambiente:**
- Node.js >= 22 (enforced via `engines.node` em `package.json`)
- Browser SPA (sem SSR) - servido como HTML estatico

**Gerenciador de Pacotes:**
- npm (lockfile: `package-lock.json` presente)
- Bun lockfile tambem presente (`bun.lockb`) - npm e o oficial pelos comandos em `package.json`

## Frameworks

**Core:**
- React 18.3.1 + react-dom 18.3.1 - UI framework
- Vite 5.4.19 + @vitejs/plugin-react-swc 3.11 - Build tool e dev server (porta 8080)
- React Router DOM 6.30.1 - Roteamento client-side

**UI/Estilo:**
- Tailwind CSS 3.4.17 + tailwindcss-animate 1.0.7 - Estilizacao utility-first
- @tailwindcss/typography 0.5.16 - Prose styling
- shadcn-ui (style "default", baseColor "slate", cssVariables true) - Sistema de componentes baseado em Radix UI
- ~30 pacotes `@radix-ui/react-*` - Primitivos acessiveis (dialog, popover, dropdown, select, tabs, etc.)
- lucide-react 0.462.0 - Icones
- next-themes 0.3.0 - Toggle de tema claro/escuro
- class-variance-authority 0.7.1 + clsx 2.1.1 + tailwind-merge 2.6.0 - Composicao de classes
- sonner 1.7.4 - Toasts
- vaul 0.9.9 - Drawers mobile
- cmdk 1.1.1 - Command palette

**Estado e Dados:**
- @tanstack/react-query 5.83.0 - Cache de servidor, mutations, invalidacao
- @tanstack/react-virtual 3.13.18 - Virtualizacao de listas grandes
- React Context (`src/context/AppContext.tsx`) - Estado de UI global (board ativo, filtros, view)
- react-hook-form 7.61.1 + @hookform/resolvers 3.10 + zod 3.25.76 - Formularios e validacao

**Rich Text:**
- @tiptap/react 3.20 + @tiptap/pm 3.20 + @tiptap/starter-kit 3.20
- @tiptap/extension-link 3.20, @tiptap/extension-placeholder 3.20, @tiptap/extension-underline 3.20

**Interacao:**
- @dnd-kit/core 6.3.1 + @dnd-kit/sortable 10.0.0 + @dnd-kit/utilities 3.2.2 - Drag and drop
- react-resizable-panels 2.1.9 - Paineis redimensionaveis
- react-grid-layout 2.2.2 - Layout de widgets do dashboard
- embla-carousel-react 8.6.0 - Carrosseis
- react-day-picker 8.10.1 + date-fns 3.6.0 - Date pickers (locale pt-BR)
- input-otp 1.4.2 - OTP inputs

**Visualizacao e Export:**
- recharts 2.15.4 - Graficos (dashboard widgets)
- xlsx 0.18.5 - Export para Excel

**Seguranca:**
- dompurify 3.3.3 + @types/dompurify - Sanitizacao de HTML do rich text

**Testes:**
- Vitest 3.2.4 - Test runner (`vitest run`, `vitest` para watch)
- @testing-library/react 16.0.0 + @testing-library/jest-dom 6.6.0
- jsdom 29.0.1 - DOM virtual para testes unitarios
- @playwright/test 1.58.2 - Testes E2E (config `playwright.config.ts`, dir `./tests`, chromium)

**Build/Dev:**
- ESLint 9.32.0 + typescript-eslint 8.38.0 + eslint-plugin-react-hooks 5.2.0 + eslint-plugin-react-refresh 0.4.20
- PostCSS 8.5.6 + autoprefixer 10.4.21
- @vitejs/plugin-react-swc 3.11 - SWC para builds rapidos

## Dependencias Chave

**Criticas:**
- @supabase/supabase-js 2.95.3 - Cliente Supabase (auth, db, realtime, storage, functions)
- react / react-dom 18.3.1 - Base da aplicacao
- @tanstack/react-query 5.83.0 - Sincronizacao com servidor
- react-router-dom 6.30.1 - Navegacao
- tailwindcss 3.4.17 - Sistema de design

**Infraestrutura:**
- vite 5.4.19 - Build e dev server
- typescript 5.8.3 - Compilador
- @types/node 22.16.5 - Tipos Node

## Configuracao

**Build (`vite.config.ts`):**
- Plugin: `@vitejs/plugin-react-swc`
- Server: host `::`, port `8080`, HMR overlay off
- Alias: `@` -> `./src`
- Chunking manual em 6 vendor chunks:
  - `vendor-react` (react, react-dom, react-router-dom)
  - `vendor-supabase` (@supabase/supabase-js)
  - `vendor-ui` (Radix dialog/popover/dropdown)
  - `vendor-charts` (recharts)
  - `vendor-dnd` (dnd-kit core/sortable/utilities)
  - `vendor-xlsx` (xlsx)

**TypeScript:**
- `tsconfig.json` - Root (project references)
- `tsconfig.app.json` - App config: ES2020, jsx `react-jsx`, `moduleResolution: bundler`, `strictNullChecks: true`, demais strict flags off, types `vitest/globals`
- `tsconfig.node.json` - Config para arquivos node
- Path alias: `@/*` -> `./src/*`

**Tailwind (`tailwind.config.ts`):**
- darkMode: `class`
- content: `pages/**`, `components/**`, `app/**`, `src/**` (TS/TSX)
- Sem prefix
- Fontes: sans = Figtree, heading = Poppins (override no `index.css` documenta Jost/Montserrat tambem usados)
- Cores customizadas via CSS vars: border, input, ring, background, foreground, primary, secondary, destructive, muted, accent, popover, card, sidebar (com nested keys), board (bg, header), cell (default, border, hover), row (hover), status (green/orange/red/purple/blue/yellow/gray/teal/pink/navy)
- Box shadows: `ds-sm`, `ds-md`, `ds-lg`, `ds-focus`
- Transition durations customizadas (70/100/150/250/400ms)
- Easings: `ds-enter`, `ds-exit`, `ds-transition`
- Animations: accordion-down/up, slide-in-right, fade-in, pulse-soft
- Plugin: `tailwindcss-animate`

**shadcn-ui (`components.json`):**
- Style: default
- RSC: false (SPA pura)
- Aliases: components `@/components`, ui `@/components/ui`, utils `@/lib/utils`, lib `@/lib`, hooks `@/hooks`

**ESLint (`eslint.config.js`):**
- Flat config (ESLint 9)
- Extends: `js.configs.recommended` + `tseslint.configs.recommended`
- Ignora `dist/`
- Plugins: `react-hooks`, `react-refresh`
- Regras: `react-hooks/recommended`, `react-refresh/only-export-components` (warn, allowConstantExport), `@typescript-eslint/no-unused-vars` (warn, ignora args com `_`)

**Vitest (`vitest.config.ts`):**
- Environment: jsdom
- Globals: true
- Setup: `./src/test/setup.ts`
- Include: `src/**/*.{test,spec}.{ts,tsx}`
- Alias: `@` -> `./src`

**Playwright (`playwright.config.ts`):**
- testDir: `./tests`, match `**/*.ts`
- Timeout 600s/teste, expect 10s
- Sequencial (`fullyParallel: false`, workers 1, retries 0)
- baseURL `http://localhost:8080`
- headless `false` (UI mode default)
- viewport 1440x900
- Trace/screenshot/video em retain-on-failure
- Apenas chromium

**Ambiente:**
- `.env` (presente, contem configuracao Supabase do projeto - nao versionado de fato)
- `.env.example` - Template global do "Synkra AIOS" (nao especifico deste projeto, ver INTEGRATIONS.md)
- Variaveis usadas no client (prefixadas `VITE_`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- Token de CLI Supabase: `ACCESS_TOKEN_SUPABASE` (apenas dev)
- Fallback hardcoded no client (`src/integrations/supabase/client.ts:4-5`) aponta para projeto `legvzsdbgyggubdomwxp`

## Requisitos de Plataforma

**Desenvolvimento:**
- Node.js >= 22
- npm (ou bun, lockfile presente mas nao oficial)
- Acesso ao projeto Supabase `legvzsdbgyggubdomwxp` (ou um proprio configurado via `VITE_SUPABASE_*`)

**Build/Producao:**
- Build via Vite: `npm run build` -> `dist/`
- Deploy 1 (Vercel): `vercel.json` rewrites tudo para `/index.html` (SPA fallback)
- Deploy 2 (Docker): `Dockerfile` multi-stage
  - Stage 1: `node:22-alpine` faz `npm ci` + `npm run build` com build args `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
  - Stage 2: `nginx:alpine` serve `dist/` em porta 3000, com fallback `try_files $uri $uri/ /index.html`

**Scripts (`package.json`):**
- `npm run dev` - Vite dev server (porta 8080)
- `npm run build` - Build de producao
- `npm run build:dev` - Build em mode development
- `npm run lint` - ESLint
- `npm run preview` - Preview do build
- `npm run test` - Vitest run unico
- `npm run test:watch` - Vitest watch mode
