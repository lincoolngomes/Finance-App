/**
 * Busca preços unitários atualizados do Tesouro Direto
 * API oficial do Tesouro Nacional
 */

export interface TituloTesouroDireto {
  codigo: string
  nome: string
  precoUnitario: number
  precoCompra?: number
  precoVenda?: number
  dataReferencia: string
  vencimento?: string
  taxaCompra?: number
  taxaVenda?: number
}

export async function buscarPrecosTesouroDireto(): Promise<TituloTesouroDireto[]> {
  try {
    console.log('🏛️ Buscando preços do Tesouro Direto...')
    
    // SEMPRE usa o proxy (Netlify Functions local ou remoto)
    // NUNCA acessa API direta (bloqueio CORS)
    const apiUrl = '/.netlify/functions/tesouro-direto-proxy'
    
    console.log(`📡 URL da API: Proxy Netlify Functions`)
    
    const response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error(`Erro ao buscar Tesouro Direto: ${response.status}`)
    }

    const csvText = await response.text()
    const linhas = csvText.split('\n').filter(l => l.trim())
    
    if (linhas.length < 2) {
      throw new Error('CSV vazio ou inválido')
    }

    // Processar CSV
    const headers = linhas[0].split(';')
    const titulos: TituloTesouroDireto[] = []

    for (let i = 1; i < linhas.length; i++) {
      const valores = linhas[i].split(';')
      
      if (valores.length < 5) continue

      const tipo = valores[0]?.trim()
      const vencimento = valores[1]?.trim()
      const dataBase = valores[2]?.trim()
      const taxaCompraStr = valores[3]?.replace(',', '.')
      const taxaVendaStr = valores[4]?.replace(',', '.')
      const precoCompraStr = valores[5]?.replace(',', '.')
      const precoVendaStr = valores[6]?.replace(',', '.')

      if (!tipo || !precoCompraStr || !precoVendaStr) continue

      // Criar código único
      const codigo = `${tipo.replace(/\s+/g, '_')}_${vencimento?.replace(/\//g, '')}`

      // Usar precoVenda como precoUnitario (é o que vale na marcação a mercado)
      titulos.push({
        codigo: codigo,
        nome: `${tipo} ${vencimento}`,
        precoUnitario: parseFloat(precoVendaStr), // PU de venda (marcação a mercado)
        precoCompra: parseFloat(precoCompraStr),  // PU de compra (referência)
        precoVenda: parseFloat(precoVendaStr),    // PU de venda
        dataReferencia: dataBase,
        vencimento: vencimento,
        taxaCompra: taxaCompraStr ? parseFloat(taxaCompraStr) : undefined,
        taxaVenda: taxaVendaStr ? parseFloat(taxaVendaStr) : undefined
      })
    }

    console.log('✅ Preços Tesouro Direto carregados:', titulos.length, 'títulos')
    return titulos

  } catch (error) {
    console.error('❌ Erro ao buscar Tesouro Direto:', error)
    return []
  }
}

export async function buscarPrecoTitulo(codigo: string): Promise<number | null> {
  try {
    const titulos = await buscarPrecosTesouroDireto()
    
    console.log('🔍 Buscando título:', codigo)
    console.log('📋 Títulos disponíveis:', titulos.slice(0, 5).map(t => ({ codigo: t.codigo, nome: t.nome })))
    
    // Tentar busca exata primeiro
    let titulo = titulos.find(t => t.codigo === codigo)
    
    // Se não encontrar, tentar busca normalizada
    if (!titulo) {
      const codigoNormalizado = codigo.toUpperCase().replace(/[\s_-]+/g, '')
      titulo = titulos.find(t => 
        t.codigo.toUpperCase().replace(/[\s_-]+/g, '') === codigoNormalizado
      )
    }
    
    // Se ainda não encontrar, tentar busca por nome parcial
    if (!titulo) {
      // Extrair tipo e vencimento do código (ex: "Tesouro IPCA+ 2035" ou "NTNB_15052035")
      const partesCodigo = codigo.split(/[\s_-]+/)
      
      // Buscar por tipo (IPCA+, Prefixado, SELIC) e vencimento
      titulo = titulos.find(t => {
        const nomeUpper = t.nome.toUpperCase()
        // Verificar se contém tipo do título
        const contemTipo = partesCodigo.some(parte => 
          nomeUpper.includes(parte.toUpperCase()) && parte.length > 3
        )
        return contemTipo
      })
    }
    
    if (titulo) {
      console.log('✅ Preço encontrado:', {
        codigoBuscado: codigo,
        tituloEncontrado: titulo.nome,
        codigoTitulo: titulo.codigo,
        preco: titulo.precoUnitario,
        data: titulo.dataReferencia
      })
      return titulo.precoUnitario
    }

    console.warn('⚠️ Título não encontrado:', codigo)
    console.warn('Dica: Verifique se o código está correto. Exemplos válidos:', 
      titulos.slice(0, 3).map(t => t.codigo))
    return null
  } catch (error) {
    console.error('❌ Erro ao buscar preço do título:', error)
    return null
  }
}

/**
 * Calcula valor atual pela marcação a mercado (Tesouro Direto)
 * @param valorAplicado - Valor total aplicado (não é quantidade de títulos)
 * @param codigoTitulo - Código do título
 * @param precoCompra - PU na data da compra (opcional, para cálculo preciso)
 */
export async function calcularMarcacaoMercadoTesouro(
  valorAplicado: number,
  codigoTitulo: string,
  precoCompra?: number
): Promise<{ valorAtual: number; precoUnitario: number | null }> {
  const precoAtual = await buscarPrecoTitulo(codigoTitulo)
  
  if (precoAtual && precoCompra && precoCompra > 0) {
    // Se temos o PU de compra, calcular quantidade de títulos e valorizar pelo PU atual
    const quantidadeTitulos = valorAplicado / precoCompra
    const valorAtual = quantidadeTitulos * precoAtual
    
    console.log('📊 Marcação a Mercado (Tesouro - com PU compra):', {
      valorAplicado,
      precoCompra,
      quantidadeTitulos: quantidadeTitulos.toFixed(6),
      precoAtual,
      valorAtual: valorAtual.toFixed(2),
      variacao: ((valorAtual / valorAplicado - 1) * 100).toFixed(2) + '%'
    })
    
    return { valorAtual, precoUnitario: precoAtual }
  } else if (precoAtual) {
    // Sem PU de compra: retornar apenas o preço atual
    // O sistema deve usar preco_medio do banco de dados
    console.warn('⚠️ Marcação a Mercado (Tesouro - sem PU compra):', {
      valorAplicado,
      precoAtual,
      aviso: 'Use preco_medio do investimento para calcular quantidade'
    })
    
    return { valorAtual: 0, precoUnitario: precoAtual }
  }

  console.warn('⚠️ Não foi possível obter preço de mercado, retornando null')
  return { valorAtual: 0, precoUnitario: null }
}
