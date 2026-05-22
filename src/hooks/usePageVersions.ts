import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PageVersion } from '@/types/page';

/**
 * Lista versoes de uma pagina, ordenadas do mais recente para o mais antigo.
 * Limite de 50 para evitar payload excessivo. Paginacao fica para futuro.
 */
export const usePageVersions = (pageId: string | null) =>
  useQuery({
    queryKey: ['page_versions', pageId],
    enabled: !!pageId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_versions')
        .select('id, page_id, content, title, created_by, created_at')
        .eq('page_id', pageId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PageVersion[];
    },
  });

/**
 * Cria um snapshot (insert) da pagina na tabela page_versions.
 * Disparado por usePageAutoSave (a cada N saves ou intervalo) e
 * tambem antes de um restore (auto-versionamento).
 */
export const useCreatePageVersion = () => {
  const qc = useQueryClient();
  return useMutation({
    retry: 1,
    mutationFn: async ({
      pageId,
      content,
      title,
    }: {
      pageId: string;
      content: unknown[];
      title?: string | null;
    }) => {
      const { data: userResp } = await supabase.auth.getUser();
      const { error } = await supabase.from('page_versions').insert({
        page_id: pageId,
        content: content as never,
        title: title ?? null,
        created_by: userResp.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['page_versions', vars.pageId] });
    },
  });
};

/**
 * Restaura conteudo de uma versao para a page atual.
 * Antes de aplicar, cria um snapshot do estado atual (auto-versionamento),
 * garantindo que nada se perde caso o usuario queira voltar atras.
 */
export const useRestorePageVersion = () => {
  const qc = useQueryClient();
  const createSnapshot = useCreatePageVersion();
  return useMutation({
    retry: 1,
    mutationFn: async ({
      pageId,
      versionContent,
      versionTitle,
      currentContent,
      currentTitle,
    }: {
      pageId: string;
      versionContent: unknown[];
      versionTitle: string | null;
      currentContent: unknown[];
      currentTitle: string;
    }) => {
      // 1. Snapshot do estado atual (fire-and-await para nao perder edicao em andamento).
      await createSnapshot.mutateAsync({
        pageId,
        content: currentContent,
        title: currentTitle,
      });

      // 2. Aplica conteudo + titulo da versao escolhida na page corrente.
      const nextTitle = versionTitle ?? currentTitle;
      const { error } = await supabase
        .from('pages')
        .update({
          content: versionContent as never,
          title: nextTitle,
        })
        .eq('id', pageId);
      if (error) throw error;

      return { content: versionContent, title: nextTitle };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['page', vars.pageId] });
      qc.invalidateQueries({ queryKey: ['page_versions', vars.pageId] });
      qc.invalidateQueries({ queryKey: ['pages'] });
      qc.invalidateQueries({ queryKey: ['all-pages'] });
    },
  });
};
