import { useCallback } from 'react';
import { useBoardViews, useUpdateBoardViewConfig } from '@/hooks/useBoardViews';
import { getViewStyle, type ViewStyle, VIEW_STYLE_DEFAULT } from '@/types/database';

/**
 * Hook para ler/persistir o estilo visual (lfpro | notion) de uma board_view.
 *
 * Le board_views.config.style via useBoardViews(boardId). Setter merge `style`
 * no objeto config existente e chama useUpdateBoardViewConfig.
 *
 * @param boardId Id do board (para fetch de views via React Query cache compartilhado)
 * @param viewId  Id da view ativa. Se null/undefined, retorna VIEW_STYLE_DEFAULT e setter no-op.
 *
 * @example
 * const { style, setStyle, isUpdating } = useViewStyle(boardId, activeViewId);
 * <Switch checked={style === 'notion'} onCheckedChange={(c) => setStyle(c ? 'notion' : 'lfpro')} />
 */
export function useViewStyle(boardId: string | null, viewId: string | null | undefined) {
  const { data: views = [] } = useBoardViews(boardId);
  const updateConfig = useUpdateBoardViewConfig();

  const currentView = viewId ? views.find((v) => v.id === viewId) : undefined;
  const style: ViewStyle = getViewStyle(currentView ?? null);

  const setStyle = useCallback(
    (next: ViewStyle) => {
      if (!viewId || !currentView) return Promise.resolve();
      const baseConfig =
        (currentView.config as Record<string, unknown> | null | undefined) ?? {};
      const nextConfig = { ...baseConfig, style: next };
      return updateConfig.mutateAsync({ viewId, config: nextConfig });
    },
    [viewId, currentView, updateConfig]
  );

  return {
    style,
    setStyle,
    isUpdating: updateConfig.isPending,
    /** True quando a view existe e tem style explicito persistido (nao default). */
    isPersisted: !!(currentView?.config as Record<string, unknown> | null | undefined)?.style,
  };
}

export { VIEW_STYLE_DEFAULT };
