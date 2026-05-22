import React from 'react';
import { cn } from '@/lib/utils';
import { useViewStyle } from '@/hooks/useViewStyle';
import { VIEW_STYLE_LABELS, type ViewStyle } from '@/types/database';

interface ViewStyleToggleProps {
  boardId: string;
  viewId: string | null | undefined;
  /**
   * Quando true, oculta o componente. Util quando nao ha view ativa.
   * Default: false.
   */
  disabled?: boolean;
}

/**
 * Segmented control LFPro / Notion para alternar o estilo visual da view ativa
 * da database. Persiste em board_views.config.style.
 *
 * UX:
 *  - Dois botoes lado a lado (LFPro / Notion), o ativo com bg-background text-foreground
 *  - Os 2 botoes sao desabilitados durante mutation pra evitar clicks duplos
 *  - Tooltip nativo via title= (mantem MVP simples)
 *
 * Posicionado em DatabaseViewTabs apos as tabs, antes do botao "+".
 */
const ViewStyleToggle: React.FC<ViewStyleToggleProps> = ({ boardId, viewId, disabled }) => {
  const { style, setStyle, isUpdating } = useViewStyle(boardId, viewId);

  if (disabled || !viewId) return null;

  const options: ViewStyle[] = ['lfpro', 'notion'];

  return (
    <div
      role="group"
      aria-label="Estilo visual da view"
      className="flex items-center gap-0.5 ml-1 p-0.5 rounded-md bg-muted border border-border shrink-0"
    >
      {options.map((opt) => {
        const isActive = style === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={isUpdating || isActive}
            onClick={() => {
              if (isActive) return;
              setStyle(opt);
            }}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title={`Estilo ${VIEW_STYLE_LABELS[opt]}`}
            aria-pressed={isActive}
          >
            {VIEW_STYLE_LABELS[opt]}
          </button>
        );
      })}
    </div>
  );
};

export default ViewStyleToggle;
