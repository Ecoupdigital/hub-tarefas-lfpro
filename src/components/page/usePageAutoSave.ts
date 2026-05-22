import { useCallback, useEffect, useRef, useState } from 'react';
import { useUpdatePageContent } from '@/hooks/useCrudMutations';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UsePageAutoSaveOptions {
  pageId: string;
  debounceMs?: number;
}

/**
 * Hook de auto-save para conteudo de pagina.
 * Acumula um Block[] pendente e dispara mutation 1.5s apos ultima mudanca.
 * Retorna status para o header mostrar "Salvando..." / "Salvo".
 */
export function usePageAutoSave({ pageId, debounceMs = 1500 }: UsePageAutoSaveOptions) {
  const mutation = useUpdatePageContent();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<unknown[] | null>(null);
  const [status, setStatus] = useState<AutoSaveStatus>('idle');

  const flush = useCallback(async () => {
    if (!pendingRef.current) return;
    if (!pageId) return;
    const content = pendingRef.current;
    pendingRef.current = null;
    setStatus('saving');
    try {
      await mutation.mutateAsync({ pageId, content });
      setStatus('saved');
      // Volta para idle apos 2s para o badge "Salvo" sumir naturalmente.
      setTimeout(() => {
        setStatus((s) => (s === 'saved' ? 'idle' : s));
      }, 2000);
    } catch {
      setStatus('error');
    }
  }, [mutation, pageId]);

  const schedule = useCallback(
    (blocks: unknown[]) => {
      pendingRef.current = blocks;
      setStatus('pending');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, debounceMs);
    },
    [flush, debounceMs]
  );

  // Flush ao desmontar (so se houver pendente). Garante que nao perdemos
  // edicoes quando o usuario navega antes do debounce expirar.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (pendingRef.current) {
        void flush();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { schedule, status, flush };
}
