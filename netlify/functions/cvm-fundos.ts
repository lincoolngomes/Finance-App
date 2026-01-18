import type { Handler } from '@netlify/functions'
/**
 * Netlify Function para buscar dados de fundos de investimento
 * 
 * Estratégia:
 * 1. Tenta API OpenData da CVM
 * 2. Fallback para base local de fundos conhecidos
 * 3. Retorna 404 se não encontrado (ativa modo manual)
 * 
 * Query params: ?cnpj=XXXX&data=YYYY-MM-DD (data é opcional)
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
    const dataAplicacao = event.queryStringParameters?.data

    if (!cnpj) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'CNPJ é obrigatório' }),
      }
    }

    const cnpjLimpo = cnpj.replace(/[^\d]/g, '')
    console.log('🔍 Buscando fundo CVM:', cnpjLimpo, dataAplicacao ? `na data ${dataAplicacao}` : '')

    // Base local de fundos conhecidos (para testes e fallback)
    const fundosLocais: Record<string, any> = {
      '37110110000116': {
        cnpj: '37.110.110/0001-16',
        nome: 'Fundo Previdência Privada',
        valorCota: 10.5234,
        dataReferencia: '15/01/2026',
        patrimonioLiquido: 150000000,
      },
      // Adicione mais fundos conforme necessário
    }

    // Verificar na base local
    let fundoEncontrado = fundosLocais[cnpjLimpo]

    if (fundoEncontrado) {
      console.log('✅ Fundo encontrado na base local:', fundoEncontrado.nome, fundoEncontrado)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(fundoEncontrado),
      }
    }

    console.log('⚠️ CNPJ não encontrado na base local:', cnpjLimpo)

    // Tentar API OpenData da CVM como fallback
    console.log('📡 Tentando API OpenData da CVM...')
    try {
      const urlOpenData = `https://dados.cvm.gov.br/api/3/action/datastore_search?resource_id=4c4771d4-53c4-4a87-ba47-6b292ac34e84&q=${cnpjLimpo}&limit=1`
      const response = await fetch(urlOpenData, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const dados: any = await response.json()
        if (dados.result?.records && dados.result.records.length > 0) {
          const registro = dados.result.records[0]
          fundoEncontrado = {
            cnpj: registro.CNPJ_FUNDO || cnpjLimpo,
            nome: registro.DENOM_SOCIAL || 'Fundo CVM',
            valorCota: parseFloat((registro.VL_COTA as string)?.replace(',', '.') || '0'),
            dataReferencia: registro.DT_COMPTC || new Date().toISOString().split('T')[0],
            patrimonioLiquido: parseFloat((registro.VL_PL as string)?.replace(',', '.') || '0'),
          }
          console.log('✅ Fundo encontrado via OpenData:', fundoEncontrado.nome)
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(fundoEncontrado),
          }
        }
      }
    } catch (error) {
      console.debug('OpenData API falhou:', error)
    }

    // Se não encontrou em lugar nenhum
    console.log('❌ Fundo não encontrado. Ativando modo manual.')
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Fundo não encontrado',
        cnpj: cnpjLimpo,
        mensagem: 'O CNPJ não foi encontrado na base de dados. Digite a cota manualmente.',
      }),
    }
  } catch (error) {
    console.error('❌ Erro geral:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro ao processar requisição',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
    }
  }
}

