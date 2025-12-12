import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

export interface Investimento {
  id: string
  user_id: string
  tipo: 'acao' | 'renda_fixa' | 'cripto' | 'fii' | 'etf'
  codigo: string
  nome: string
  instituicao?: string
  quantidade: number
  preco_medio: number
  valor_total: number
  data_primeira_compra?: string
  ativo: boolean
  observacoes?: string
  created_at: string
  updated_at: string
  cotacao_atual?: number
  valor_atual?: number
  rentabilidade?: number
  rentabilidade_percentual?: number
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
  const [investimentos, setInvestimentos] = useState<Investimento[]>([])
  const [transacoes, setTransacoes] = useState<TransacaoInvestimento[]>([])
  const [loading, setLoading] = useState(true)
  const [mesReferencia, setMesReferencia] = useState<Date>(new Date())

  // Buscar investimentos
  const fetchInvestimentos = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('investimentos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Buscar cotações atualizadas
      const investimentosComCotacao = await Promise.all(
        (data || []).map(async (inv) => {
          const cotacao = await getCotacaoAtual(inv.codigo, inv.tipo)
          const valor_atual = cotacao ? inv.quantidade * cotacao : inv.valor_total
          const rentabilidade = valor_atual - inv.valor_total
          const rentabilidade_percentual = inv.valor_total > 0 
            ? (rentabilidade / inv.valor_total) * 100 
            : 0

          return {
            ...inv,
            cotacao_atual: cotacao,
            valor_atual,
            rentabilidade,
            rentabilidade_percentual
          }
        })
      )

      setInvestimentos(investimentosComCotacao)
    } catch (error: any) {
      toast({
        title: 'Erro ao buscar investimentos',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

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
    if (user) {
      fetchInvestimentos()
    }
  }, [user, mesReferencia])

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
