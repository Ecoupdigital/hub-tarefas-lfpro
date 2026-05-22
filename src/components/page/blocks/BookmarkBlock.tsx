import React, { useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { ExternalLink, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Bloco custom BlockNote 'bookmark' - card de preview de URL.
 *
 * Render (3 estados visuais):
 *  - Erro: boardId vazio -> placeholder destrutivo (caso teorico, criacao sempre passa URL)
 *  - Sem metadata (so URL ou fetch falhou): card minimo com favicon generico + URL como link + botao refresh
 *  - Com metadata: card horizontal com title/description/image + favicon/site_name + botao refresh
 *
 * Click no card abre URL em nova aba. Botao "Atualizar preview" re-chama Edge Function
 * fetch-url-metadata e atualiza props do bloco (cacheia metadata no JSON do documento).
 *
 * Props serializadas no JSON do documento BlockNote:
 *  - url, title, description, image, favicon, site_name, fetched_at
 *
 * content: 'none' -> bloco atomico (sem texto editavel dentro).
 * contentEditable={false} no wrapper isola DOM interno do ProseMirror.
 *
 * IMPORTANTE: createReactBlockSpec retorna factory na API v0.51 do BlockNote.
 * Para usar no schema, invocar como `BookmarkBlock()` (ver blocknote-schema.ts).
 */

export const BookmarkBlock = createReactBlockSpec(
  {
    type: 'bookmark' as const,
    propSchema: {
      url: { default: '' as string },
      title: { default: '' as string },
      description: { default: '' as string },
      image: { default: '' as string },
      favicon: { default: '' as string },
      site_name: { default: '' as string },
      fetched_at: { default: '' as string },
    },
    content: 'none',
  },
  {
    render: (props) => (
      <BookmarkView block={props.block} editor={props.editor} />
    ),
  },
);

interface BookmarkPropsShape {
  url: string;
  title: string;
  description: string;
  image: string;
  favicon: string;
  site_name: string;
  fetched_at: string;
}

const BookmarkView: React.FC<{ block: unknown; editor: unknown }> = ({ block, editor }) => {
  const [refreshing, setRefreshing] = useState(false);
  // O bloco real tem tipos generics pesados do BlockNote. Acessamos via narrowing manual.
  const b = block as { id: string; type: string; props: BookmarkPropsShape };
  const ed = editor as {
    updateBlock: (
      blockOrId: unknown,
      update: { type: 'bookmark'; props: Partial<BookmarkPropsShape> },
    ) => void;
  };
  const p = b.props;

  const handleRefresh = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!p.url || refreshing) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-url-metadata', {
        body: { url: p.url },
      });
      if (error) throw error;
      const meta = data as Partial<BookmarkPropsShape>;
      ed.updateBlock(b, {
        type: 'bookmark',
        props: {
          url: p.url,
          title: meta.title ?? '',
          description: meta.description ?? '',
          image: meta.image ?? '',
          favicon: meta.favicon ?? '',
          site_name: meta.site_name ?? '',
          fetched_at: meta.fetched_at ?? new Date().toISOString(),
        },
      });
      toast.success('Preview atualizado');
    } catch (err) {
      console.error('Bookmark refresh error:', err);
      toast.error('Erro ao atualizar preview');
    } finally {
      setRefreshing(false);
    }
  };

  if (!p.url) {
    return (
      <div
        contentEditable={false}
        className="my-3 border border-destructive/30 rounded-md p-3 text-sm text-destructive bg-destructive/5 not-prose"
      >
        Bookmark invalido (URL ausente).
      </div>
    );
  }

  // Fallback se nao tem metadata visivel (loading inicial, fetch falhou ou pagina sem OG).
  const hasMetadata = !!p.title || !!p.description || !!p.image;
  let hostname = '';
  try {
    hostname = new URL(p.url).hostname;
  } catch {
    hostname = p.url;
  }

  if (!hasMetadata) {
    return (
      <div
        contentEditable={false}
        className="my-3 border border-border rounded-md p-3 flex items-center gap-2 bg-card hover:bg-muted/30 transition-colors not-prose"
      >
        {p.favicon ? (
          <img
            src={p.favicon}
            alt=""
            className="w-4 h-4 rounded-sm shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline truncate flex-1 text-sm"
        >
          {p.url}
        </a>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-50"
          title="Atualizar preview"
          aria-label="Atualizar preview"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div
      contentEditable={false}
      className="my-3 border border-border rounded-md bg-card overflow-hidden flex hover:bg-muted/20 transition-colors group/bookmark not-prose"
    >
      <a
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex min-w-0 p-3 gap-3"
      >
        <div className="flex-1 min-w-0">
          {p.title && (
            <h4 className="font-semibold text-sm text-foreground truncate mb-1">
              {p.title}
            </h4>
          )}
          {p.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {p.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {p.favicon && (
              <img
                src={p.favicon}
                alt=""
                className="w-3.5 h-3.5 rounded-sm shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <span className="truncate">{p.site_name || hostname}</span>
            <ExternalLink className="w-3 h-3 ml-auto shrink-0" />
          </div>
        </div>
        {p.image && (
          <img
            src={p.image}
            alt=""
            className="w-24 h-24 object-cover rounded flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </a>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className="self-start mt-2 mr-2 p-1 rounded hover:bg-muted text-muted-foreground opacity-0 group-hover/bookmark:opacity-100 transition-opacity disabled:opacity-50"
        title="Atualizar preview"
        aria-label="Atualizar preview"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};
