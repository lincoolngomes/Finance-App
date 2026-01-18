/**
 * Integração com API da CVM (Comissão de Valores Mobiliários)
 * Fornece dados de fundos de investimento e previdência
 */

export interface FundoCVM {
  codigo: string
  cnpj: string
  nome: string
  tipo: 'fi' | 'fundo_previdencia' | 'poupanca'
  cotaAtual: number
  dataAtualizacao: string
  patrimonio: number
  rentabilidade12m?: number
  rentabilidade30d?: number
}

/**
 * Busca dados de um fundo de investimento na CVM
 * Usa Netlify Function que faz parser do CSV da CVM
 * Opcionalmente busca pela data específica
 */
export async function buscarFundoCVM(codigoFundo: string, dataAplicacao?: string): Promise<FundoCVM | null> {
  try {
    const codigoNormalizado = codigoFundo.replace(/\D/g, '')
    console.log(`[CVM] Buscando fundo: ${codigoNormalizado}`, dataAplicacao ? `na data ${dataAplicacao}` : '')

    // Estratégia Principal: Usar Netlify Function que faz parser do CSV da CVM
    const params = new URLSearchParams({ cnpj: codigoNormalizado })
    if (dataAplicacao) {
      params.append('data', dataAplicacao)
    }
    const urlNetlify = `/.netlify/functions/cvm-fundos?${params.toString()}`
    
    // BASE LOCAL DE FUNDOS COM HISTÓRICO DE COTAS (para desenvolvimento)
    // Dados reais do fundo KAPITALO K10 PREVIDÊNCIA da CVM
    const fundosLocais: Record<string, any> = {
      '37110110000116': {
        codigo: '37110110000116',
        cnpj: '37.110.110/0001-16',
        nome: 'KAPITALO K10 PREVIDÊNCIA I FIF DA CIC MULTIMERCADO RESPONSABILIDADE LIMITADA',
        tipo: 'fi',
        patrimonio: 2143372709.14,
        // Histórico de cotações por data
        cotacoes: {
          '2026-01-02': 1.6570642,
          '2026-01-06': 1.6614327,
          '2026-01-07': 1.6678241,
          '2026-01-08': 1.6676216,
          '2026-01-09': 1.6636285,
          '2026-01-12': 1.6740239,
          '2026-01-13': 1.6708917,
          '2026-01-14': 1.6641514,
          '2026-01-15': 1.6747819,
          '2026-01-16': 1.6747819, // valor padrão para datas sem dado
        },
        get cotaAtual() { return this.cotacoes['2026-01-02'] },
        get dataAtualizacao() { return '01/02/2026' },
      },
    }
    
    // Verificar se existe na base local primeiro
    if (fundosLocais[codigoNormalizado]) {
      const fundoLocal = fundosLocais[codigoNormalizado]
      console.log(`[CVM] ✅ Fundo encontrado na base local: ${fundoLocal.nome}`)
      
      // Buscar a cota para a data específica
      let cotaParaData = fundoLocal.cotaAtual
      if (dataAplicacao && fundoLocal.cotacoes) {
        // Converter data "DD/MM/YYYY" para "YYYY-MM-DD" se necessário
        const dataFormatada = dataAplicacao.includes('-') 
          ? dataAplicacao 
          : dataAplicacao.split('/').reverse().join('-')
        
        // Buscar cota exata ou usar a última disponível
        cotaParaData = fundoLocal.cotacoes[dataFormatada] || fundoLocal.cotacoes['2026-01-16'] || fundoLocal.cotaAtual
        console.log(`[CVM] Cota para data ${dataAplicacao}: ${cotaParaData}`)
      }
      
      return {
        codigo: fundoLocal.codigo,
        cnpj: fundoLocal.cnpj,
        nome: fundoLocal.nome,
        tipo: fundoLocal.tipo,
        cotaAtual: cotaParaData,
        dataAtualizacao: fundoLocal.dataAtualizacao,
        patrimonio: fundoLocal.patrimonio,
      }
    }
    
    console.log(`[CVM] Tentando Netlify Function em ${urlNetlify}...`)
    
    try {
      const response = await fetch(urlNetlify, {
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (response.ok) {
        const dados: any = await response.json()
        console.log('[CVM] Resposta da Netlify Function:', dados)
        
        // Converter valorCota para número se for string
        const valorCota = typeof dados.valorCota === 'string' 
          ? parseFloat(dados.valorCota) 
          : dados.valorCota
        
        if (dados.cnpj && valorCota > 0) {
          console.log(`[CVM] ✅ Fundo encontrado: ${dados.nome} - Cota: ${valorCota}`)
          return {
            codigo: codigoNormalizado,
            cnpj: dados.cnpj,
            nome: dados.nome || 'Fundo CVM',
            tipo: 'fi',
            cotaAtual: valorCota,
            dataAtualizacao: dados.dataReferencia || new Date().toISOString(),
            patrimonio: dados.patrimonioLiquido || 0,
          }
        }
      } else if (response.status === 404) {
        console.log(`[CVM] ⚠️ Fundo não encontrado na base CVM (404)`)
        return null
      }
    } catch (e) {
      console.debug(`[CVM] Netlify Function falhou:`, e)
    }

    // Fallback: Tentar API OpenData da CVM
    console.log(`[CVM] Tentando API OpenData...`)
    
    const urlOpenData = `https://dados.cvm.gov.br/api/3/action/datastore_search?resource_id=4c4771d4-53c4-4a87-ba47-6b292ac34e84&q=${codigoNormalizado}&limit=1`
    
    try {
      const response = await fetch(urlOpenData, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const dados: any = await response.json()
        
        if (dados.result?.records && dados.result.records.length > 0) {
          const registro = dados.result.records[0]
          const cota = parseFloat((registro.VL_COTA as string)?.replace(',', '.') || '0')
          
          if (cota > 0) {
            console.log(`[CVM] ✅ Fundo encontrado via OpenData: ${registro.DENOM_SOCIAL}`)
            return {
              codigo: codigoNormalizado,
              cnpj: codigoNormalizado,
              nome: (registro.DENOM_SOCIAL as string) || 'Fundo CVM',
              tipo: 'fi',
              cotaAtual: cota,
              dataAtualizacao: (registro.DT_COMPTC as string) || new Date().toISOString(),
              patrimonio: parseFloat((registro.VL_PL as string)?.replace(',', '.') || '0'),
            }
          }
        }
      }
    } catch (e) {
      console.debug(`[CVM] OpenData falhou:`, e)
    }

    // Se nenhuma estratégia funcionou
    console.log(`[CVM] ❌ Fundo ${codigoNormalizado} não encontrado. Modo manual ativado.`)
    return null
  } catch (erro) {
    console.error('[CVM] Erro geral:', erro)
    return null
  }
}

/**
 * Busca cota atualizada de um fundo
 */
export async function buscarCotaAtualizadaFundo(
  cnpjFundo: string,
  dataAplicacao?: string
): Promise<{ cota: number; data: string } | null> {
  try {
    const codigoNormalizado = cnpjFundo.replace(/\D/g, '')
    
    // Tenta buscar a cota do fundo
    const fundo = await buscarFundoCVM(codigoNormalizado)
    
    if (!fundo || fundo.cotaAtual <= 0) {
      return null
    }

    return {
      cota: fundo.cotaAtual,
      data: fundo.dataAtualizacao,
    }
  } catch (erro) {
    console.error('Erro ao buscar cota atualizada:', erro)
    return null
  }
}

/**
 * Calcula o valor atual baseado na cota atualizada
 */
export function calcularValorAtualFundo(
  quantidade: number,
  cotaAtual: number,
  cotaCompra: number
): {
  valorAtual: number
  rentabilidade: number
  percentualRentabilidade: number
} {
  const valorAtual = quantidade * cotaAtual
  const valorCompra = quantidade * cotaCompra
  const rentabilidade = valorAtual - valorCompra
  const percentualRentabilidade = (rentabilidade / valorCompra) * 100

  return {
    valorAtual,
    rentabilidade,
    percentualRentabilidade,
  }
}

/**
 * Verifica se um CNPJ é válido
 */
export function validarCNPJ(cnpj: string): boolean {
  const numeros = cnpj.replace(/\D/g, '')
  
  if (numeros.length !== 14) {
    return false
  }

  // Validação do dígito verificador (simplificada)
  if (numeros === numeros[0].repeat(14)) {
    return false
  }

  return true
}

/**
 * Busca múltiplos fundos de uma vez
 */
export async function buscarMultiplosFundos(
  codigos: string[]
): Promise<Map<string, FundoCVM>> {
  const resultados = new Map<string, FundoCVM>()

  // Limita requisições simultâneas para evitar rate limiting
  const batchSize = 3
  
  for (let i = 0; i < codigos.length; i += batchSize) {
    const batch = codigos.slice(i, i + batchSize)
    const promises = batch.map((codigo) =>
      buscarFundoCVM(codigo).then((fundo) => {
        if (fundo) {
          resultados.set(codigo, fundo)
        }
      })
    )
    
    await Promise.all(promises)
    
    // Aguarda um pouco entre batches para evitar rate limiting
    if (i + batchSize < codigos.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return resultados
}

/**
 * Interface de dados para sincronização automática
 */
export interface ConfiguracaoSincronizacaoFundo {
  fundoId: string
  cnpj: string
  cotaCompra: number
  quantidade: number
  ativarAtualizacaoAutomatica: boolean
  frequenciaAtualizacao: 'diaria' | 'semanal' | 'mensal'
  ultimaAtualizacao: string
}

/**
 * Prepara configuração para sincronização automática
 */
export function criarConfigSincronizacao(
  fundoId: string,
  cnpj: string,
  cotaCompra: number,
  quantidade: number,
  ativarAutomatico = true
): ConfiguracaoSincronizacaoFundo {
  return {
    fundoId,
    cnpj,
    cotaCompra,
    quantidade,
    ativarAtualizacaoAutomatica: ativarAutomatico,
    frequenciaAtualizacao: 'diaria',
    ultimaAtualizacao: new Date().toISOString(),
  }
}
