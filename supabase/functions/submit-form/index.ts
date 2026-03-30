import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Rate Limiting (in-memory, per Edge Function instance) ---
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 10 // max submissions per IP per window
const ipSubmissions = new Map<string, number[]>()

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.headers.get('x-real-ip') || 'unknown'
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = ipSubmissions.get(ip) || []

  // Remove entries outside the current window
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  ipSubmissions.set(ip, recent)

  if (recent.length >= RATE_LIMIT_MAX) {
    return true
  }

  recent.push(now)
  return false
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Rate limit check (after CORS preflight, before any DB work)
    const clientIp = getClientIp(req)
    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Muitos envios. Aguarde um momento antes de tentar novamente.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { slug, itemName, values } = await req.json() as {
      slug: string
      itemName: string
      values: Record<string, unknown>
    }

    if (!slug || !itemName?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados incompletos: slug e itemName sao obrigatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Input validation: limit itemName length and values key count
    const sanitizedItemName = itemName.trim().slice(0, 500)

    if (values && typeof values === 'object' && Object.keys(values).length > 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'Limite de campos excedido. Maximo de 50 campos por envio.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar client com service role (server-side apenas — NUNCA expor esta chave ao cliente)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Buscar o formulario pelo slug
    const { data: form, error: formError } = await supabase
      .from('board_forms')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (formError || !form) {
      return new Response(
        JSON.stringify({ success: false, error: 'Formulario nao encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Verificar se o formulario esta ativo
    if (!form.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Este formulario nao esta aceitando respostas no momento' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Criar o item no board usando a service role key
    const { data: newItem, error: itemError } = await supabase
      .from('items')
      .insert({
        board_id: form.board_id,
        group_id: form.target_group_id,
        name: sanitizedItemName,
        position: Date.now(),
      })
      .select()
      .single()

    if (itemError || !newItem) {
      console.error('Erro ao criar item:', itemError)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao registrar sua resposta. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Inserir column_values para cada campo preenchido
    const columnValues = Object.entries(values || {})
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([columnId, value]) => ({
        item_id: newItem.id,
        column_id: columnId,
        value,
      }))

    if (columnValues.length > 0) {
      const { error: cvError } = await supabase
        .from('column_values')
        .insert(columnValues)

      if (cvError) {
        // Nao bloquear o sucesso por erro em column_values — o item ja foi criado
        console.error('Erro ao inserir column_values:', cvError)
      }
    }

    return new Response(
      JSON.stringify({ success: true, itemId: newItem.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('submit-form Edge Function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno. Tente novamente em instantes.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
