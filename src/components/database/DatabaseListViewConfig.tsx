import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useUpdateBoardViewConfig } from '@/hooks/useBoardViews';
import type { Column } from '@/types/board';
import { toast } from 'sonner';

interface DatabaseListViewConfigProps {
  viewId: string;
  columns: Column[];
  visibleProps: string[];
  /**
   * Extras de config que ja existem no `board_views.config` e devem ser preservados
   * ao salvar (filters, sort, group_by etc.). Default {}.
   */
  baseConfig?: Record<string, unknown>;
}

/**
 * Popover de config da DatabaseListView: checkboxes pra escolher quais columns
 * aparecem como chips abaixo do titulo. Persiste em board_views.config.visibleProps.
 */
const DatabaseListViewConfig: React.FC<DatabaseListViewConfigProps> = ({
  viewId,
  columns,
  visibleProps,
  baseConfig = {},
}) => {
  const updateConfig = useUpdateBoardViewConfig();

  const toggleProp = async (columnId: string) => {
    const newVisible = visibleProps.includes(columnId)
      ? visibleProps.filter((id) => id !== columnId)
      : [...visibleProps, columnId];

    try {
      await updateConfig.mutateAsync({
        viewId,
        config: { ...baseConfig, visibleProps: newVisible },
      });
    } catch (err) {
      console.error('Erro ao salvar config da view:', err);
      toast.error('Erro ao salvar configuracao da view');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Configurar props visiveis"
          title="Configurar props visiveis"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" align="end">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1.5">
          Props visiveis
        </p>
        {columns.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            Nenhuma coluna disponivel.
          </p>
        ) : (
          <div className="space-y-0.5 max-h-[260px] overflow-y-auto">
            {columns.map((col) => (
              <label
                key={col.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
              >
                <Checkbox
                  checked={visibleProps.includes(col.id)}
                  onCheckedChange={() => toggleProp(col.id)}
                  disabled={updateConfig.isPending}
                />
                <span className="truncate flex-1">{col.title}</span>
                <span className="text-[10px] uppercase text-muted-foreground/70">
                  {col.type}
                </span>
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default DatabaseListViewConfig;
