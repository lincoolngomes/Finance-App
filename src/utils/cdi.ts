/**
 * Utilitário para buscar CDI histórico da API do Banco Central
 */

interface CDIData {
  data: string
  valor: string
}

// Cache em memória para evitar múltiplas requisições
const cdiCache = new Map<string, number>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 horas

/**
 * Busca CDI acumulado entre duas datas
 * Usa API do Banco Central (SGS - Sistema Gerenciador de Séries Temporais)
 * Série 12: CDI
 */
export async function buscarCDIAcumulado(dataInicio: Date, dataFim: Date): Promise<number> {
  const cacheKey = `${dataInicio.toISOString()}_${dataFim.toISOString()}`
  
  // Verificar cache
  if (cdiCache.has(cacheKey)) {
    console.log('📦 CDI encontrado no cache')
    return cdiCache.get(cacheKey)!
  }

  try {
    // Formatar datas no formato dd/MM/yyyy
    const dataInicioStr = formatarData(dataInicio)
    const dataFimStr = formatarData(dataFim)

    console.log(`🔍 Buscando CDI do Banco Central: ${dataInicioStr} a ${dataFimStr}`)

    // API do Banco Central - Série 12 (CDI)
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${dataInicioStr}&dataFinal=${dataFimStr}`

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Erro na API do BC: ${response.status}`)
    }

    const dados: CDIData[] = await response.json()

    if (!dados || dados.length === 0) {
      console.warn('⚠️ Nenhum dado de CDI retornado, usando taxa fixa')
      return 13.65 // Taxa atual como fallback
    }

    // Calcular CDI acumulado (juros compostos)
    let fatorAcumulado = 1
    
    for (const item of dados) {
      const taxaDiaria = parseFloat(item.valor) / 100
      fatorAcumulado *= (1 + taxaDiaria)
    }

    // Converter para taxa equivalente anual
    const diasUteis = dados.length
    const taxaAnual = (Math.pow(fatorAcumulado, 252 / diasUteis) - 1) * 100

    console.log(`✅ CDI calculado: ${taxaAnual.toFixed(2)}% a.a. (${diasUteis} dias úteis)`)

    // Salvar no cache
    cdiCache.set(cacheKey, taxaAnual)

    return taxaAnual

  } catch (error) {
    console.error('❌ Erro ao buscar CDI:', error)
    // Retornar taxa fixa atual como fallback
    return 13.65
  }
}

/**
 * Formata data no formato dd/MM/yyyy para API do BC
 */
function formatarData(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const ano = data.getFullYear()
  return `${dia}/${mes}/${ano}`
}

/**
 * Limpa o cache de CDI (útil para testes)
 */
export function limparCacheCDI() {
  cdiCache.clear()
  console.log('🗑️ Cache de CDI limpo')
}
