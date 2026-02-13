export interface SerieBCItem {
  data: string
  valor: string
}

export interface IndicesEconomicos {
  cdi12m: number | null
  ipca12m: number | null
  dolar12m: number | null
  atualizadoEm: Date | null
}

const INDICES_CACHE_KEY = 'indices_economicos_cache'
const INDICES_CACHE_TIME_KEY = 'indices_economicos_cache_time'
const INDICES_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const loadCachedIndices = (): IndicesEconomicos | null => {
  try {
    const cached = sessionStorage.getItem(INDICES_CACHE_KEY)
    const cachedTime = sessionStorage.getItem(INDICES_CACHE_TIME_KEY)
    if (!cached || !cachedTime) return null
    const age = Date.now() - parseInt(cachedTime)
    if (age > INDICES_CACHE_TTL_MS) return null
    const parsed = JSON.parse(cached)
    return {
      ...parsed,
      atualizadoEm: parsed.atualizadoEm ? new Date(parsed.atualizadoEm) : null,
    }
  } catch {
    return null
  }
}

const saveCachedIndices = (indices: IndicesEconomicos) => {
  try {
    sessionStorage.setItem(INDICES_CACHE_KEY, JSON.stringify({
      ...indices,
      atualizadoEm: indices.atualizadoEm ? indices.atualizadoEm.toISOString() : null,
    }))
    sessionStorage.setItem(INDICES_CACHE_TIME_KEY, Date.now().toString())
  } catch {
    // ignore
  }
}

const formatarData = (data: Date): string => {
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const ano = data.getFullYear()
  return `${dia}/${mes}/${ano}`
}

const parseDataBR = (dataStr: string): Date | null => {
  const [dia, mes, ano] = dataStr.split('/')
  if (!dia || !mes || !ano) return null
  const date = new Date(Number(ano), Number(mes) - 1, Number(dia))
  return isNaN(date.getTime()) ? null : date
}

const fetchSerie = async (serie: string, dataInicio: Date, dataFim: Date): Promise<SerieBCItem[]> => {
  const dataInicioStr = formatarData(dataInicio)
  const dataFimStr = formatarData(dataFim)
  const url = `/api/bcb?serie=${serie}&dataInicial=${dataInicioStr}&dataFinal=${dataFimStr}&formato=json`

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    credentials: 'omit',
  })

  if (!response.ok) {
    throw new Error(`Erro ao buscar série ${serie}: ${response.status}`)
  }

  const dados = await response.json()
  return Array.isArray(dados) ? dados : []
}

const calcularVariacaoPercentual = (dados: SerieBCItem[]): { variacao: number | null; atualizadoEm: Date | null } => {
  if (!dados.length) return { variacao: null, atualizadoEm: null }
  const first = dados[0]
  const last = dados[dados.length - 1]
  const firstValue = parseFloat(first.valor)
  const lastValue = parseFloat(last.valor)
  if (isNaN(firstValue) || isNaN(lastValue) || firstValue === 0) {
    return { variacao: null, atualizadoEm: null }
  }
  const variacao = ((lastValue / firstValue) - 1) * 100
  const atualizadoEm = parseDataBR(last.data)
  return { variacao, atualizadoEm }
}

const calcularFatorAcumulado = (dados: SerieBCItem[]): number | null => {
  if (!dados.length) return null
  let fator = 1
  for (const item of dados) {
    const taxa = parseFloat(item.valor)
    if (isNaN(taxa)) continue
    fator *= 1 + (taxa / 100)
  }
  return fator
}

export const buscarIndicesEconomicos = async (): Promise<IndicesEconomicos> => {
  const cached = loadCachedIndices()
  if (cached) return cached

  const hoje = new Date()
  const inicio = new Date(hoje)
  inicio.setFullYear(hoje.getFullYear() - 1)

  const [cdi, ipca, dolar] = await Promise.allSettled([
    fetchSerie('12', inicio, hoje),
    fetchSerie('433', inicio, hoje),
    fetchSerie('1', inicio, hoje),
  ])

  const cdiDados = cdi.status === 'fulfilled' ? cdi.value : []
  const ipcaDados = ipca.status === 'fulfilled' ? ipca.value : []
  const dolarDados = dolar.status === 'fulfilled' ? dolar.value : []

  const cdiFator = calcularFatorAcumulado(cdiDados)
  const ipcaFator = calcularFatorAcumulado(ipcaDados)
  const dolarVariacao = calcularVariacaoPercentual(dolarDados)

  const datas = [
    cdiDados.at(-1)?.data ? parseDataBR(cdiDados.at(-1)!.data) : null,
    ipcaDados.at(-1)?.data ? parseDataBR(ipcaDados.at(-1)!.data) : null,
    dolarVariacao.atualizadoEm
  ]
    .filter((d): d is Date => !!d)
  const atualizadoEm = datas.length ? new Date(Math.max(...datas.map(d => d.getTime()))) : null

  const result = {
    cdi12m: cdiFator ? (cdiFator - 1) * 100 : null,
    ipca12m: ipcaFator ? (ipcaFator - 1) * 100 : null,
    dolar12m: dolarVariacao.variacao ?? null,
    atualizadoEm
  }
  saveCachedIndices(result)
  return result
}
