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
    
    // API oficial do Tesouro Nacional
    const response = await fetch(
      'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv'
    )

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

      titulos.push({
        codigo: codigo,
        nome: `${tipo} ${vencimento}`,
        precoUnitario: parseFloat(precoVendaStr),
        precoCompra: parseFloat(precoCompraStr),
        precoVenda: parseFloat(precoVendaStr),
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
    const titulo = titulos.find(t => t.codigo === codigo || t.nome.includes(codigo))
    
    if (titulo) {
      console.log('✅ Preço encontrado:', {
        codigo,
        titulo: titulo.nome,
        preco: titulo.precoUnitario,
        data: titulo.dataReferencia
      })
      return titulo.precoUnitario
    }

    console.warn('⚠️ Título não encontrado:', codigo)
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
    // Fallback: assumir que quantidade = 1 e valor aplicado é o valor total
    // Isso funciona se o usuário informou corretamente a quantidade de títulos
    const valorAtual = valorAplicado * (precoAtual / 1000) // Normalizar por fração
    
    console.log('📊 Marcação a Mercado (Tesouro - sem PU compra):', {
      valorAplicado,
      precoAtual,
      valorAtual: valorAtual.toFixed(2)
    })
    
    return { valorAtual, precoUnitario: precoAtual }
  }

  console.warn('⚠️ Não foi possível obter preço de mercado, retornando null')
  return { valorAtual: 0, precoUnitario: null }
}
