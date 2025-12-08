
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'

interface Transacao {
  id: number
  created_at: string
  quando: string | null
  estabelecimento: string | null
  valor: number | null
  detalhes: string | null
  tipo: string | null
  category_id: string
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
      // dd/mm/yyyy
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [d, m, y] = String(dateStr).split('/')
        const dt = new Date(`${y}-${m}-${d}T00:00:00`)
        return isNaN(dt.getTime()) ? null : dt
      }
      // ISO or other formats
      const dt = new Date(dateStr)
      return isNaN(dt.getTime()) ? null : dt
    }

    return transacoes.filter(transacao => {
      const raw = transacao.quando || transacao.created_at
      const transacaoDate = parseToDate(raw)
      if (!transacaoDate) return false

      const transacaoMonth = transacaoDate.getMonth()
      const transacaoYear = transacaoDate.getFullYear()

      return transacaoMonth === parseInt(filterMonth) && 
             transacaoYear === parseInt(filterYear)
    })
  }, [transacoes, filterMonth, filterYear])

  // Calcular estatísticas
  const stats = useMemo(() => {
    const totalReceitas = filteredTransacoes
      .filter(t => t.tipo === 'receita')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    const totalDespesas = filteredTransacoes
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    // Calcula o saldo agregado usando a mesma regra da página Contas:
    // para cada conta: saldoInicial + receitasConta + despesasConta
    let saldoAggregate = 0
    contas.forEach(conta => {
      const saldoInicial = (typeof conta.saldo_inicial !== 'undefined' && conta.saldo_inicial !== null)
        ? Number(conta.saldo_inicial)
        : (typeof conta.saldoInicial !== 'undefined' && conta.saldoInicial !== null ? Number(conta.saldoInicial) : 0)

      const transacoesConta = transacoes.filter(t => t.account_id === conta.id)
      const receitasConta = transacoesConta.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + (Number(t.valor) || 0), 0)
      const despesasConta = transacoesConta.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + (Number(t.valor) || 0), 0)

      saldoAggregate += saldoInicial + receitasConta + despesasConta
    })

    const saldo = saldoAggregate
    
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
  }, [filteredTransacoes, lembretes, filterMonth, filterYear])

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
      {/* debug panel removed */}
      
      <DashboardStats stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
          <DashboardCharts transacoes={filteredTransacoes} recentTransacoes={transacoes} />
        </div>
        <div>
          <DashboardSidebar lembretes={lembretes} />
        </div>
      </div>
    </div>
  )
}
