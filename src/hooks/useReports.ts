
import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface ReportTransaction {
  id: number
  created_at: string
  quando: string | null
  estabelecimento: string | null
  valor: number | null
  detalhes: string | null
  tipo: string | null
  category_id: string
  categorias?: {
    id: string
    nome: string
  }
}

export interface ReportFilters {
  startDate: string
  endDate: string
  type: string
  categoryId: string
  period: 'day' | 'month' | 'year' | 'custom'
}

export function useReports() {
  const { user } = useAuth()
  
  // Inicializar com as datas do mês atual
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: startOfMonth,
    endDate: endOfMonth,
    type: '',
    categoryId: '',
    period: 'month'
  })

  const { data: allTransactions = [], isLoading } = useQuery({
    queryKey: ['report-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      console.log('📊 Buscando transações para relatório, userId:', user.id)
      
      const { data, error } = await supabase
        .from('transacoes')
        .select(`
          *,
          categorias!transacoes_category_id_fkey (
            id,
            nome
          )
        `)
        .eq('userid', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Erro ao buscar transações para relatório:', error)
        throw error
      }
      
      console.log('✅ Transações carregadas:', data?.length || 0)
      return data as ReportTransaction[]
    },
    enabled: !!user?.id,
  })

  // Filter transactions on the client side
  const transactions = useMemo(() => {
    console.log('🔍 Filtrando transações. Total:', allTransactions.length, 'Filtros:', filters)
    let filtered = [...allTransactions]

    // ⚠️ TEMPORÁRIO: Desabilitar filtro de datas para exibir todos os dados
    // TODO: Corrigir a lógica de parsing de datas
    /*
    // Apply date filters - usa quando se disponível, senão usa created_at
    if (filters.startDate || filters.endDate) {
      const beforeFilter = filtered.length
      filtered = filtered.filter(t => {
        // Usa a mesma lógica do Dashboard para consistência
        const raw = (t.quando || t.created_at || '').toString().trim()
        if (!raw) return false
        
        // Tenta parsear dd/mm/yyyy primeiro
        const dmYMatch = raw.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/)
        let dateObj: Date
        
        if (dmYMatch) {
          const d = Number(dmYMatch[1])
          const m = Number(dmYMatch[2])
          const y = Number(dmYMatch[3])
          const fullYear = y < 100 ? (2000 + y) : y
          dateObj = new Date(Date.UTC(fullYear, m - 1, d))
        } else {
          // Tenta ISO ou outros formatos
          const dtIso = new Date(raw)
          if (isNaN(dtIso.getTime())) return false
          dateObj = new Date(Date.UTC(dtIso.getUTCFullYear(), dtIso.getUTCMonth(), dtIso.getUTCDate()))
        }
        
        if (isNaN(dateObj.getTime())) return false
        
        // Normaliza a data para comparação (apenas a parte da data, sem hora)
        const year = dateObj.getUTCFullYear()
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
        const day = String(dateObj.getUTCDate()).padStart(2, '0')
        const transDate = `${year}-${month}-${day}`
        
        if (filters.startDate && transDate < filters.startDate) return false
        if (filters.endDate && transDate > filters.endDate) return false
        
        return true
      })
      console.log(`📅 Após filtro de datas: ${filtered.length} transações (removidas ${beforeFilter - filtered.length})`)
    }
    */

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(t => t.tipo === filters.type)
    }

    // Apply category filter
    if (filters.categoryId) {
      filtered = filtered.filter(t => t.category_id === filters.categoryId)
    }

    console.log(`✅ Transações filtradas finais: ${filtered.length}`)
    return filtered
  }, [allTransactions, filters])

  // Calculate summary data
  const summaryData = useMemo(() => {
    const receitas = transactions
      .filter(t => t.tipo === 'receita')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    const despesas = transactions
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    const saldo = receitas - despesas

    // Group by category
    const byCategory = transactions.reduce((acc, transaction) => {
      const categoryName = transaction.categorias?.nome || 'Sem categoria'
      const valor = transaction.valor || 0
      
      if (!acc[categoryName]) {
        acc[categoryName] = { receitas: 0, despesas: 0, total: 0 }
      }
      
      if (transaction.tipo === 'receita') {
        acc[categoryName].receitas += valor
      } else {
        acc[categoryName].despesas += valor
      }
      
      acc[categoryName].total = acc[categoryName].receitas - acc[categoryName].despesas
      
      return acc
    }, {} as Record<string, { receitas: number; despesas: number; total: number }>)

    // Group by type for chart data
    const chartData = [
      { name: 'Receitas', value: receitas, color: '#22c55e' },
      { name: 'Despesas', value: despesas, color: '#ef4444' }
    ]

    return {
      receitas,
      despesas,
      saldo,
      byCategory,
      chartData,
      totalTransactions: transactions.length
    }
  }, [transactions])

  return {
    transactions,
    isLoading,
    filters,
    setFilters,
    summaryData
  }
}
