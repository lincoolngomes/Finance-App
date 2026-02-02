/**
 * Utilitário para buscar CDI histórico da API do Banco Central
 */

interface CDIData {
  data: string
  valor: string
}

// Cache em memória para evitar múltiplas requisições
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
 * Obtém CDI padrão com base no histórico
 */
function obterCDIPadrao(dataInicio: Date, dataFim: Date): number {
  const cdiPorAno: { [key: number]: number } = {
    2020: 0.0274,
    2021: 0.0402,
    2022: 0.1086,
    2023: 0.1106,
    2024: 0.0885,
    2025: 0.0620,
    2026: 0.0620,
  }

  const anoFim = dataFim.getFullYear()
  const cdiAnual = cdiPorAno[anoFim] || 0.062
  const diasDecorridos = (dataFim.getTime() - dataInicio.getTime()) / (24 * 60 * 60 * 1000)
  const fator = Math.pow(1 + cdiAnual, diasDecorridos / 365)
  
  console.log(`📊 CDI padrão: ${(cdiAnual * 100).toFixed(2)}% a.a. | Fator: ${fator.toFixed(6)}`)
  return fator
}

/**
 * Busca CDI acumulado entre duas datas
 */
export async function buscarCDIAcumulado(dataInicio: Date, dataFim: Date): Promise<number> {
  const cacheKey = `${dataInicio.toISOString()}_${dataFim.toISOString()}`
  
  if (cdiCache.has(cacheKey)) {
    console.log('📦 CDI encontrado no cache')
    return cdiCache.get(cacheKey)!
  }

  try {
    const dataInicioStr = formatarData(dataInicio)
    const dataFimStr = formatarData(dataFim)

    console.log(`🔍 Buscando CDI do Banco Central: ${dataInicioStr} a ${dataFimStr}`)

    // Tentar múltiplas fontes
    const urls = [
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${dataInicioStr}&dataFinal=${dataFimStr}`,
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json`
    ]

    for (const url of urls) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.log(`⚠️ URL ${url.split('?')[0]} retornou ${response.status}`)
          continue
        }

        const dados = await response.json()

        if (!Array.isArray(dados) || dados.length === 0) {
          console.log('⚠️ Nenhum dado encontrado')
          continue
        }

        // Filtrar dados da data se necessário
        let dadosFiltrados = dados
        if (url.includes('dataInicial')) {
          // Se já filtrado pela API, usar direto
          dadosFiltrados = dados
        } else {
          // Se não filtrado, fazer manualmente
          const inicio = dataInicio.getTime()
          const fim = dataFim.getTime()
          dadosFiltrados = dados.filter((item: CDIData) => {
            const [d, m, y] = item.data.split('/').map(Number)
            const itemDate = new Date(y, m - 1, d).getTime()
            return itemDate >= inicio && itemDate <= fim
          })
        }

        if (dadosFiltrados.length === 0) {
          console.log('⚠️ Nenhum dado no período')
          continue
        }

        // Calcular fator acumulado
        let fatorAcumulado = 1
        for (const item of dadosFiltrados) {
          const taxaDiaria = parseFloat(item.valor) / 100
          if (!isNaN(taxaDiaria) && taxaDiaria > -1) {
            fatorAcumulado *= (1 + taxaDiaria)
          }
        }

        console.log(`✅ CDI obtido: Fator ${fatorAcumulado.toFixed(6)} (${dadosFiltrados.length} dias úteis)`)
        cdiCache.set(cacheKey, fatorAcumulado)
        return fatorAcumulado

      } catch (error) {
        console.log(`⚠️ Erro: ${error instanceof Error ? error.message : String(error)}`)
        continue
      }
    }

    // Fallback: CDI padrão
    console.warn('⚠️ API indisponível, usando CDI padrão')
    const fatorPadrao = obterCDIPadrao(dataInicio, dataFim)
    cdiCache.set(cacheKey, fatorPadrao)
    return fatorPadrao

  } catch (error) {
    console.error('❌ Erro geral:', error)
    const fatorPadrao = obterCDIPadrao(dataInicio, dataFim)
    return fatorPadrao
  }
}

/**
 * Limpa o cache
 */
export function limparCacheCDI() {
  cdiCache.clear()
  console.log('🗑️ Cache de CDI limpo')
}
