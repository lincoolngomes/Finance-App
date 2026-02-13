import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_SERIES = new Set(['12', '433', '4189'])

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const serie = url.searchParams.get('serie') || ''
    const dataInicial = url.searchParams.get('dataInicial') || ''
    const dataFinal = url.searchParams.get('dataFinal') || ''
    const formato = url.searchParams.get('formato') || 'json'
    const requestId = crypto.randomUUID()

    console.log('🔎 bacen-proxy request', { requestId, serie, dataInicial, dataFinal, formato })

    if (!ALLOWED_SERIES.has(serie)) {
      return new Response(
        JSON.stringify({ error: 'Serie não permitida', requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!dataInicial || !dataFinal) {
      return new Response(
        JSON.stringify({ error: 'dataInicial e dataFinal são obrigatórias', requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const target = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?formato=${formato}&dataInicial=${encodeURIComponent(dataInicial)}&dataFinal=${encodeURIComponent(dataFinal)}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    let response: Response
    try {
      response = await fetch(target, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'finance-app-bacen-proxy',
        },
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const text = await response.text()

    if (!response.ok) {
      console.error('❌ bacen-proxy upstream error', {
        requestId,
        status: response.status,
        body: text.slice(0, 500)
      })
      return new Response(text || JSON.stringify({ error: 'Erro ao consultar BC', requestId }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': response.headers.get('content-type') || 'application/json' },
      })
    }

    return new Response(text, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    })
  } catch (error) {
    console.error('❌ bacen-proxy erro interno', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
