
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { getTransactionAbsoluteAmount, shouldIncludeTransactionByCardExpenseMode } from '@/utils/dashboard-classification'

export interface ReportTransaction {
  id: string
  created_at: string
  data: string | null
  descricao: string | null
  valor: number | null
  observacao: string | null
  tipo: string | null
  categoria_id: string
  conta_id?: string | null
  cartao_id?: string | null
  pago?: boolean | null
  status?: string | null
  metodo?: string | null
  categorias?: {
    id: string
    nome: string
  }
  accounts?: {
    id: string
    nome: string
    tipo?: string
  }
}

export interface ReportFilters {
  startDate: string
  endDate: string
  type: string
  categoryId: string
  period: 'day' | 'month' | 'year' | 'custom'
  month: string
  year: string
}

const padNumber = (value: number) => String(value).padStart(2, '0')

const buildMonthRange = (year: number, month: number) => {
  const daysInMonth = new Date(year, month, 0).getDate()

  return {
    startDate: `${year}-${padNumber(month)}-01`,
    endDate: `${year}-${padNumber(month)}-${padNumber(daysInMonth)}`,
  }
}

const buildYearRange = (year: number) => ({
  startDate: `${year}-01-01`,
  endDate: `${year}-12-31`,
})

export function useReports() {
  const { user } = useAuth()
  const isTransacaoPaga = (transaction: { pago?: boolean | null }) => transaction.pago === true
  
  // Inicializar com as datas do mês atual
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const { startDate: startOfMonth, endDate: endOfMonth } = buildMonthRange(currentYear, currentMonth)
  
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: startOfMonth,
    endDate: endOfMonth,
    type: '',
    categoryId: '',
    period: 'month',
    month: padNumber(currentMonth),
    year: String(currentYear),
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
          categorias (
            id,
            nome
          ),
          accounts (
            id,
            nome,
            tipo
          )
        `)
        .eq('user_id', user.id)
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

    // Apply date filters - usa data se disponível, senão usa created_at
    if (filters.startDate || filters.endDate) {
      const beforeFilter = filtered.length
      filtered = filtered.filter(t => {
        // Usa a mesma lógica do Dashboard para consistência
        const raw = (t.data || t.created_at || '').toString().trim()
        if (!raw) return false
        
        // Prioriza ISO format YYYY-MM-DD
        let dateObj: Date
        if (raw.match(/^\d{4}-\d{2}-\d{2}/)) {
          dateObj = new Date(raw + 'T00:00:00Z')
        } else {
          // Tenta parsear dd/mm/yyyy
          const dmYMatch = raw.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/)
          if (dmYMatch) {
            const d = Number(dmYMatch[1])
            const m = Number(dmYMatch[2])
            const y = Number(dmYMatch[3])
            const fullYear = y < 100 ? (2000 + y) : y
            dateObj = new Date(Date.UTC(fullYear, m - 1, d))
          } else {
            // Tenta ISO ou outros formatos
            dateObj = new Date(raw)
          }
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

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(t => t.tipo === filters.type)
    }

    // Apply category filter
    if (filters.categoryId) {
      filtered = filtered.filter(t => t.categoria_id === filters.categoryId)
    }

    const paidOnly = filtered.filter(isTransacaoPaga)
    const withoutInvoicePaymentDuplication = paidOnly.filter((transaction) =>
      shouldIncludeTransactionByCardExpenseMode(transaction, true, false)
    )

    console.log(
      `✅ Transações filtradas finais: ${filtered.length} | pagas: ${paidOnly.length} | visão relatório: ${withoutInvoicePaymentDuplication.length}`
    )
    return withoutInvoicePaymentDuplication
  }, [allTransactions, filters])

  // Calculate summary data
  const summaryData = useMemo(() => {
    const receitas = transactions
      .filter(t => t.tipo === 'receita')
      .reduce((acc, t) => acc + getTransactionAbsoluteAmount(t), 0)
    
    const despesas = transactions
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + getTransactionAbsoluteAmount(t), 0)
    
    const saldo = receitas - despesas

    // Group by category
    const byCategory = transactions.reduce((acc, transaction) => {
      const categoryName = transaction.categorias?.nome || 'Sem categoria'
      const valor = getTransactionAbsoluteAmount(transaction)
      
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
