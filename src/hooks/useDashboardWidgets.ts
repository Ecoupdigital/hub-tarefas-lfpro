import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WidgetFilter {
  columnId: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'lt' | 'gte' | 'lte' | 'is_empty' | 'is_not_empty';
  value?: any;
}

export interface WidgetConfig {
  columnId?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'count_unique';
  title?: string;
  text?: string;
  limit?: number;
  // Legacy fields kept for retrocompatibility
  statusColumnId?: string;
  groupBy?: string;
  // New data-source fields
  metricColumnId?: string;
  groupByColumnId?: string;
  groupByType?: 'column' | 'group' | 'person' | 'date_created' | 'date_column';
  chartType?: 'bar' | 'bar_horizontal' | 'pie' | 'donut' | 'line' | 'area';
  filters?: WidgetFilter[];
  showLegend?: boolean;
  showValues?: boolean;
  colorPalette?: string[];
  dateColumnId?: string;
  dateRange?: 'last_7' | 'last_14' | 'last_30' | 'last_90';
  dateGranularity?: 'day' | 'week' | 'month';
  visibleColumns?: string[];
  rowLimit?: number;
  sortColumnId?: string;
  sortDirection?: 'asc' | 'desc';
  subtitle?: string;
  color?: string;
}

export function resolveWidgetDataSource(config: WidgetConfig): WidgetConfig {
  const resolved = { ...config };

  // Normalize metricColumnId from legacy statusColumnId
  if (!resolved.metricColumnId && resolved.statusColumnId) {
    resolved.metricColumnId = resolved.statusColumnId;
  }

  // Normalize groupBy fields from legacy groupBy string
  if (!resolved.groupByColumnId && !resolved.groupByType && resolved.groupBy) {
    if (resolved.groupBy === 'group') {
      resolved.groupByType = 'group';
    } else if (resolved.groupBy === 'status') {
      resolved.groupByType = 'column';
      if (resolved.statusColumnId) {
        resolved.groupByColumnId = resolved.statusColumnId;
      }
    } else {
      resolved.groupByType = 'column';
      resolved.groupByColumnId = resolved.groupBy;
    }
  }

  return resolved;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget {
  id: string;
  board_id: string;
  widget_type: string;
  config: WidgetConfig;
  position: WidgetPosition;
  user_id: string;
  dashboard_id: string | null;
  created_at?: string;
}

export const useDashboardWidgets = (boardId: string | null | undefined) =>
  useQuery({
    queryKey: ['dashboard_widgets', boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('board_id', boardId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DashboardWidget[];
    },
  });

export const useCreateWidget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      boardId,
      widgetType,
      config,
      position,
    }: {
      boardId: string;
      widgetType: string;
      config: WidgetConfig;
      position: WidgetPosition;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Usuario nao autenticado');

      const { data, error } = await supabase
        .from('dashboard_widgets')
        .insert({
          board_id: boardId,
          widget_type: widgetType,
          config: config as any,
          position: position as any,
          user_id: userId,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as DashboardWidget;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard_widgets'] });
    },
  });
};

export const useUpdateWidget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      config,
      position,
      widget_type,
    }: {
      id: string;
      config?: WidgetConfig;
      position?: WidgetPosition;
      widget_type?: string;
    }) => {
      const updates: any = {};
      if (config !== undefined) updates.config = config;
      if (position !== undefined) updates.position = position;
      if (widget_type !== undefined) updates.widget_type = widget_type;

      const { error } = await supabase
        .from('dashboard_widgets')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard_widgets'] });
    },
  });
};

export const useDeleteWidget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard_widgets'] });
    },
  });
};
