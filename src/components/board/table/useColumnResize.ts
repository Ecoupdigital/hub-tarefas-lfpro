import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Column } from '@/types/board';

export const useResizeColumnWidth = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, width }: { id: string; width: number }) => {
      const { error } = await supabase.from('columns').update({ width }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['columns'] });
    },
  });
};

export const DEFAULT_COL_WIDTH = 150;

const NAME_COL_WIDTH_KEY = 'lfpro-name-col-width';
export const DEFAULT_NAME_COL_WIDTH = 320;

export const useColumnResize = () => {
  const [resizingWidths, setResizingWidths] = useState<Map<string, number>>(new Map());
  const resizeColumnWidth = useResizeColumnWidth();

  const [nameColumnWidth, setNameColumnWidth] = useState<number>(() => {
    const saved = localStorage.getItem(NAME_COL_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_NAME_COL_WIDTH;
  });

  const getColumnWidth = useCallback((col: Column) => {
    return resizingWidths.get(col.id) ?? col.width ?? DEFAULT_COL_WIDTH;
  }, [resizingWidths]);

  const startResize = useCallback((columnId: string, initialWidth: number, startX: number) => {
    let currentWidth = initialWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      currentWidth = Math.min(600, Math.max(80, initialWidth + delta));
      setResizingWidths(prev => new Map(prev).set(columnId, currentWidth));
    };

    const handleMouseUp = () => {
      // Manter o width no mapa até a mutation confirmar — evita flicker de volta ao tamanho antigo
      resizeColumnWidth.mutate(
        { id: columnId, width: currentWidth },
        {
          onSettled: () => {
            setResizingWidths(prev => {
              const next = new Map(prev);
              next.delete(columnId);
              return next;
            });
          },
        }
      );
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [resizeColumnWidth]);

  const startNameResize = useCallback((startX: number) => {
    const initialWidth = nameColumnWidth;
    let currentWidth = initialWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      currentWidth = Math.min(800, Math.max(200, initialWidth + delta));
      setNameColumnWidth(currentWidth);
    };

    const handleMouseUp = () => {
      localStorage.setItem(NAME_COL_WIDTH_KEY, String(currentWidth));
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [nameColumnWidth]);

  return { getColumnWidth, startResize, nameColumnWidth, startNameResize };
};
