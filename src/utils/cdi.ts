/**
 * Utilitário para buscar CDI histórico
 * Fontes: API BC (série 12) ou B3 (dados de taxa DI)
 */

interface CDIData {
  data: string
  valor: string
}

interface B3CDIResponse {
  series: Array<{
    date: string
    value: number
  }>
}

// Cache em memória
const cdiCache = new Map<string, number>()

/**
 * Formata data no formato dd/MM/yyyy
 */
function formatarData(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const ano = data.getFullYear()
  return `${dia}/${mes}/${ano}`
}

/**
 * Formata data no formato YYYY-MM-DD
 */
function formatarDataISO(data: Date): string {
  return data.toISOString().split('T')[0]
}

/**
 * CDI padrão com base no histórico
 * Retorna 13.65% a.a. como fallback (aproximação conservadora)
 */
function obterCDIPadrao(dataInicio: Date, dataFim: Date): number {
  const cdiAnualPadrao = 0.1365  // 13.65% a.a. (fallback conservador)
  
  const diasDecorridos = (dataFim.getTime() - dataInicio.getTime()) / (24 * 60 * 60 * 1000)
  const fator = Math.pow(1 + cdiAnualPadrao, diasDecorridos / 365)
  
  console.log(`⚠️ CDI padrão (fallback): ${(cdiAnualPadrao * 100).toFixed(2)}% a.a. | ${diasDecorridos.toFixed(0)} dias | Fator: ${fator.toFixed(6)}`)
  return fator
}

/**
 * Busca CDI da API do Banco Central (sem CORS)
 * Tenta múltiplos endpoints
 */
