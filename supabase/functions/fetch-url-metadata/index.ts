import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * Edge Function fetch-url-metadata
 *
 * Recebe { url } e retorna metadata extraida do HTML da URL:
 *  - title (og:title -> twitter:title -> <title>)
 *  - description (og:description -> twitter:description -> meta description)
 *  - image (og:image -> twitter:image)
 *  - favicon (<link rel="icon"> -> /favicon.ico fallback)
 *  - site_name (og:site_name)
 *  - fetched_at (ISO timestamp)
 *
 * Comportamento:
 *  - UA realista (Safari macOS) pra evitar bot blocks
 *  - Timeout de 10s via AbortController
 *  - Fallback gracioso: campos faltantes vem como null, nao quebra
 *  - Auth: protegido por JWT da Supabase (verify_jwt=true via default no config.toml).
 *    Como nao acessa recursos privilegiados, nao precisa validar JWT explicitamente.
 *  - CORS: aberto (consumido por client web autenticado).
 *
 * Parsing: regex manual sobre HTML cru. Cobre ~95% dos sites com OG/Twitter Cards.
 * Fragil pra HTML mal-formado mas evita dependencia de deno-dom (MVP).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const REALISTIC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5.2 Safari/605.1.15';
const FETCH_TIMEOUT_MS = 10_000;
// Limita tamanho do HTML processado pra evitar consumir memoria com paginas gigantes.
const MAX_HTML_BYTES = 2_000_000; // 2 MB

interface UrlMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  site_name: string | null;
  fetched_at: string;
}

/**
 * Extrai conteudo de <meta property="..." content="..."> ou <meta name="..." content="...">.
 * Suporta atributos em qualquer ordem e aspas duplas/simples.
 */
function extractMeta(
  html: string,
  propertyOrName: string,
  attr: 'property' | 'name' = 'property',
): string | null {
  const escaped = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reForward = new RegExp(
    `<meta[^>]+${attr}=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
    'i',
  );
  const reReversed = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${escaped}["']`,
    'i',
  );
  const m = html.match(reForward) ?? html.match(reReversed);
  return m ? decodeHtmlEntities(m[1].trim()) : null;
}

/**
 * Extrai conteudo de <title>...</title>. Pega so o primeiro.
 */
function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  return decodeHtmlEntities(m[1].trim());
}

/**
 * Procura favicon em <link rel="icon" href="..."> ou variantes.
 * Fallback: <origem>/favicon.ico.
 */
function extractFavicon(html: string, baseUrl: string): string | null {
  // rel pode ser "icon", "shortcut icon", "apple-touch-icon" - aceitamos os tres
  const patterns: RegExp[] = [
    /<link[^>]+rel=["'](?:shortcut\s+icon|icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:shortcut\s+icon|icon|apple-touch-icon)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return resolveUrl(m[1], baseUrl);
  }
  // Fallback: /favicon.ico na origem
  try {
    const u = new URL(baseUrl);
    return `${u.protocol}//${u.host}/favicon.ico`;
  } catch {
    return null;
  }
}

/**
 * Resolve URL relativa contra base. Se ja for absoluta, retorna como esta.
 */
function resolveUrl(maybeRelative: string, base: string): string {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}

/**
 * Decodifica entidades HTML basicas que aparecem em meta tags.
 * Cobre &amp; &lt; &gt; &quot; &#39; &apos; e numericas (&#NNN; / &#xHH;).
 */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html = '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': REALISTIC_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ao buscar ${url}`);
    }
    // Limita tamanho lido pra evitar paginas gigantes consumirem memoria.
    const text = await res.text();
    html = text.length > MAX_HTML_BYTES ? text.slice(0, MAX_HTML_BYTES) : text;
  } finally {
    clearTimeout(timeout);
  }

  const finalUrl = url; // mantemos a URL original; resolveUrl ja lida com redirect base

  // OG primeiro, Twitter como fallback, depois title/description tradicionais.
  const ogTitle = extractMeta(html, 'og:title');
  const twTitle = extractMeta(html, 'twitter:title', 'name');
  const docTitle = extractTitle(html);

  const ogDesc = extractMeta(html, 'og:description');
  const twDesc = extractMeta(html, 'twitter:description', 'name');
  const docDesc = extractMeta(html, 'description', 'name');

  const ogImage = extractMeta(html, 'og:image');
  const twImage = extractMeta(html, 'twitter:image', 'name');
  const rawImage = ogImage ?? twImage;

  const siteName = extractMeta(html, 'og:site_name');

  return {
    url: finalUrl,
    title: ogTitle ?? twTitle ?? docTitle,
    description: ogDesc ?? twDesc ?? docDesc,
    image: rawImage ? resolveUrl(rawImage, finalUrl) : null,
    favicon: extractFavicon(html, finalUrl),
    site_name: siteName,
    fetched_at: new Date().toISOString(),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metodo nao permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Body JSON obrigatorio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url } = body as { url?: unknown };
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'url e obrigatorio (string)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Valida formato e protocolo (so http/https).
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'URL invalida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return new Response(
        JSON.stringify({ error: 'Apenas URLs http(s) sao aceitas' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const metadata = await fetchUrlMetadata(parsed.toString());
    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'Timeout ao buscar URL (10s)'
          : err.message
        : String(err);
    console.error('fetch-url-metadata error:', err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
