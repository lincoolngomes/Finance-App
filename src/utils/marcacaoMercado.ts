/**
 * Marcação a Mercado para títulos de renda fixa privada
 * CRI, CRA, Debêntures, etc.
 */

export interface MarcacaoMercado {
  valorMercado: number
  precoUnitario?: number
  percentualVU: number // % do Valor Unitário (PU)
  dataAtualizacao: string
  fonte: 'manual' | 'api' | 'estimado'
}

/**
 * Calcula marcação a mercado usando % do VU (Valor Unitário)
 * Usado para CRI, CRA, Debêntures quando há cotação de mercado secundário
 * 
 * @param valorInvestido - Valor total investido (R$)
 * @param percentualVU - % do Valor Unitário atual (ex: 98.5 = 98.5% do VU)
 * @returns Valor de mercado atual
 */
export function calcularMarcacaoMercadoPorVU(
  valorInvestido: number,
  percentualVU: number
): number {
  // Se percentualVU = 100, valor = valorInvestido
  // Se percentualVU = 98.5, valor = valorInvestido * 0.985
  const valorMercado = valorInvestido * (percentualVU / 100)
  
  console.log('📊 Marcação a Mercado por VU:', {
    valorInvestido,
    percentualVU: percentualVU + '%',
    valorMercado,
    diferenca: valorMercado - valorInvestido,
    variacaoPercentual: ((valorMercado / valorInvestido - 1) * 100).toFixed(2) + '%'
  })
  
  return valorMercado
}

/**
 * Busca cotação de CRI/CRA/Debêntures em plataformas de mercado secundário
 * Nota: Esta é uma estrutura preparada. Na prática, seria necessário:
 * - Integração com plataformas como Investidor10, Quantum, etc.
 * - Ou scraping de plataformas de corretoras
 * - Ou alimentação manual via banco de dados
 */
export async function buscarCotacaoMercadoSecundario(
  codigo: string,
  tipo: 'cri' | 'cra' | 'debenture'
): Promise<MarcacaoMercado | null> {
  try {
    console.log('🔍 Buscando cotação mercado secundário:', { codigo, tipo })
    
    // TODO: Implementar integração real quando disponível
    // Por enquanto, retornar null para usar marcação a curva ou manual
    
    console.warn('⚠️ API de mercado secundário não implementada. Use marcação manual.')
    return null
    
  } catch (error) {
    console.error('❌ Erro ao buscar cotação:', error)
    return null
  }
}

/**
 * Estima marcação a mercado baseada em taxa de mercado vs taxa contratada
 * Fórmula simplificada: Se taxa de mercado > taxa contratada, título vale menos
 * 
 * @param valorInvestido - Valor investido
 * @param taxaContratada - Taxa contratada no título (% a.a.)
 * @param taxaMercadoAtual - Taxa atual do mercado para títulos similares (% a.a.)
 * @param diasAteVencimento - Dias restantes até vencimento
 */
export function estimarMarcacaoMercado(
  valorInvestido: number,
  taxaContratada: number,
  taxaMercadoAtual: number,
  diasAteVencimento: number
): MarcacaoMercado {
  console.log('🧮 Estimando marcação a mercado:', {
    valorInvestido,
    taxaContratada: taxaContratada + '% a.a.',
    taxaMercadoAtual: taxaMercadoAtual + '% a.a.',
    diasAteVencimento
  })
  
  // Calcular valor futuro com taxa contratada
  const anos = diasAteVencimento / 365
  const valorFuturo = valorInvestido * Math.pow(1 + taxaContratada / 100, anos)
  
  // Descontar pelo valor presente usando taxa de mercado atual
  const valorMercado = valorFuturo / Math.pow(1 + taxaMercadoAtual / 100, anos)
  
  const percentualVU = (valorMercado / valorInvestido) * 100
  
  console.log('📉 Resultado estimativa:', {
    valorFuturo: valorFuturo.toFixed(2),
    valorMercado: valorMercado.toFixed(2),
    percentualVU: percentualVU.toFixed(2) + '%',
    diferenca: (valorMercado - valorInvestido).toFixed(2)
  })
  
  return {
    valorMercado,
    percentualVU,
    dataAtualizacao: new Date().toISOString(),
    fonte: 'estimado'
  }
}

/**
 * Exporta para usar em outros lugares
 */
export type TipoMarcacao = 'curva' | 'mercado' | 'manual'

export interface ConfigMarcacao {
  tipo: TipoMarcacao
  percentualVU?: number // Usado quando tipo = 'mercado' ou 'manual'
  dataAtualizacao?: string
}
