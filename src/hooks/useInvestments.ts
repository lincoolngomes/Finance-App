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
      if (cached) {
        const cachedTime = sessionStorage.getItem('investimentos_cache_time')
        if (cachedTime) {
          lastFetchTimeRef.current = parseInt(cachedTime)
        }
        return JSON.parse(cached)
      }
      return []
    } catch {
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
            } else if (inv.tipo === 'renda_fixa' && inv.data_aplicacao && inv.data_vencimento) {
              // Calcular rentabilidade de renda fixa com base na curva
              dadosAdicionais = calcularRendaFixa(inv)
              valor_atual = dadosAdicionais.valor_atual
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
      const { data, error } = await supabase
        .from('investimentos')
        .insert({
          user_id: user.id,
          tipo: dados.tipo!,
          codigo: dados.codigo!,
          nome: dados.nome!,
          instituicao: dados.instituicao,
          quantidade: 0,
          preco_medio: 0,
          ativo: true,
          observacoes: dados.observacoes
        })
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
    
    let taxaAnual = inv.taxa_percentual || 0
    
    // Para taxas pós-fixadas, multiplicar pelo indexador (CDI estimado ~13.65% aa em 2025)
    if (inv.tipo_rentabilidade === 'pos' && inv.indexador === 'cdi') {
      const cdiEstimado = 13.65 // Taxa Selic atual
      taxaAnual = (taxaAnual / 100) * cdiEstimado
    } else if (inv.tipo_rentabilidade === 'ipca') {
      const ipcaEstimado = 4.5 // IPCA estimado
      taxaAnual = taxaAnual + ipcaEstimado
    }
    
    // Calcular rendimento bruto acumulado (juros compostos diários)
    const taxaDiaria = Math.pow(1 + (taxaAnual / 100), 1 / 252) - 1 // 252 dias úteis
    const fatorRendimento = Math.pow(1 + taxaDiaria, diasAplicado)
    const valorBruto = inv.valor_total * fatorRendimento
    
    // Calcular IR (tabela regressiva)
    let aliquotaIR = 0.225 // 22,5% até 180 dias
    if (diasAplicado > 720) aliquotaIR = 0.15 // 15% acima de 720 dias
    else if (diasAplicado > 360) aliquotaIR = 0.175 // 17,5% de 361 a 720 dias
    else if (diasAplicado > 180) aliquotaIR = 0.20 // 20% de 181 a 360 dias
    
    const rendimentoBruto = valorBruto - inv.valor_total
    const irRetido = rendimentoBruto * aliquotaIR
    const valorLiquido = valorBruto - irRetido
    
    // Projeção no vencimento
    const fatorVencimento = Math.pow(1 + taxaDiaria, diasTotais)
    const valorBrutoVencimento = inv.valor_total * fatorVencimento
    const rendimentoVencimento = valorBrutoVencimento - inv.valor_total
    
    let aliquotaIRVencimento = 0.15
    if (diasTotais <= 720) aliquotaIRVencimento = 0.175
    if (diasTotais <= 360) aliquotaIRVencimento = 0.20
    if (diasTotais <= 180) aliquotaIRVencimento = 0.225
    
    const irVencimento = rendimentoVencimento * aliquotaIRVencimento
    const rentabilidadeProjetada = ((valorBrutoVencimento - irVencimento) / inv.valor_total - 1) * 100
    
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
    const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
    
    // Se tem cache válido (menos de 5 minutos), não recarrega
    const cacheValido = (now - lastFetchTimeRef.current) < CACHE_DURATION && investimentos.length > 0
    
    // Carregar na primeira montagem
    if (isInitialMount.current) {
      isInitialMount.current = false
      previousMes.current = mesKey
      
      // Só busca se não tem cache válido
      if (!cacheValido) {
        fetchInvestimentos()
      } else {
        setLoading(false)
      }
      return
    }

    // Recarregar apenas se o mês mudou
    if (previousMes.current !== mesKey) {
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
