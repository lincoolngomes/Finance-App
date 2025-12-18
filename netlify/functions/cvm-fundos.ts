import type { Handler } from '@netlify/functions'
/**
 * Netlify Function para buscar dados de fundos de investimento na CVM
 * 
 * API pública da CVM: https://dados.cvm.gov.br/
 */

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' }),
    }
  }

  try {
    const cnpj = event.queryStringParameters?.cnpj

    if (!cnpj) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'CNPJ é obrigatório' }),
      }
    }

    // Remove formatação do CNPJ
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '')

    console.log('🔍 Buscando fundo CVM:', cnpjLimpo)

    // API pública da CVM - Informações Diárias de Fundos
    // Endpoint: https://dados.cvm.gov.br/dados/FI/DOC/INF_DIARIO/DADOS/
    
    // Buscar arquivo mais recente (último dia útil)
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    
    // A CVM disponibiliza arquivos CSV com dados diários
    // Formato: inf_diario_fi_YYYYMM.csv
    const url = `https://dados.cvm.gov.br/dados/FI/DOC/INF_DIARIO/DADOS/inf_diario_fi_${ano}${mes}.csv`

    console.log('📥 Baixando arquivo CVM:', url)

    // TODO: Implementar parser CSV e busca do fundo
    // Por enquanto, retorna dados simulados
    
    const mockData = {
      cnpj: cnpjLimpo,
      nome: 'Fundo de Investimento Simulado',
      valorCota: 1.523456,
      dataReferencia: new Date().toISOString().split('T')[0],
      patrimonioLiquido: 150000000.00,
      rentabilidadeMes: 0.85,
      rentabilidadeAno: 10.25,
      classe: 'Renda Fixa',
      tipo: 'Fundo de Investimento',
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(mockData),
    }

  } catch (error) {
    console.error('❌ Erro ao buscar fundo CVM:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro ao buscar dados do fundo',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
    }
  }
}
