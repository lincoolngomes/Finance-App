/**
 * Busca o IPCA acumulado do Banco Central entre duas datas
 * Série 433 do SGS - IPCA mensal
 */
export async function buscarIPCAAcumulado(dataInicio: Date, dataFim: Date): Promise<number> {
  try {
    // Formatar datas no padrão DD/MM/YYYY
    const formatarData = (data: Date) => {
      const dia = String(data.getDate()).padStart(2, '0')
      const mes = String(data.getMonth() + 1).padStart(2, '0')
      const ano = data.getFullYear()
      return `${dia}/${mes}/${ano}`
    }

    const dataInicioStr = formatarData(dataInicio)
    const dataFimStr = formatarData(dataFim)

    console.log('🔍 Buscando IPCA acumulado:', {
      dataInicio: dataInicioStr,
      dataFim: dataFimStr,
      url: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${dataInicioStr}&dataFinal=${dataFimStr}`
    })

    const response = await fetch(
      `/api/bcb?serie=433&dataInicial=${dataInicioStr}&dataFinal=${dataFimStr}&formato=json`,
      {
        headers: { 'Accept': 'application/json' },
        credentials: 'omit',
      }
    )

    if (!response.ok) {
      throw new Error(`Erro ao buscar IPCA: ${response.status}`)
    }

    const dados = await response.json()

    if (!Array.isArray(dados) || dados.length === 0) {
      console.warn('⚠️ Nenhum dado de IPCA encontrado, usando projeção')
      // Usar projeção de 4.5% a.a. como fallback
      const diasCorridos = Math.floor((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24))
      const anos = diasCorridos / 365
      const fatorProjetado = Math.pow(1.045, anos) // 4.5% a.a.
      return fatorProjetado
    }

    // Calcular fator acumulado compondo os valores mensais
    // IPCA é informado como percentual (ex: 0.56 = 0.56%)
    let fatorAcumulado = 1.0

    for (const item of dados) {
      const valorMensal = parseFloat(item.valor)
      // Converter de percentual para fator (0.56% = 1.0056)
      const fatorMensal = 1 + (valorMensal / 100)
      fatorAcumulado *= fatorMensal
    }

    const variacaoPercentual = (fatorAcumulado - 1) * 100

    console.log('📈 IPCA acumulado calculado:', {
      periodos: dados.length,
      primeiroValor: dados[0],
      ultimoValor: dados[dados.length - 1],
      fatorAcumulado: fatorAcumulado.toFixed(6),
      variacaoPercentual: variacaoPercentual.toFixed(4) + '%'
    })

    return fatorAcumulado

  } catch (error) {
    console.error('❌ Erro ao buscar IPCA:', error)
    // Usar projeção de 4.5% a.a. como fallback
    const diasCorridos = Math.floor((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24))
    const anos = diasCorridos / 365
    const fatorProjetado = Math.pow(1.045, anos) // 4.5% a.a.
    console.log('⚠️ Usando IPCA projetado:', fatorProjetado.toFixed(6))
    return fatorProjetado
  }
}
