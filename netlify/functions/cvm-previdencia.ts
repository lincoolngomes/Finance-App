import type { Handler } from '@netlify/functions'

/**
 * Netlify Function para buscar dados de previdência privada na CVM
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

    const cnpjLimpo = cnpj.replace(/[^\d]/g, '')

    console.log('🔍 Buscando previdência CVM:', cnpjLimpo)

    // TODO: Implementar busca real na CVM
    // Por enquanto, retorna dados simulados
    
    const mockData = {
      cnpj: cnpjLimpo,
      nome: 'Plano de Previdência Simulado',
      valorCota: 2.345678,
      dataReferencia: new Date().toISOString().split('T')[0],
      plano: 'VGBL' as const,
      rentabilidadeMes: 1.02,
      rentabilidadeAno: 12.50,
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(mockData),
    }

  } catch (error) {
    console.error('❌ Erro ao buscar previdência CVM:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro ao buscar dados da previdência',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
    }
  }
}
