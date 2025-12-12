
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'

interface Transacao {
  id: number
  created_at: string
  quando: string | null
  estabelecimento: string | null
  valor: number | null
  detalhes: string | null
  tipo: string | null
  category_id: string
  account_id?: string | null
  userid: string | null
  categorias?: {
    id: string
    nome: string
  }
}

interface Lembrete {
  id: number
  created_at: string
  userid: string | null
  descricao: string | null
  data: string | null
  valor: number | null
}

export default function Dashboard() {
  const { user } = useAuth()
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [lembretes, setLembretes] = useState<Lembrete[]>([])
  const [contas, setContas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados dos filtros
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth().toString())
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
    try {
      setLoading(true)
      
      // Buscar transações
      const { data: transacoesData, error: transacoesError } = await supabase
        .from('transacoes')
        .select(`
          *,
          categorias!transacoes_category_id_fkey (
            id,
            nome
          )
        `)
        .eq('userid', user?.id)
        .order('created_at', { ascending: false })

      if (transacoesError) throw transacoesError

      // Buscar lembretes
      const { data: lembretesData, error: lembretesError } = await supabase
        .from('lembretes')
        .select('*')
        .eq('userid', user?.id)
        .order('data', { ascending: true })

      if (lembretesError) throw lembretesError

      setTransacoes(transacoesData || [])
      // Buscar contas do usuário (usadas para cálculo de saldo por conta)
      const { data: contasData, error: contasError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user?.id)

      if (!contasError) setContas(contasData || [])
      setLembretes(lembretesData || [])
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  fetchData()
}, [user])

  // Filtrar transações por mês e ano
  const filteredTransacoes = useMemo(() => {
    const parseToDate = (dateStr?: string | null) => {
      if (!dateStr) return null
      const s = String(dateStr).trim()

      // dd/mm/yyyy or d/m/yyyy
      const dmYMatch = s.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/)
      if (dmYMatch) {
        const d = Number(dmYMatch[1])
        const m = Number(dmYMatch[2])
        const y = Number(dmYMatch[3])
        const fullYear = y < 100 ? (2000 + y) : y
        // normalize to UTC midnight for the given date to avoid timezone shift
        const dt = new Date(Date.UTC(fullYear, m - 1, d))
        return isNaN(dt.getTime()) ? null : dt
      }

      // ISO or other formats -> normalize to UTC midnight of that date
      const dtIso = new Date(s)
      if (isNaN(dtIso.getTime())) return null
      const normalized = new Date(Date.UTC(dtIso.getUTCFullYear(), dtIso.getUTCMonth(), dtIso.getUTCDate()))
      return normalized
    }

    // normalize filter month: accept either 0-11 or 1-12 from the select
    const filterMonthIndex = (() => {
      const m = parseInt(filterMonth)
      if (isNaN(m)) return new Date().getMonth()
      return m > 11 ? m - 1 : m
    })()

    const filterYearNum = parseInt(filterYear) || new Date().getFullYear()

    return transacoes.filter(transacao => {
      const raw = (transacao.quando || transacao.created_at || '').toString().trim()
      const transacaoDate = parseToDate(raw)
      if (!transacaoDate) return false

      const transacaoMonth = transacaoDate.getUTCMonth()
      const transacaoYear = transacaoDate.getUTCFullYear()

      return transacaoMonth === filterMonthIndex && transacaoYear === filterYearNum
    })
  }, [transacoes, filterMonth, filterYear])

  // Calcular estatísticas
  // Saldo atual (global) — não deve depender do filtro de mês/ano
  const saldoAtual = useMemo(() => {
    // Soma do saldo inicial de todas as contas (valores absolutos)
    const totalSaldoInicial = contas.reduce((acc, conta) => {
      const s = (typeof conta.saldo_inicial !== 'undefined' && conta.saldo_inicial !== null)
        ? Number(conta.saldo_inicial)
        : (typeof conta.saldoInicial !== 'undefined' && conta.saldoInicial !== null ? Number(conta.saldoInicial) : 0)
      return acc + Math.abs(isNaN(s) ? 0 : s)
    }, 0)

    // Soma todas as receitas/despesas com valores absolutos
    const totalReceitas = transacoes.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)
    const totalDespesas = transacoes.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)

    // Saldo = saldo inicial + receitas - despesas (todos valores absolutos)
    return totalSaldoInicial + totalReceitas - totalDespesas
  }, [transacoes, contas])

  const stats = useMemo(() => {
    // Usa valores globais (todas as transações), não apenas filtradas
    const totalReceitas = transacoes
      .filter(t => t.tipo === 'receita')
      .reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)
    
    const totalDespesas = transacoes
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)
    
    // Saldo atual (global, não dependente do filtro)
    const saldo = saldoAtual
    
    const lembretesCount = lembretes.filter(l => {
      if (!l.data) return false
      const lembreteDate = new Date(l.data)
      return lembreteDate.getMonth() === parseInt(filterMonth) && 
             lembreteDate.getFullYear() === parseInt(filterYear)
    }).length

    return {
      totalReceitas,
      totalDespesas,
      saldo,
      transacoesCount: filteredTransacoes.length,
      lembretesCount
    }
  }, [transacoes, filteredTransacoes, lembretes, filterMonth, filterYear, saldoAtual])

  // (debug logs removed)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardFilters 
        filterMonth={filterMonth}
        filterYear={filterYear}
        setFilterMonth={setFilterMonth}
        setFilterYear={setFilterYear}
        transactionCount={filteredTransacoes.length}
      />
      
      <DashboardStats stats={stats} />
      
      <DashboardCharts 
        transacoes={filteredTransacoes} 
        recentTransacoes={transacoes} 
        contas={contas}
        lembretes={lembretes}
        selectedMonth={filterMonth}
        selectedYear={filterYear}
      />
    </div>
  )
}
