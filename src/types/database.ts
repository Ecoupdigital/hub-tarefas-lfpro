import type { Board } from '@/types/board';

/**
 * Subset dos 8 tipos de coluna permitidos em databases inline (MVP Fase 02).
 * Outros 18 tipos sao ocultados da UI de criar coluna quando o board e database.
 */
export type DatabaseColumnType =
  | 'text'
  | 'status'
  | 'date'
  | 'people'
  | 'number'
  | 'checkbox'
  | 'dropdown'
  | 'long_text';

export const DATABASE_COLUMN_TYPES: readonly DatabaseColumnType[] = [
  'text',
  'status',
  'date',
  'people',
  'number',
  'checkbox',
  'dropdown',
  'long_text',
] as const;

/**
 * Tipos de view de database. Reusa tipos de board_views.view_type.
 * 'list_detailed' e exclusivo de database (Notion list view).
 */
export type DatabaseViewType = 'table' | 'kanban' | 'calendar' | 'list_detailed';

export const DATABASE_VIEW_TYPES: readonly DatabaseViewType[] = [
  'table',
  'kanban',
  'calendar',
  'list_detailed',
] as const;

export const DATABASE_VIEW_LABELS: Record<DatabaseViewType, string> = {
  table: 'Tabela',
  kanban: 'Kanban',
  calendar: 'Calendario',
  list_detailed: 'Lista detalhada',
};

/**
 * Type guard: retorna true se o board e uma database inline (boards.page_id IS NOT NULL).
 * Use no client para alternar UI (titulo, criacao de coluna, view selector).
 */
export function isDatabase(board: { page_id?: string | null } | null | undefined): boolean {
  return !!board && !!board.page_id;
}

/**
 * Subset visivel da Board pra contexto de database (pra evitar carregar campos
 * de board tradicional que nao se aplicam).
 */
export interface DatabaseBoard extends Board {
  page_id: string;
}

// ── View style toggle (Fase 03) ────────────────────────────────────────────

/**
 * Estilo visual de uma view de database.
 * 'lfpro' (default): reusa Board* via mode='database', tokens warm gold LFPro.
 * 'notion': renderiza NotionTableView/Kanban/Calendar/List com paleta cinza neutra.
 *
 * Persistido em board_views.config.style (jsonb, default 'lfpro').
 */
export type ViewStyle = 'lfpro' | 'notion';

export const VIEW_STYLES: readonly ViewStyle[] = ['lfpro', 'notion'] as const;

export const VIEW_STYLE_DEFAULT: ViewStyle = 'lfpro';

export const VIEW_STYLE_LABELS: Record<ViewStyle, string> = {
  lfpro: 'LFPro',
  notion: 'Notion',
};

/**
 * Le o style de uma BoardView (defensivo: trata config null, style faltando, valor invalido).
 */
export function getViewStyle(view: { config?: Record<string, unknown> | null } | null | undefined): ViewStyle {
  const raw = (view?.config as Record<string, unknown> | null | undefined)?.style;
  if (raw === 'notion' || raw === 'lfpro') return raw;
  return VIEW_STYLE_DEFAULT;
}
