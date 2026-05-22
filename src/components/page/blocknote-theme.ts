import type { Theme } from '@blocknote/mantine';

/**
 * Tema LFPro para BlockNote.
 *
 * Cores derivadas das variaveis CSS em src/index.css:
 *   --primary base do projeto e neutro (preto/branco), mas o acento warm gold
 *   da feature de Pagina usa hsl(29 45% 71%) (light) e hsl(29 50% 76%) (dark).
 *   Esses tons sao aplicados em hovered/selected dentro do editor.
 *
 * Fonte: Jost (corpo). Headings recebem Montserrat via overrides CSS
 * (src/styles/blocknote-overrides.css) porque o objeto Theme so aceita uma
 * fontFamily global.
 *
 * Conversao HSL aproximada para hex (BlockNote pinta CSS variables com
 * essas strings):
 *   hsl(29 45% 71%)  ~ #d9b88c  (warm gold)
 *   hsl(29 50% 76%)  ~ #e2c5a0  (warm gold light, dark mode)
 */

const WARM_GOLD = '#d9b88c';
const WARM_GOLD_DARK = '#e2c5a0';

export const lfproBlockNoteLightTheme: Theme = {
  colors: {
    editor: {
      text: '#1a1a1a',
      background: '#ffffff',
    },
    menu: {
      text: '#1a1a1a',
      background: '#ffffff',
    },
    tooltip: {
      text: '#ffffff',
      background: '#1a1a1a',
    },
    hovered: {
      text: '#1a1a1a',
      background: '#f5efe6',
    },
    selected: {
      text: '#1a1a1a',
      background: '#f0e2cf',
    },
    disabled: {
      text: '#9ca3af',
      background: '#f3f4f6',
    },
    shadow: '#00000014',
    border: '#e5e7eb',
    sideMenu: '#9ca3af',
    highlights: {
      gray: { text: '#6b7280', background: '#f3f4f6' },
      red: { text: '#dc2626', background: '#fee2e2' },
      orange: { text: '#ea580c', background: '#ffedd5' },
      yellow: { text: '#ca8a04', background: '#fef9c3' },
      green: { text: '#16a34a', background: '#dcfce7' },
      blue: { text: '#2563eb', background: '#dbeafe' },
      purple: { text: '#9333ea', background: '#f3e8ff' },
      pink: { text: '#db2777', background: '#fce7f3' },
    },
  },
  borderRadius: 8,
  fontFamily: '"Jost", system-ui, sans-serif',
};

export const lfproBlockNoteDarkTheme: Theme = {
  colors: {
    editor: {
      text: '#f5f5f5',
      background: '#0f0f0f',
    },
    menu: {
      text: '#f5f5f5',
      background: '#1a1a1a',
    },
    tooltip: {
      text: '#0f0f0f',
      background: '#f5f5f5',
    },
    hovered: {
      text: '#f5f5f5',
      background: '#2a2520',
    },
    selected: {
      text: '#f5f5f5',
      background: '#3a3026',
    },
    disabled: {
      text: '#6b7280',
      background: '#1f2937',
    },
    shadow: '#00000040',
    border: '#374151',
    sideMenu: '#9ca3af',
    highlights: {
      gray: { text: '#9ca3af', background: '#1f2937' },
      red: { text: '#f87171', background: '#450a0a' },
      orange: { text: '#fb923c', background: '#431407' },
      yellow: { text: '#facc15', background: '#422006' },
      green: { text: '#4ade80', background: '#052e16' },
      blue: { text: '#60a5fa', background: '#0c1e3a' },
      purple: { text: '#c084fc', background: '#3b0764' },
      pink: { text: '#f472b6', background: '#500724' },
    },
  },
  borderRadius: 8,
  fontFamily: '"Jost", system-ui, sans-serif',
};

export const lfproBlockNoteTheme = {
  light: lfproBlockNoteLightTheme,
  dark: lfproBlockNoteDarkTheme,
};

export { WARM_GOLD, WARM_GOLD_DARK };
