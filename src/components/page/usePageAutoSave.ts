import { useCallback, useEffect, useRef, useState } from 'react';
import { useUpdatePageContent } from '@/hooks/useCrudMutations';
import { useCreatePageVersion } from '@/hooks/usePageVersions';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UsePageAutoSaveOptions {
  pageId: string;
  debounceMs?: number;
  /**
   * Callback chamado quando um snapshot e tentado. O hook le o titulo atual via
   * ref para nao virar dependencia que muda a cada render do consumidor.
   */
  getCurrentTitle?: () => string;
}

// Snapshot periodico em page_versions. A cada 5 saves OU 5 minutos
// (o que vier primeiro). Storage: ~50KB por snapshot tipico, 5 por sessao -> 250KB.
const SNAPSHOT_EVERY_N_SAVES = 5;
const SNAPSHOT_MAX_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Hook de auto-save para conteudo de pagina.
 * Acumula um Block[] pendente e dispara mutation 1.5s apos ultima mudanca.
 * Retorna status para o header mostrar "Salvando..." / "Salvo".
 *
 * Versionamento (Plano 01-07): apos cada save bem-sucedido, conta um tick.
 * A cada 5 ticks OU 5 minutos sem snapshot, dispara um insert em page_versions.
 * Falha de snapshot e silenciosa (snapshot perdido nao quebra edicao).
 */
export function usePageAutoSave({
  pageId,
  debounceMs = 1500,
  getCurrentTitle,
}: UsePageAutoSaveOptions) {
  const mutation = useUpdatePageContent();
  const createSnapshot = useCreatePageVersion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<unknown[] | null>(null);
  const [status, setStatus] = useState<AutoSaveStatus>('idle');

  // Counters de snapshot. Refs porque nao precisam disparar render.
  const saveCountRef = useRef(0);
  const lastSnapshotRef = useRef<number>(Date.now());

  // Ref pro getCurrentTitle pra nao virar dependencia volatil.
  const getCurrentTitleRef = useRef(getCurrentTitle);
  useEffect(() => {
    getCurrentTitleRef.current = getCurrentTitle;
  }, [getCurrentTitle]);

  const flush = useCallback(async () => {
    if (!pendingRef.current) return;
    if (!pageId) return;
    const content = pendingRef.current;
    pendingRef.current = null;
    setStatus('saving');
    try {
      await mutation.mutateAsync({ pageId, content });
      setStatus('saved');

      // Apos save bem-sucedido, verifica se e hora de snapshot.
      saveCountRef.current += 1;
      const now = Date.now();
      const elapsed = now - lastSnapshotRef.current;
      if (
        saveCountRef.current >= SNAPSHOT_EVERY_N_SAVES ||
        elapsed >= SNAPSHOT_MAX_INTERVAL_MS
      ) {
        saveCountRef.current = 0;
        lastSnapshotRef.current = now;
        // Fire-and-forget. Falha de snapshot nao deve afetar UX.
        void createSnapshot
          .mutateAsync({
            pageId,
            content,
            title: getCurrentTitleRef.current?.(),
          })
          .catch(() => {
            // Snapshot perdido e aceitavel. O proximo ciclo tenta de novo.
          });
      }

      // Volta para idle apos 2s para o badge "Salvo" sumir naturalmente.
      setTimeout(() => {
        setStatus((s) => (s === 'saved' ? 'idle' : s));
      }, 2000);
    } catch {
      setStatus('error');
    }
  }, [mutation, pageId, createSnapshot]);

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
