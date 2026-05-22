import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Upload de imagem para o bucket `attachments` do Supabase Storage,
 * compativel com a API `uploadFile` do BlockNote (`(file: File) => Promise<string>`).
 *
 * Path: `{userId}/page-{pageId}/{timestamp}-{safeFilename}`
 *
 * Reusa o bucket existente (ver supabase/migrations/20260408211000_create_attachments_bucket.sql).
 * RLS atual permite INSERT por authenticated, SELECT por anon (public read).
 * Nao cria bucket novo por decisao do CONTEXT.md do plano 01-08.
 *
 * Retorna URL publica para uso no bloco `image` do BlockNote.
 */
export function usePageImageUpload(pageId: string) {
  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('Usuario nao autenticado');
      if (!pageId) throw new Error('Pagina sem identificador');

      // Sanitize filename: remove acentos, espacos e caracteres especiais.
      const safeName = file.name
        .normalize('NFD')
        // Remove diacriticos (combining marks U+0300 - U+036F)
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .toLowerCase();
      const timestamp = Date.now();
      const path = `${userId}/page-${pageId}/${timestamp}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('attachments').getPublicUrl(path);
      return data.publicUrl;
    },
    [pageId]
  );

  return uploadImage;
}
