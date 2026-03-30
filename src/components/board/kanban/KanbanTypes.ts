import type { Item, StatusLabel } from '@/types/board';

// ── Tipos de coluna que possuem opcoes discretas (lanes validas) ────────
export const LANE_ELIGIBLE_COLUMN_TYPES = ['status', 'dropdown', 'tags'] as const;
export type LaneEligibleType = typeof LANE_ELIGIBLE_COLUMN_TYPES[number];

export function isLaneEligible(type: string): type is LaneEligibleType {
  return (LANE_ELIGIBLE_COLUMN_TYPES as readonly string[]).includes(type);
}

// ── Types ──────────────────────────────────────────────────────────────
export interface KanbanSettings {
  /** Modo primario de lanes: 'column' = por valor de coluna, 'group' = por grupo do board */
  kanbanMode: 'column' | 'group';
  /** Id da coluna usada como lanes (status, dropdown ou tags). Usado quando kanbanMode === 'column'. */
  kanbanColumnId: string | null;
  swimlaneEnabled: boolean;
  /** 'group' = agrupar por grupo do board; 'column' = agrupar por valor de coluna */
  swimlaneMode: 'group' | 'column';
  swimlaneColumnId: string | null;
  wipLimits: Record<string, number>;
  visibleFields: {
    name: boolean;
    statusIndicator: boolean;
    person: boolean;
    date: boolean;
    progress: boolean;
    priority: boolean;
    tags: boolean;
    subitems: boolean;
  };
}

export const DEFAULT_SETTINGS: KanbanSettings = {
  kanbanMode: 'column',
  kanbanColumnId: null,
  swimlaneEnabled: false,
  swimlaneMode: 'group',
  swimlaneColumnId: null,
  wipLimits: {},
  visibleFields: {
    name: true,
    statusIndicator: true,
    person: true,
    date: true,
    progress: false,
    priority: false,
    tags: true,
    subitems: false,
  },
};

export const KANBAN_SETTINGS_KEY_PREFIX = 'lfpro-kanban-settings-';

export function loadKanbanSettings(boardId: string | undefined): KanbanSettings {
  if (!boardId) return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(KANBAN_SETTINGS_KEY_PREFIX + boardId);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed, visibleFields: { ...DEFAULT_SETTINGS.visibleFields, ...parsed.visibleFields } };
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

export function saveKanbanSettings(boardId: string | undefined, settings: KanbanSettings) {
  if (!boardId) return;
  localStorage.setItem(KANBAN_SETTINGS_KEY_PREFIX + boardId, JSON.stringify(settings));
}

export interface KanbanColumn {
  key: string;
  label: StatusLabel | null;
  items: Item[];
}

export interface Swimlane {
  key: string;
  title: string;
  color?: string;
  columns: KanbanColumn[];
  isCollapsed: boolean;
}
