import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { boardId, itemId, itemName, columnId, oldStatus, newStatus, triggeredByAutomation } = await req.json()

    // Nao disparar se originado por automacao (evitar loops)
    if (triggeredByAutomation) {
      return new Response(
        JSON.stringify({ success: false, reason: 'Skipped: triggered by automation' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar client com service role (server-side apenas — credenciais nunca expostas ao cliente)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar o workspace_id do board
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('workspace_id, name')
      .eq('id', boardId)
      .single()

    if (boardError || !board) {
      return new Response(
        JSON.stringify({ success: false, reason: 'Board not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar configuracao da integracao Slack do workspace
    // config.slack_webhook_url contem a URL — nunca exposta ao cliente
    const { data: integration, error: integError } = await supabase
      .from('integrations')
      .select('config, is_active, id')
      .eq('workspace_id', board.workspace_id)
      .eq('type', 'slack')
      .eq('is_active', true)
      .maybeSingle()

    if (integError || !integration) {
      return new Response(
        JSON.stringify({ success: false, reason: 'No active Slack integration found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const config = integration.config as Record<string, unknown>
    const webhookUrl = config?.webhook_url as string | undefined

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ success: false, reason: 'Missing webhook_url in integration config' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Montar mensagem para o Slack
    const displayOldStatus = oldStatus || '(sem status)'
    const displayNewStatus = newStatus || '(sem status)'
    const displayItemName = itemName || itemId || 'Item'
    const displayBoardName = board.name || boardId

    const message = {
      text: `*LFPro Tasks* — ${displayBoardName}`,
      attachments: [
        {
          color: '#5F3FFF',
          fields: [
            {
              title: 'Item',
              value: displayItemName,
              short: true,
            },
            {
              title: 'Status alterado',
              value: `*${displayOldStatus}* → *${displayNewStatus}*`,
              short: true,
            },
          ],
          footer: 'LFPro Tasks',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    }

    // Enviar POST para o webhook do Slack (com timeout de 5 segundos)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    let slackOk = false
    let slackError: string | null = null

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
        signal: controller.signal,
      })
      slackOk = response.ok
      if (!response.ok) {
        slackError = `HTTP ${response.status}: ${await response.text().catch(() => '')}`
      }
    } catch (fetchErr) {
      slackError = String(fetchErr)
    } finally {
      clearTimeout(timeoutId)
    }

    // Registrar resultado nos logs (fire-and-forget — nao propaga erro)
    await supabase.from('integration_logs').insert({
      integration_id: integration.id,
      event_type: 'status_changed',
      status: slackOk ? 'success' : 'error',
      error_message: slackError,
      metadata: {
        board_id: boardId,
        item_id: itemId,
        item_name: itemName,
        old_status: oldStatus,
        new_status: newStatus,
        column_id: columnId,
      },
    }).catch((logErr: unknown) => {
      console.error('Falha ao registrar integration_log:', logErr)
    })

    return new Response(
      JSON.stringify({ success: slackOk, error: slackError }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
