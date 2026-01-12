import type { Handler } from '@netlify/functions'

/**
 * Netlify Function para importar posições do B3 CEI
 * 
 * NOTA: O scraping direto do CEI foi desabilitado por questões de segurança e confiabilidade.
 * Use a alternativa no cliente: importação manual via formulário ou exportação do CEI.
 */

interface B3Credentials {
  cpf: string
  senha: string
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' }),
    }
  }

  try {
    const { cpf, senha }: B3Credentials = JSON.parse(event.body || '{}')

    if (!cpf || !senha) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'CPF e senha são obrigatórios' }),
      }
    }

    // Retornar mensagem informativa em vez de tentar fazer scraping
    return {
      statusCode: 501,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'O importador automático do B3 CEI não está disponível. Por favor, exporte seus dados do CEI em formato CSV e importe manualmente.',
        acoes: [],
        fiis: [],
        etfs: [],
        rendaFixa: [],
        tesouroDireto: [],
        dataImportacao: new Date().toISOString(),
      }),
    }

  } catch (error) {
    console.error('❌ Erro ao processar requisição:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro ao processar a requisição',
        message: 'O importador automático não está disponível no momento',
        success: false,
        acoes: [],
        fiis: [],
        etfs: [],
        rendaFixa: [],
        tesouroDireto: [],
        dataImportacao: new Date().toISOString(),
      }),
    }
  }
}
