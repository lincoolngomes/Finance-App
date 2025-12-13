import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

export interface Investimento {
  id: string
  user_id: string
  tipo: 'acao' | 'renda_fixa' | 'cripto' | 'fii' | 'etf' | 'fundo' | 'previdencia'
  codigo: string
  nome: string
  instituicao?: string
  quantidade: number
  preco_medio: number
  valor_total: number
  data_primeira_compra?: string
  ativo: boolean
  observacoes?: string
  // Campos específicos para Renda Fixa
  tipo_rentabilidade?: 'pos' | 'pre' | 'ipca' | 'hibrido'
  taxa_percentual?: number
  indexador?: 'cdi' | 'ipca' | 'selic' | 'prefixado'
  data_vencimento?: string
  liquidez?: string
  data_aplicacao?: string
  valor_bruto_resgate?: number
  ir_retido?: number
  // Campos calculados
  created_at: string
  updated_at: string
  cotacao_atual?: number
  valor_atual?: number
  rentabilidade?: number
  rentabilidade_percentual?: number
  dias_aplicado?: number
  dias_ate_vencimento?: number
  rentabilidade_projetada?: number
}

export interface TransacaoInvestimento {
  id: string
  investimento_id: string
  user_id: string
  tipo_transacao: 'compra' | 'venda'
  quantidade: number
  preco_unitario: number
  valor_total: number
  taxa: number
  data_transacao: string
  observacoes?: string
  created_at: string
}

export interface CotacaoHistorico {
  id: string
  codigo: string
  tipo: string
  preco: number
  data_cotacao: string
  created_at: string
}

export interface ResumoInvestimentos {
  valorTotal: number
  rentabilidadeTotal: number
  rentabilidadePercentual: number
  quantidadeAtivos: number
  porTipo: {
    tipo: string
    valor: number
    percentual: number
  }[]
  porInstituicao: {
    instituicao: string
    valor: number
    percentual: number
  }[]
  evolucaoMensal: {
    mes: string
    valor: number
  }[]
}

