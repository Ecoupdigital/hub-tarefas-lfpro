import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUndoRedoContext, UndoRedoAction } from '@/context/UndoRedoContext';
import { toast } from 'sonner';

export const useUndoRedo = () => {
  const { pushAction, undo: undoFromStack, redo: redoFromStack, canUndo, canRedo } = useUndoRedoContext();
  const qc = useQueryClient();

  const applyAction = useCallback(async (action: UndoRedoAction, isUndo: boolean) => {
    const value = isUndo ? action.oldValue : action.newValue;

    try {
      switch (action.type) {
        case 'value_change': {
          const columnId = action.metadata?.columnId as string | undefined;
          if (columnId) {
            if (value === null || value === undefined) {
              await supabase.from('column_values').delete()
                .eq('item_id', action.entityId)
                .eq('column_id', columnId);
            } else {
              await supabase.from('column_values').upsert(
                { item_id: action.entityId, column_id: columnId, value: value as never },
                { onConflict: 'item_id,column_id' }
              );
            }
            qc.invalidateQueries({ queryKey: ['column_values'] });
          }
          break;
        }
        case 'item_rename': {
          const { error } = await supabase.from('items').update({ name: value as string }).eq('id', action.entityId);
          if (error) throw error;
          qc.invalidateQueries({ queryKey: ['items'] });
          break;
        }
        case 'item_move': {
          const { error } = await supabase.from('items').update({ group_id: value as string }).eq('id', action.entityId);
          if (error) throw error;
          qc.invalidateQueries({ queryKey: ['items'] });
          break;
        }
        case 'item_delete': {
          // Undo delete = restore to active (item foi soft-deleted — column_values ainda existem no banco)
          // Redo delete = set to deleted novamente
          const newState = isUndo ? 'active' : 'deleted';
          const { error } = await supabase.from('items').update({ state: newState }).eq('id', action.entityId);
          if (error) throw error;
          qc.invalidateQueries({ queryKey: ['items'] });
          qc.invalidateQueries({ queryKey: ['trash-items'] });
          break;
        }
        case 'item_create': {
          // Undo create = soft delete; Redo create = restore to active
          const newState = isUndo ? 'deleted' : 'active';
          const { error } = await supabase.from('items').update({ state: newState }).eq('id', action.entityId);
          if (error) throw error;
          qc.invalidateQueries({ queryKey: ['items'] });
          qc.invalidateQueries({ queryKey: ['trash-items'] });
          break;
        }
        case 'batch_value_change': {
          const changes = action.batchChanges ?? [];
          await Promise.allSettled(
            changes.map(({ itemId, columnId, oldValue, newValue }) => {
              const val = isUndo ? oldValue : newValue;
              if (val === null || val === undefined) {
                return supabase.from('column_values').delete()
                  .eq('item_id', itemId)
                  .eq('column_id', columnId);
              }
              return supabase.from('column_values').upsert(
                { item_id: itemId, column_id: columnId, value: val as never },
                { onConflict: 'item_id,column_id' }
              );
            })
          );
          qc.invalidateQueries({ queryKey: ['column_values'] });
          break;
        }
      }
    } catch (err) {
      console.error('Undo/Redo error:', err);
      toast.error('Erro ao desfazer/refazer acao');
    }
  }, [qc]);

  const undo = useCallback(async () => {
    const action = undoFromStack();
    if (action) {
      await applyAction(action, true);
      toast.success('Acao desfeita');
    }
  }, [undoFromStack, applyAction]);

  const redo = useCallback(async () => {
    const action = redoFromStack();
    if (action) {
      await applyAction(action, false);
      toast.success('Acao refeita');
    }
  }, [redoFromStack, applyAction]);

  return { undo, redo, canUndo, canRedo, pushAction };
};
