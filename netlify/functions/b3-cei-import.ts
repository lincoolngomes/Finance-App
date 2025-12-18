import type { Handler } from '@netlify/functions'

// @ts-ignore
const CeiCrawler = require('cei-crawler')

/**
 * Netlify Function para importar posições do B3 CEI
 * 
 * Esta função faz scraping do portal CEI da B3 usando as credenciais do usuário
 * IMPORTANTE: As credenciais NÃO são armazenadas, apenas usadas na requisição
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

    console.log('🔐 Tentando autenticar no B3 CEI com CPF:', cpf.substring(0, 3) + '.***.***-**')

    // Criar instância do crawler
    const ceiCrawler = new CeiCrawler(cpf, senha, {
      capDates: {
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)), // Último mês
        end: new Date()
      }
    })

    console.log('📥 Buscando dados do CEI...')

    // Buscar dados
    const consolidado = await ceiCrawler.getConsolidado()
    
    console.log('✅ Dados obtidos com sucesso!')

    // Processar e mapear dados
    const acoes: any[] = []
    const fiis: any[] = []
    const etfs: any[] = []
    const rendaFixa: any[] = []
    const tesouroDireto: any[] = []

    // Processar ações e FIIs
    if (consolidado.carteira) {
      for (const item of consolidado.carteira) {
        const posicao = {
          codigo: item.ticker,
          nome: item.nomeEmpresa || item.ticker,
          quantidade: item.quantidade,
          precoMedio: item.precoMedio,
          valorAtual: item.valorAtual || (item.quantidade * item.precoAtual),
          instituicao: item.instituicao || 'B3',
          dataReferencia: new Date().toISOString().split('T')[0],
        }

        // Identificar tipo pelo ticker
        if (item.ticker.endsWith('11')) {
          fiis.push({ ...posicao, tipo: 'fii' as const })
        } else if (item.ticker.startsWith('B') && item.ticker.length === 6) {
          etfs.push({ ...posicao, tipo: 'etf' as const })
        } else {
          acoes.push({ ...posicao, tipo: 'acao' as const })
        }
      }
    }

    // Processar Tesouro Direto
    if (consolidado.tesouroDireto) {
      for (const item of consolidado.tesouroDireto) {
        tesouroDireto.push({
          tipo: 'tesouro_direto' as const,
          codigo: item.titulo,
          nome: item.titulo,
          valorInvestido: item.valorInvestido,
          valorAtual: item.valorAtual || item.valorBruto,
          vencimento: item.dataVencimento,
          taxa: item.taxaContratada || 'N/A',
          tipoRentabilidade: determinarTipoRentabilidade(item.titulo),
          instituicao: 'Tesouro Direto',
          isento_ir: false,
        })
      }
    }

    // Processar Renda Fixa
    if (consolidado.rendaFixa) {
      for (const item of consolidado.rendaFixa) {
        const tipo = determinarTipoRendaFixa(item.produto)
        
        rendaFixa.push({
          tipo,
          codigo: item.produto,
          nome: item.produto,
          valorInvestido: item.valorInvestido,
          valorAtual: item.valorAtual || item.valorBruto,
          vencimento: item.dataVencimento,
          taxa: item.taxaContratada || 'N/A',
          tipoRentabilidade: determinarTipoRentabilidade(item.produto),
          instituicao: item.instituicao || 'N/A',
          isento_ir: ['LCI', 'LCA', 'CRI', 'CRA'].some(t => item.produto.includes(t)),
        })
      }
    }

    const resultData = {
      acoes,
      fiis,
      etfs,
      rendaFixa,
      tesouroDireto,
      success: true,
      message: `Importação concluída! ${acoes.length + fiis.length + etfs.length + rendaFixa.length + tesouroDireto.length} ativos encontrados.`,
      dataImportacao: new Date().toISOString(),
    }

    console.log('📊 Resumo da importação:', {
      acoes: acoes.length,
      fiis: fiis.length,
      etfs: etfs.length,
      rendaFixa: rendaFixa.length,
      tesouroDireto: tesouroDireto.length,
      total: acoes.length + fiis.length + etfs.length + rendaFixa.length + tesouroDireto.length
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(resultData),
    }

  } catch (error) {
    console.error('❌ Erro ao importar do B3:', error)
    
    // Erros comuns
    let errorMessage = 'Erro ao processar importação'
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage = 'CPF ou senha incorretos. Verifique suas credenciais.'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Tempo esgotado. Tente novamente em alguns instantes.'
      } else if (error.message.includes('network')) {
        errorMessage = 'Erro de conexão. Verifique sua internet.'
      } else {
        errorMessage = error.message
      }
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        message: errorMessage,
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

/**
 * Determina o tipo de rentabilidade baseado no nome do título
 */
function determinarTipoRentabilidade(titulo: string): 'pos' | 'pre' | 'ipca' {
  const tituloUpper = titulo.toUpperCase()
  
  if (tituloUpper.includes('IPCA') || tituloUpper.includes('NTN-B')) {
    return 'ipca'
  } else if (tituloUpper.includes('PRE') || tituloUpper.includes('PREFIXADO') || tituloUpper.includes('LTN') || tituloUpper.includes('NTN-F')) {
    return 'pre'
  } else if (tituloUpper.includes('SELIC') || tituloUpper.includes('CDI') || tituloUpper.includes('%') || tituloUpper.includes('LFT')) {
    return 'pos'
  }
  
  return 'pos' // padrão
}

/**
 * Determina o tipo de renda fixa
 */
function determinarTipoRendaFixa(produto: string): 'renda_fixa' | 'tesouro_direto' | 'cri' | 'cra' | 'debenture' {
  const produtoUpper = produto.toUpperCase()
  
  if (produtoUpper.includes('TESOURO')) {
    return 'tesouro_direto'
  } else if (produtoUpper.includes('CRI')) {
    return 'cri'
  } else if (produtoUpper.includes('CRA')) {
    return 'cra'
  } else if (produtoUpper.includes('DEBENTURE') || produtoUpper.includes('DEBÊNTURE')) {
    return 'debenture'
  }
  
  return 'renda_fixa'
}
