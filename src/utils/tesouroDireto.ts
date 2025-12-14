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
 */
export async function calcularMarcacaoMercadoTesouro(
  quantidade: number,
  codigoTitulo: string
): Promise<{ valorAtual: number; precoUnitario: number | null }> {
  const precoUnitario = await buscarPrecoTitulo(codigoTitulo)
  
  if (precoUnitario) {
    const valorAtual = quantidade * precoUnitario
    console.log('📊 Marcação a Mercado (Tesouro):', {
      quantidade,
      precoUnitario,
      valorAtual
    })
    return { valorAtual, precoUnitario }
  }

  console.warn('⚠️ Não foi possível obter preço de mercado, retornando null')
  return { valorAtual: 0, precoUnitario: null }
}
