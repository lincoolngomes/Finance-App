
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
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  
  // Estados dos filtros
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth().toString())
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())

  useEffect(() => {
    if (!user) return

    const carregarPerfil = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', user.id)
          .single()
        
        if (!error && profile) {
          setUserProfile(profile)
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
      }
    }

    carregarPerfil()

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
    return transacoes.filter(transacao => {
      if (!transacao.quando) return false
      
      const transacaoDate = new Date(transacao.quando)
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
    
    const saldo = totalReceitas - totalDespesas
    
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
        userName={userProfile?.nome}
      />
      
      <DashboardStats stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardCharts transacoes={filteredTransacoes} />
        </div>
        <div>
          <DashboardSidebar lembretes={lembretes} />
        </div>
      </div>
    </div>
  )
}