export const useInvestments = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Refs devem ser declarados primeiro
  const isInitialMount = useRef(true)
  const previousMes = useRef<string>('')
  const lastFetchTimeRef = useRef<number>(0)
  
  // Tentar recuperar dados e timestamp do sessionStorage
  const [investimentos, setInvestimentos] = useState<Investimento[]>(() => {
    try {
      const cached = sessionStorage.getItem('investimentos_cache')
      const cachedTime = sessionStorage.getItem('investimentos_cache_time')
      
      console.log('🚀 Inicializando useInvestments:', {
        temCache: !!cached,
        temCachedTime: !!cachedTime,
        cachedDataLength: cached ? JSON.parse(cached).length : 0
      })
      
      if (cached) {
        if (cachedTime) {
          lastFetchTimeRef.current = parseInt(cachedTime)
          console.log('⏰ Cache timestamp carregado:', new Date(parseInt(cachedTime)).toLocaleString())
        }
        const data = JSON.parse(cached)
        console.log('✅ Dados do cache carregados:', data.length, 'investimentos')
        console.log('⚠️ Nota: Valores de renda fixa serão recalculados na próxima busca')
        return data
      }
      console.log('❌ Nenhum cache encontrado')
      return []
    } catch (error) {
      console.error('⚠️ Erro ao carregar cache:', error)
      return []
    }
  })
  
  const [transacoes, setTransacoes] = useState<TransacaoInvestimento[]>([])
  const [loading, setLoading] = useState(() => {
    // Se tem cache, não precisa loading inicial
    try {
      const cached = sessionStorage.getItem('investimentos_cache')
      return !cached
    } catch {
      return true
    }
  })
  const [mesReferencia, setMesReferencia] = useState<Date>(new Date())

  // Buscar investimentos com useCallback para evitar recriação
  const fetchInvestimentos = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('investimentos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Buscar cotações atualizadas (apenas para ativos com cotação)
      const investimentosComCotacao = await Promise.all(
        (data || []).map(async (inv) => {
          try {
            // Renda fixa, fundos e previdência não têm cotação - valor = saldo aplicado
            const temCotacao = ['acao', 'fii', 'etf', 'cripto'].includes(inv.tipo)
            
            let cotacao = null
            let valor_atual = inv.valor_total
            let dadosAdicionais: any = {}
            
            if (temCotacao) {
              cotacao = await getCotacaoAtual(inv.codigo, inv.tipo)
              valor_atual = cotacao ? inv.quantidade * cotacao : inv.valor_total
            } else if (inv.tipo === 'renda_fixa') {
              // Calcular rentabilidade de renda fixa com base na curva
              // Usar data_aplicacao ou data_primeira_compra como fallback
              const dataBase = inv.data_aplicacao || inv.data_primeira_compra
              
              console.log('🔍 Verificando dados de renda fixa:', {
                codigo: inv.codigo,
                tipo: inv.tipo,
                data_aplicacao: inv.data_aplicacao,
                data_primeira_compra: inv.data_primeira_compra,
                dataBase,
                data_vencimento: inv.data_vencimento,
                taxa_percentual: inv.taxa_percentual,
                tipo_rentabilidade: inv.tipo_rentabilidade,
                indexador: inv.indexador,
                liquidez: inv.liquidez
              })
              
              if (dataBase && inv.data_vencimento && inv.taxa_percentual) {
                console.log('✅ Dados válidos, calculando renda fixa...')
                dadosAdicionais = calcularRendaFixa({
                  ...inv,
                  data_aplicacao: dataBase
                })
                valor_atual = dadosAdicionais.valor_atual
              } else {
                console.log('❌ Dados insuficientes para calcular renda fixa')
                console.log('Faltando:', {
                  dataBase: !dataBase,
                  data_vencimento: !inv.data_vencimento,
                  taxa_percentual: !inv.taxa_percentual
                })
              }
            }
            
            const rentabilidade = valor_atual - inv.valor_total
            const rentabilidade_percentual = inv.valor_total > 0 
              ? (rentabilidade / inv.valor_total) * 100 
              : 0

            return {
              ...inv,
              ...dadosAdicionais,
              cotacao_atual: cotacao,
              valor_atual,
              rentabilidade,
              rentabilidade_percentual
            }
          } catch (error) {
            console.error(`Erro ao processar investimento ${inv.codigo}:`, error)
            // Retorna investimento sem cotação atualizada
            return {
              ...inv,
              cotacao_atual: null,
              valor_atual: inv.valor_total,
              rentabilidade: 0,
              rentabilidade_percentual: 0
            }
          }
        })
      )

      setInvestimentos(investimentosComCotacao)
      
      // Salvar no sessionStorage para persistir durante a sessão
      try {
        const timestamp = Date.now()
        sessionStorage.setItem('investimentos_cache', JSON.stringify(investimentosComCotacao))
        sessionStorage.setItem('investimentos_cache_time', timestamp.toString())
        lastFetchTimeRef.current = timestamp
      } catch (error) {
        console.error('Erro ao salvar cache:', error)
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao buscar investimentos',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  // Buscar transações
  const fetchTransacoes = async (investimentoId?: string) => {
    if (!user) return

    try {
      let query = supabase
        .from('transacoes_investimentos')
        .select('*')
        .eq('user_id', user.id)
        .order('data_transacao', { ascending: false })

      if (investimentoId) {
        query = query.eq('investimento_id', investimentoId)
      }

      const { data, error } = await query

      if (error) throw error
      setTransacoes(data || [])
    } catch (error: any) {
      toast({
        title: 'Erro ao buscar transações',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // Buscar ou criar investimento
  const getOrCreateInvestimento = async (dados: Partial<Investimento>) => {
    if (!user) return null

    try {
      // Verificar se já existe
      const { data: existente } = await supabase
        .from('investimentos')
        .select('*')
        .eq('user_id', user.id)
        .eq('codigo', dados.codigo!)
        .single()

      if (existente) {
        return existente
      }

      // Criar novo
      const dadosInsert: any = {
        user_id: user.id,
        tipo: dados.tipo!,
        codigo: dados.codigo!,
        nome: dados.nome!,
        instituicao: dados.instituicao,
        quantidade: 0,
        preco_medio: 0,
        valor_total: 0,
        ativo: true,
        observacoes: dados.observacoes
      }

      // Adicionar campos específicos de renda fixa
      if (dados.tipo === 'renda_fixa') {
        dadosInsert.tipo_rentabilidade = dados.tipo_rentabilidade
        dadosInsert.taxa_percentual = dados.taxa_percentual
        dadosInsert.indexador = dados.indexador
        dadosInsert.data_vencimento = dados.data_vencimento
        dadosInsert.liquidez = dados.liquidez
        dadosInsert.data_aplicacao = dados.data_aplicacao
      }

      const { data, error } = await supabase
        .from('investimentos')
        .insert(dadosInsert)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error: any) {
      toast({
        title: 'Erro ao criar investimento',
        description: error.message,
        variant: 'destructive'
      })
      return null
    }
  }

  // Adicionar transação (compra ou venda)
  const adicionarTransacao = async (dados: Partial<TransacaoInvestimento>) => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('transacoes_investimentos')
        .insert({
          investimento_id: dados.investimento_id!,
          user_id: user.id,
          tipo_transacao: dados.tipo_transacao!,
          quantidade: dados.quantidade!,
          preco_unitario: dados.preco_unitario!,
          valor_total: dados.valor_total!,
          taxa: dados.taxa || 0,
          data_transacao: dados.data_transacao!,
          observacoes: dados.observacoes
        })

      if (error) throw error

      toast({
        title: 'Transação registrada',
        description: `${dados.tipo_transacao === 'compra' ? 'Compra' : 'Venda'} registrada com sucesso!`
      })

      // Limpar cache para forçar atualização
      sessionStorage.removeItem('investimentos_cache')
      sessionStorage.removeItem('investimentos_cache_time')
      lastFetchTimeRef.current = 0
      
      fetchInvestimentos()
      fetchTransacoes()
      return true
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar transação',
        description: error.message,
        variant: 'destructive'
      })
      return false
    }
  }

  // Atualizar investimento
  const atualizarInvestimento = async (id: string, dados: Partial<Investimento>) => {
    try {
      const { error } = await supabase
        .from('investimentos')
        .update(dados)
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Investimento atualizado',
        description: 'As informações foram atualizadas com sucesso!'
      })

      // Limpar cache para forçar atualização
      sessionStorage.removeItem('investimentos_cache')
      sessionStorage.removeItem('investimentos_cache_time')
      lastFetchTimeRef.current = 0
      
      fetchInvestimentos()
      return true
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar investimento',
        description: error.message,
        variant: 'destructive'
      })
      return false
    }
  }

  // Deletar investimento
  const deletarInvestimento = async (id: string) => {
    try {
      const { error } = await supabase
        .from('investimentos')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Investimento removido',
        description: 'O investimento foi removido com sucesso!'
      })

      // Limpar cache para forçar atualização
      sessionStorage.removeItem('investimentos_cache')
      sessionStorage.removeItem('investimentos_cache_time')
      lastFetchTimeRef.current = 0
      
      fetchInvestimentos()
      return true
    } catch (error: any) {
      toast({
        title: 'Erro ao remover investimento',
        description: error.message,
        variant: 'destructive'
      })
      return false
    }
  }

  // Calcular rentabilidade de renda fixa
  const calcularRendaFixa = (inv: any) => {
    // Validar se tem as datas necessárias
    if (!inv.data_aplicacao || !inv.data_vencimento) {
      return {
        valor_atual: inv.valor_total,
        valor_bruto_resgate: inv.valor_total,
        ir_retido: 0,
        dias_aplicado: 0,
        dias_ate_vencimento: 0,
        rentabilidade_projetada: 0
      }
    }

    const dataAplicacao = new Date(inv.data_aplicacao)
    const dataVencimento = new Date(inv.data_vencimento)
    const hoje = new Date()
    
    const diasAplicado = Math.floor((hoje.getTime() - dataAplicacao.getTime()) / (1000 * 60 * 60 * 24))
    const diasAteVencimento = Math.floor((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    const diasTotais = Math.floor((dataVencimento.getTime() - dataAplicacao.getTime()) / (1000 * 60 * 60 * 24))
    
    let taxaAnualEfetiva = inv.taxa_percentual || 0
    
    // Calcular taxa efetiva baseada no tipo de rentabilidade e indexador
    if (inv.tipo_rentabilidade === 'pos') {
      // Pós-fixado: percentual do indexador (ex: 101% do CDI)
      let taxaIndexador = 13.65 // CDI/SELIC atual (dez/2024)
      
      if (inv.indexador === 'cdi' || inv.indexador === 'selic') {
        taxaIndexador = 13.65
      } else if (inv.indexador === 'ipca') {
        taxaIndexador = 4.5 // IPCA projetado 2025
      }
      
      // Taxa contratada é % do indexador (ex: 101% do CDI = 1.01 * 13.65 = 13.7865%)
      taxaAnualEfetiva = (taxaAnualEfetiva / 100) * taxaIndexador
      
      console.log('💰 Cálculo Renda Fixa (Pós-fixado):', {
        codigo: inv.codigo,
        taxaContratada: inv.taxa_percentual + '% do CDI',
        cdiAtual: taxaIndexador + '%',
        taxaEfetiva: taxaAnualEfetiva.toFixed(2) + '% a.a.',
        valorInvestido: inv.valor_total
      })
      
    } else if (inv.tipo_rentabilidade === 'ipca') {
      // IPCA+: taxa fixa + IPCA (ex: IPCA + 6.5%)
      const ipcaProjetado = 4.5
      taxaAnualEfetiva = taxaAnualEfetiva + ipcaProjetado
      
    } else if (inv.tipo_rentabilidade === 'pre') {
      // Pré-fixado: taxa já é a taxa efetiva anual
      taxaAnualEfetiva = inv.taxa_percentual || 0
      
    } else if (inv.tipo_rentabilidade === 'hibrido') {
      // Híbrido: combina pré + indexador (usar lógica similar ao IPCA+)
      const indexadorProjetado = inv.indexador === 'ipca' ? 4.5 : 13.65
      taxaAnualEfetiva = taxaAnualEfetiva + indexadorProjetado
    }
    
    // Calcular rendimento bruto acumulado usando juros compostos
    // Fórmula: VF = VP * (1 + i)^n onde i = taxa diária e n = dias corridos
    
    // Converter taxa anual para taxa diária (365 dias)
    const taxaDiaria = Math.pow(1 + (taxaAnualEfetiva / 100), 1 / 365) - 1
    
    // Aplicar juros compostos sobre dias corridos
    const fatorRendimento = Math.pow(1 + taxaDiaria, diasAplicado)
    const valorBruto = inv.valor_total * fatorRendimento
    
    console.log('📊 Detalhes do Cálculo:', {
      codigo: inv.codigo,
      diasAplicado,
      taxaDiaria: (taxaDiaria * 100).toFixed(4) + '%',
      fatorRendimento: fatorRendimento.toFixed(6),
      valorInvestido: inv.valor_total.toFixed(2),
      valorBruto: valorBruto.toFixed(2),
      rendimentoBruto: (valorBruto - inv.valor_total).toFixed(2)
    })
    
    // Calcular IR (tabela regressiva do imposto de renda)
    let aliquotaIR = 0.225 // 22,5% até 180 dias
    if (diasAplicado > 720) aliquotaIR = 0.15       // 15% acima de 720 dias (2 anos)
    else if (diasAplicado > 360) aliquotaIR = 0.175 // 17,5% de 361 a 720 dias
    else if (diasAplicado > 180) aliquotaIR = 0.20  // 20% de 181 a 360 dias
    
    const rendimentoBruto = valorBruto - inv.valor_total
    const irRetido = rendimentoBruto * aliquotaIR
    const valorLiquido = valorBruto - irRetido
    
    // Projeção para o vencimento
    const fatorVencimento = Math.pow(1 + taxaDiaria, diasTotais)
    const valorBrutoVencimento = inv.valor_total * fatorVencimento
    const rendimentoVencimento = valorBrutoVencimento - inv.valor_total
    
    // IR no vencimento
    let aliquotaIRVencimento = 0.15 // Default para investimentos longos
    if (diasTotais <= 180) aliquotaIRVencimento = 0.225
    else if (diasTotais <= 360) aliquotaIRVencimento = 0.20
    else if (diasTotais <= 720) aliquotaIRVencimento = 0.175
    
    const irVencimento = rendimentoVencimento * aliquotaIRVencimento
    const valorLiquidoVencimento = valorBrutoVencimento - irVencimento
    const rentabilidadeProjetada = ((valorLiquidoVencimento - inv.valor_total) / inv.valor_total) * 100
    
    return {
      valor_atual: valorLiquido,
      valor_bruto_resgate: valorBruto,
      ir_retido: irRetido,
      dias_aplicado: diasAplicado,
      dias_ate_vencimento: diasAteVencimento,
      rentabilidade_projetada: rentabilidadeProjetada
    }
  }

  // Buscar cotação atual (do mês de referência ou atual)
  const getCotacaoAtual = async (codigo: string, tipo: string): Promise<number | null> => {
    const hoje = new Date()
    const mesAtual = hoje.getMonth() === mesReferencia.getMonth() && 
                     hoje.getFullYear() === mesReferencia.getFullYear()

    if (mesAtual) {
      // Buscar cotação em tempo real (API externa)
      return await fetchCotacaoAPI(codigo, tipo)
    } else {
      // Buscar cotação histórica do último dia do mês
      const ultimoDia = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth() + 1, 0)
      return await getCotacaoHistorica(codigo, ultimoDia)
    }
  }

  // Buscar cotação via API (implementar com Brapi ou Yahoo Finance)
  const fetchCotacaoAPI = async (codigo: string, tipo: string): Promise<number | null> => {
    try {
      if (tipo === 'acao' || tipo === 'fii' || tipo === 'etf') {
        // Brapi para ações brasileiras
        const response = await fetch(`https://brapi.dev/api/quote/${codigo}`)
        const data = await response.json()
        if (data.results && data.results[0]) {
          return data.results[0].regularMarketPrice
        }
      } else if (tipo === 'cripto') {
        // CoinGecko ou outra API para criptos
        const cripto = codigo.toLowerCase().replace('usd', '')
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cripto}&vs_currencies=brl`)
        const data = await response.json()
        if (data[cripto]) {
          return data[cripto].brl
        }
      }
      return null
    } catch (error) {
      console.error('Erro ao buscar cotação:', error)
      return null
    }
  }

  // Buscar cotação histórica
  const getCotacaoHistorica = async (codigo: string, data: Date): Promise<number | null> => {
    try {
      const dataStr = data.toISOString().split('T')[0]
      const { data: cotacao, error } = await supabase
        .from('cotacoes_historico')
        .select('preco')
        .eq('codigo', codigo)
        .eq('data_cotacao', dataStr)
        .single()

      if (error) throw error
      return cotacao?.preco || null
    } catch (error) {
      return null
    }
  }

  // Calcular resumo
  const getResumo = (): ResumoInvestimentos => {
    const valorTotal = investimentos.reduce((acc, inv) => acc + (inv.valor_atual || 0), 0)
    const valorInvestido = investimentos.reduce((acc, inv) => acc + inv.valor_total, 0)
    const rentabilidadeTotal = valorTotal - valorInvestido
    const rentabilidadePercentual = valorInvestido > 0 ? (rentabilidadeTotal / valorInvestido) * 100 : 0

    // Por tipo
    const porTipoMap = new Map<string, number>()
    investimentos.forEach(inv => {
      const valor = porTipoMap.get(inv.tipo) || 0
      porTipoMap.set(inv.tipo, valor + (inv.valor_atual || 0))
    })

    const porTipo = Array.from(porTipoMap.entries()).map(([tipo, valor]) => ({
      tipo,
      valor,
      percentual: valorTotal > 0 ? (valor / valorTotal) * 100 : 0
    }))

    // Por instituição
    const porInstituicaoMap = new Map<string, number>()
    investimentos.forEach(inv => {
      const inst = inv.instituicao || 'Não informado'
      const valor = porInstituicaoMap.get(inst) || 0
      porInstituicaoMap.set(inst, valor + (inv.valor_atual || 0))
    })

    const porInstituicao = Array.from(porInstituicaoMap.entries()).map(([instituicao, valor]) => ({
      instituicao,
      valor,
      percentual: valorTotal > 0 ? (valor / valorTotal) * 100 : 0
    }))

    return {
      valorTotal,
      rentabilidadeTotal,
      rentabilidadePercentual,
      quantidadeAtivos: investimentos.filter(i => i.ativo && i.quantidade > 0).length,
      porTipo,
      porInstituicao,
      evolucaoMensal: [] // Implementar depois com base nas transações
    }
  }

  useEffect(() => {
    if (!user) return

    const mesKey = `${mesReferencia.getMonth()}-${mesReferencia.getFullYear()}`
    const now = Date.now()
    const CACHE_DURATION = 30 * 1000 // 30 segundos (para testes)
    
    // Verificar se mudou o dia (para recalcular renda fixa)
    const ultimaAtualizacao = new Date(lastFetchTimeRef.current)
    const hoje = new Date()
    const mudouDia = ultimaAtualizacao.getDate() !== hoje.getDate() || 
                     ultimaAtualizacao.getMonth() !== hoje.getMonth() ||
                     ultimaAtualizacao.getFullYear() !== hoje.getFullYear()
    
    // DESABILITAR CACHE TEMPORARIAMENTE PARA DEBUG
    const tempoDecorrido = now - lastFetchTimeRef.current
    const cacheValido = false // Sempre busca do servidor
    
    console.log('🔍 useInvestments Effect:', {
      user: !!user,
      isInitialMount: isInitialMount.current,
      investimentosLength: investimentos.length,
      tempoDecorrido: Math.round(tempoDecorrido / 1000) + 's',
      mudouDia,
      cacheValido,
      lastFetchTime: lastFetchTimeRef.current
    })
    
    // Carregar na primeira montagem
    if (isInitialMount.current) {
      isInitialMount.current = false
      previousMes.current = mesKey
      
      console.log('📌 Primeira montagem - cache válido?', cacheValido)
      console.log('📌 Mudou o dia?', mudouDia)
      
      // Só busca se não tem cache válido OU se mudou o dia (para recalcular renda fixa)
      if (!cacheValido || mudouDia) {
        console.log('🔄 Buscando dados do servidor... (recalcular renda fixa)')
        fetchInvestimentos()
      } else {
        console.log('✅ Usando cache, setando loading = false')
        setLoading(false)
      }
      return
    }

    // Recarregar apenas se o mês mudou
    if (previousMes.current !== mesKey) {
      console.log('📅 Mês mudou, recarregando...')
      previousMes.current = mesKey
      fetchInvestimentos()
    }
  }, [user, mesReferencia, fetchInvestimentos, investimentos.length])

  // Limpar cache quando o usuário sair
  useEffect(() => {
    if (!user) {
      sessionStorage.removeItem('investimentos_cache')
      sessionStorage.removeItem('investimentos_cache_time')
      lastFetchTimeRef.current = 0
    }
  }, [user])

  return {
    investimentos,
    transacoes,
    loading,
    mesReferencia,
    setMesReferencia,
    fetchInvestimentos,
    fetchTransacoes,
    getOrCreateInvestimento,
    adicionarTransacao,
    atualizarInvestimento,
    deletarInvestimento,
    getResumo
  }
}