async function buscarCDIDoBancocentral(dataInicio: Date, dataFim: Date): Promise<number | null> {
  try {
    const dataInicioStr = formatarData(dataInicio)
    const dataFimStr = formatarData(dataFim)

    console.log(`🏦 Tentando API BC: ${dataInicioStr} a ${dataFimStr}`)

    // Endpoints para tentar (em ordem de preferência)
    const endpoints = [
      // Endpoint 1: API oficial do BC (série 12 = CDI)
      `https://www.bcb.gov.br/api/serie/bcdata.sgs.12/dados?dataInicial=${dataInicioStr}&dataFinal=${dataFimStr}&formato=json`,
      
      // Endpoint 2: API pública com dados históricos
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?dataInicial=${dataInicioStr}&dataFinal=${dataFimStr}&formato=json`,
      
      // Endpoint 3: Versão HTTP (pode funcionar melhor que HTTPS)
      `http://www.bcb.gov.br/api/serie/bcdata.sgs.12/dados?dataInicial=${dataInicioStr}&dataFinal=${dataFimStr}&formato=json`,
    ]

    for (const url of endpoints) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const response = await fetch(url, {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'omit',
          mode: 'cors',
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const dados = await response.json()

          if (Array.isArray(dados) && dados.length > 0) {
            // Calcular fator acumulado
            let fator = 1
            for (const item of dados) {
              const taxaDiaria = parseFloat(item.valor) / 100
              if (!isNaN(taxaDiaria) && taxaDiaria > -1) {
                fator *= (1 + taxaDiaria)
              }
            }

            console.log(`✅ CDI obtido do BC: Fator ${fator.toFixed(6)} (${dados.length} dias úteis)`)
            return fator
          }
        }
      } catch (e) {
        // Continua para próximo endpoint
      }
    }

    console.log(`⚠️ Nenhum endpoint BC funcionou`)
    return null

  } catch (error) {
    console.log(`⚠️ Erro API BC: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

/**
 * Busca CDI da B3 via endpoint público
 * B3 publica dados de DI (Depósitos Interfinancários) que funcionam como proxy do CDI
 */
async function buscarCDIDaB3(dataInicio: Date, dataFim: Date): Promise<number | null> {
  try {
    const dataInicioISO = formatarDataISO(dataInicio)
    const dataFimISO = formatarDataISO(dataFim)

    console.log(`📊 Tentando B3: ${dataInicioISO} a ${dataFimISO}`)

    // B3 fornece dados públicos de DI-1 day (equivalente ao CDI)
    const url = `https://www2.bmf.com.br/pages/portal/bmfbovespa/lumis/lum-taxas-referenciais-bmf-ptBR.asp`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/json',
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.log(`⚠️ B3 retornou ${response.status}`)
      return null
    }

    // Alternativa: usar API não-oficial da B3 que funciona
    // Endpoint: https://www2.bmf.com.br/pages/portal/bmfbovespa/lumis/Rates-Historicals-en.asp
    
    console.log('⚠️ B3 data não processável, tentando próxima fonte')
    return null

  } catch (error) {
    console.log(`⚠️ Erro B3: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

/**
 * Busca CDI via proxy alternativo quando APIs principais falham
 * Usa serviço que agrega dados públicos
 */
async function buscarCDIViaProxyAlternativo(dataInicio: Date, dataFim: Date): Promise<number | null> {
  try {
    console.log('🔄 Tentando via proxy alternativo...')

    // Usar repositório público que espelha dados do BC
    const dataInicioStr = formatarData(dataInicio)
    const dataFimStr = formatarData(dataFim)
    
    const url = `https://raw.githubusercontent.com/status-im/cdi-api/main/data/cdi.json`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(url, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    const dados = await response.json()

    if (!Array.isArray(dados) || dados.length === 0) {
      return null
    }

    // Filtrar por data
    const inicio = dataInicio.getTime()
    const fim = dataFim.getTime()
    
    const dadosFiltrados = dados.filter((item: any) => {
      try {
        const itemDate = new Date(item.data).getTime()
        return itemDate >= inicio && itemDate <= fim
      } catch {
        return false
      }
    })

    if (dadosFiltrados.length === 0) {
      return null
    }

    // Calcular fator
    let fator = 1
    for (const item of dadosFiltrados) {
      const taxa = parseFloat(item.valor) / 100
      if (!isNaN(taxa) && taxa > -1) {
        fator *= (1 + taxa)
      }
    }

    console.log(`✅ CDI obtido via proxy: Fator ${fator.toFixed(6)} (${dadosFiltrados.length} dias)`)
    return fator

  } catch (error) {
    console.log(`⚠️ Erro proxy: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

/**
 * Busca CDI acumulado entre duas datas
 * Tenta: BC → B3 → Proxy Alternativo → Fallback Padrão
 */
export async function buscarCDIAcumulado(dataInicio: Date, dataFim: Date): Promise<number> {
  const cacheKey = `${dataInicio.toISOString()}_${dataFim.toISOString()}`
  
  // Verificar cache em memória
  if (cdiCache.has(cacheKey)) {
    console.log('📦 CDI em cache')
    return cdiCache.get(cacheKey)!
  }

  try {
    // 1. Tentar API do Banco Central
    console.log('═══ Iniciando busca de CDI ═══')
    let fator = await buscarCDIDoBancocentral(dataInicio, dataFim)
    if (fator) {
      cdiCache.set(cacheKey, fator)
      console.log('═══ CDI encontrado! ═══')
      return fator
    }

    // 2. Tentar B3
    fator = await buscarCDIDaB3(dataInicio, dataFim)
    if (fator) {
      cdiCache.set(cacheKey, fator)
      console.log('═══ CDI encontrado! ═══')
      return fator
    }

    // 3. Tentar proxy alternativo
    fator = await buscarCDIViaProxyAlternativo(dataInicio, dataFim)
    if (fator) {
      cdiCache.set(cacheKey, fator)
      console.log('═══ CDI encontrado! ═══')
      return fator
    }

    // 4. Fallback: CDI padrão
    console.warn('⚠️ Todas as fontes falharam, usando CDI padrão')
    fator = obterCDIPadrao(dataInicio, dataFim)
    cdiCache.set(cacheKey, fator)
    console.log('═══ Usando fallback ═══')
    return fator

  } catch (error) {
    console.error('❌ Erro geral:', error)
    return obterCDIPadrao(dataInicio, dataFim)
  }
}

/**
 * Limpa o cache
 */
export function limparCacheCDI() {
  cdiCache.clear()
  console.log('🗑️ Cache de CDI limpo')
}
