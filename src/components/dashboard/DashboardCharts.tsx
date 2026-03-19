
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '/src/components/ui/card'
import { Button } from '/src/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '/src/components/ui/dialog'
import { formatCurrency } from '/src/utils/currency'
import { getTransactionMonth, parseToDateUTC } from '/src/utils/dateParser'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, ReferenceLine } from 'recharts'
import { Calendar, CreditCard, Landmark, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import {
  getInvestmentImpact,
  isInvestmentTransaction,
  shouldIncludeTransactionByCardExpenseMode,
  shouldIncludeTransactionInDashboardView,
} from '/src/utils/dashboard-classification'

// (Removido bloco duplicado da função DashboardCharts)

// Força o CSS do tooltip do Recharts para dark theme
const RechartsTooltipStyle = () => (
  <style>{`
    .recharts-default-tooltip, .recharts-tooltip-wrapper, .recharts-tooltip-wrapper .recharts-default-tooltip {
      background: #181a20 !important;
      border: 1px solid #333 !important;
      color: #f3f3f3 !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.85) !important;
      border-radius: 12px !important;
      font-size: 1rem !important;
      padding: 12px 16px !important;
      backdrop-filter: none !important;
      opacity: 1 !important;
    }
    .recharts-default-tooltip * {
      color: #f3f3f3 !important;
    }
    .recharts-tooltip-wrapper {
      background: transparent !important;
      box-shadow: none !important;
    }
  `}</style>
)

interface Transacao {
  id: string
  created_at: string
  data: string | null
  descricao: string | null
  valor: number | null
  observacao: string | null
  tipo: string | null
  categoria_id: string
  user_id: string | null
  conta_id?: string | null
  cartao_id?: string | null
  fatura_mes?: number | null
  fatura_ano?: number | null
  pago?: boolean | null
  categorias?: {
    id: string
    nome: string
  }
}

interface Lembrete {
  id: number
  created_at: string
  userid: string | null
  titulo: string | null
  descricao: string | null
  data: string | null
  valor: number | null
}

interface ContaResumo {
  id: string
  name?: string | null
}

interface CartaoResumo {
  id: string
  nome?: string | null
}

interface MonthlyChartDataPoint {
  monthKey: string
  month: string
  receitas: number
  despesas: number
  investimentos: number
}

interface MonthClickPayload {
  payload?: Partial<MonthlyChartDataPoint>
  monthKey?: string | number
  month?: string
}

interface DashboardChartsProps {
  transacoes: Transacao[]
  recentTransacoes?: Transacao[]
  contas?: ContaResumo[]
  cartoes?: CartaoResumo[]
  lembretes?: Lembrete[]
  selectedMonth?: string
  selectedYear?: string
  allTransactions?: Transacao[]
  showCardTransactions?: boolean
  useCardInvoicePayments?: boolean
  showPendingInMonthlyChart?: boolean
  showInvestmentsSeparately?: boolean
  hideValues?: boolean
  monthDetailsRequest?: {
    monthIndex: number
    year: number
    filter: Exclude<MonthModalFilter, 'all'>
    requestId: number
  } | null
  onOpenFatura?: (mes: string, ano: string) => void
}

interface CategoryDataItem {
  name: string
  value: number
  magnitude: number
}

type MonthModalFilter = 'all' | 'receitas' | 'despesas' | 'investimentos'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#84cc16']
const INVESTMENT_SERIES_COLOR = '#60a5fa'

const isSeparatedInvestmentTransaction = (showInvestmentsSeparately: boolean, transaction: Transacao) =>
  showInvestmentsSeparately && isInvestmentTransaction(transaction)

const getDisplayAmount = (showInvestmentsSeparately: boolean, transaction: Transacao) => {
  if (isSeparatedInvestmentTransaction(showInvestmentsSeparately, transaction)) {
    return getInvestmentImpact(transaction)
  }

  const value = Math.abs(Number(transaction.valor) || 0)
  return transaction.tipo === 'receita' ? value : -value
}

export function DashboardCharts({
  transacoes,
  recentTransacoes,
  contas = [],
  cartoes = [],
  lembretes = [],
  selectedMonth,
  selectedYear,
  allTransactions,
  showCardTransactions = false,
  useCardInvoicePayments = false,
  showPendingInMonthlyChart = false,
  showInvestmentsSeparately = false,
  hideValues = false,
  monthDetailsRequest,
  onOpenFatura,
}: DashboardChartsProps) {
  const isTransacaoPaga = (transacao: { pago?: boolean | null }) => transacao.pago === true

  const getLancamentoTimestamp = (t: Transacao) => {
    const raw = t.created_at || t.data
    if (!raw) return 0
    const dt = new Date(raw)
    return Number.isNaN(dt.getTime()) ? 0 : dt.getTime()
  }

  const formatLancamentoDate = (t: Transacao) => {
    const raw = t.created_at || t.data
    if (!raw) return '-'
    const dt = new Date(raw)
    if (Number.isNaN(dt.getTime())) return String(raw)
    return dt.toLocaleDateString('pt-BR')
  }

  const formatValue = (value: number) => (hideValues ? '••••••' : formatCurrency(value))
  const formatAxisValue = (value: number) => (hideValues ? '' : `R$ ${(value / 1000).toFixed(0)}k`)

  // Criar mapa de contas para exibir nome da conta
  const accountsMap = contas.reduce<Record<string, ContaResumo>>((acc, conta) => {
    acc[conta.id] = conta
    return acc
  }, {})

  // Criar mapa de cartões para exibir nome do cartão
  const cartoesMap = cartoes.reduce<Record<string, CartaoResumo>>((acc, cartao) => {
    acc[cartao.id] = cartao
    return acc
  }, {})

  // Filtra transações de cartão se showCardTransactions está desativado
  const allTransacoesRaw = allTransactions || recentTransacoes || transacoes
  const allTransacoes = allTransacoesRaw.filter((transacao) =>
    shouldIncludeTransactionByCardExpenseMode(transacao, showCardTransactions, useCardInvoicePayments)
  )

  if (import.meta.env.DEV) {
    const sample = allTransacoes.slice(0, 10).map(t => ({
      id: t.id,
      data: t.data,
      created_at: t.created_at,
      parsed_data: parseToDateUTC(t.data)?.toISOString() ?? null,
      parsed_created_at: parseToDateUTC(t.created_at)?.toISOString() ?? null
    }))
    console.debug('DashboardCharts sample dates:', sample)
  }

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [monthModalOpen, setMonthModalOpen] = useState(false)
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<MonthModalFilter>('all')
  const [selectedCategory, setSelectedCategory] = useState<{ name: string, tipo: 'receita' | 'despesa' | 'investimento' } | null>(null)
  const [selectedMonthData, setSelectedMonthData] = useState<{ monthIndex: number; year: number; label: string } | null>(null)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())

  const getCategoriesData = (tipo: 'receita' | 'despesa' | 'investimento'): CategoryDataItem[] => {
    const categorias: Record<string, number> = {}
    
    transacoes.forEach(t => {
      if (!t.valor) return

      if (tipo === 'receita') {
        if (t.tipo !== 'receita' || t.cartao_id) return
        if (isSeparatedInvestmentTransaction(showInvestmentsSeparately, t)) return
      } else if (tipo === 'investimento') {
        if (!isSeparatedInvestmentTransaction(showInvestmentsSeparately, t)) return
      } else {
        if (t.tipo !== 'despesa') return
        if (isSeparatedInvestmentTransaction(showInvestmentsSeparately, t)) return
      }

      const nomeCategoria = t.categorias?.nome || 'Sem categoria'
      const value = tipo === 'investimento'
        ? getInvestmentImpact(t)
        : Math.abs(Number(t.valor) || 0)
      categorias[nomeCategoria] = (categorias[nomeCategoria] || 0) + value
    })

    return Object.entries(categorias)
      .map(([name, value]) => ({ name, value, magnitude: Math.abs(value) }))
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, 8) // Limitar a 8 categorias para melhor visualização
  }

  const getCategoryTransactions = (categoryName: string, tipo: 'receita' | 'despesa' | 'investimento') => {
    return transacoes
      .filter(t => {
        const nome = t.categorias?.nome || 'Sem categoria'
        if (nome !== categoryName) return false
        if (tipo === 'receita') return t.tipo === 'receita' && !t.cartao_id && !isSeparatedInvestmentTransaction(showInvestmentsSeparately, t)
        if (tipo === 'investimento') return isSeparatedInvestmentTransaction(showInvestmentsSeparately, t)
        return t.tipo === 'despesa' && !isSeparatedInvestmentTransaction(showInvestmentsSeparately, t)
      })
      .sort((a, b) => {
        const dateA = parseToDateUTC(a.data)
        const dateB = parseToDateUTC(b.data)
        if (!dateA || !dateB) return 0
        return dateB.getTime() - dateA.getTime()
      })
  }

  const getReceitasDespesasData = () => {
    // Receitas: apenas de contas (receitas de cartão são pgto fatura/estorno, ignorar)
    const receitas = transacoes
      .filter(t => t.tipo === 'receita' && !t.cartao_id && !isSeparatedInvestmentTransaction(showInvestmentsSeparately, t))
      .reduce((sum, t) => sum + (Number(t.valor) || 0), 0)
    const despesas = transacoes
      .filter(t => t.tipo === 'despesa' && !isSeparatedInvestmentTransaction(showInvestmentsSeparately, t))
      .reduce((sum, t) => sum + Math.abs(Number(t.valor) || 0), 0)

    return [
      { name: 'Receitas', value: receitas },
      { name: 'Despesas', value: despesas }
    ]
  }

  const monthlyBalanceData = useMemo(() => {
    const currentYear = selectedYear ? parseInt(selectedYear) : new Date().getFullYear()
    const monthlyData: { [key: string]: { receitas: number; despesas: number; investimentos: number } } = {}
    
    // Inicializar todos os 12 meses do ano
    for (let month = 0; month < 12; month++) {
      const monthKey = String(month).padStart(2, '0')
      monthlyData[monthKey] = { receitas: 0, despesas: 0, investimentos: 0 }
    }

    // Agrupar transações por mês (usando TODAS as transações do ano selecionado)
    allTransacoes.forEach(t => {
      const tm = getTransactionMonth(t)
      if (!tm) return
      if (tm.year !== currentYear) return
      if (!shouldIncludeTransactionInDashboardView(t, showPendingInMonthlyChart)) return
      const monthKey = String(tm.month).padStart(2, '0')

      if (monthlyData[monthKey]) {
        if (t.tipo === 'receita') {
          if (isSeparatedInvestmentTransaction(showInvestmentsSeparately, t)) {
            monthlyData[monthKey].investimentos += getInvestmentImpact(t)
          } else {
            monthlyData[monthKey].receitas += Math.abs(Number(t.valor) || 0)
          }
        } else if (t.tipo === 'despesa') {
          if (isSeparatedInvestmentTransaction(showInvestmentsSeparately, t)) {
            monthlyData[monthKey].investimentos += getInvestmentImpact(t)
          } else {
            monthlyData[monthKey].despesas += Math.abs(Number(t.valor) || 0)
          }
        }
      }
    })

    // Converter para array ordenado (Janeiro a Dezembro)
    const result = Object.keys(monthlyData)
      .sort((a, b) => parseInt(a) - parseInt(b)) // Ordenar de 0 (Jan) a 11 (Dez)
      .map((key) => {
        const month = parseInt(key)
        const monthName = new Date(2000, month, 1).toLocaleDateString('pt-BR', { month: 'short' })
        return {
          monthKey: key,
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          receitas: parseFloat(monthlyData[key].receitas.toFixed(2)),
          despesas: parseFloat(monthlyData[key].despesas.toFixed(2)),
          investimentos: parseFloat(monthlyData[key].investimentos.toFixed(2))
        }
      })
    
    if (import.meta.env.DEV) {
      console.log('📊 GRÁFICO BARRAS:', {
        currentYear,
        showCardTransactions,
        useCardInvoicePayments,
        showPendingInMonthlyChart,
        showInvestmentsSeparately,
        totalAllTransacoes: allTransacoes.length,
        cartaoNoAll: allTransacoes.filter(t => t.cartao_id).length,
        contaNoAll: allTransacoes.filter(t => !t.cartao_id).length,
        meses: result.filter(m => m.receitas > 0 || m.despesas > 0 || m.investimentos > 0)
      })
    }
    
    return result
  }, [selectedYear, allTransacoes, showPendingInMonthlyChart, showCardTransactions, useCardInvoicePayments, showInvestmentsSeparately])

  const despesasDataAll = getCategoriesData('despesa')
  const receitasData = getCategoriesData('receita')
  const investimentosDataAll = getCategoriesData('investimento')
  const receitasDespesasData = getReceitasDespesasData()

  // Filtrar categorias visíveis
  const despesasData = despesasDataAll.filter(c => !hiddenCategories.has(c.name))
  const investimentosData = investimentosDataAll.filter(c => !hiddenCategories.has(c.name))

  const totalDespesasCategoria = despesasData.reduce((sum, c) => sum + c.value, 0)
  const totalReceitasCategoria = receitasData.reduce((sum, c) => sum + c.value, 0)
  const totalInvestimentosCategoria = investimentosData.reduce((sum, c) => sum + c.magnitude, 0)

  const handleCategoryClick = (categoryName: string, tipo: 'receita' | 'despesa' | 'investimento') => {
    setSelectedCategory({ name: categoryName, tipo })
    setCategoryModalOpen(true)
  }

  const handleMonthClick = (chartData: MonthClickPayload) => {
    const payload = chartData?.payload ?? chartData
    const monthIndex = Number(payload?.monthKey)
    if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return

    const year = selectedYear ? parseInt(selectedYear) : new Date().getFullYear()

    setSelectedMonthFilter('all')
    setSelectedMonthData({
      monthIndex,
      year: Number.isInteger(year) ? year : new Date().getFullYear(),
      label: payload?.month || new Date(2000, monthIndex, 1).toLocaleDateString('pt-BR', { month: 'short' })
    })
    setMonthModalOpen(true)
  }

  useEffect(() => {
    if (!monthDetailsRequest) return

    const { monthIndex, year, filter } = monthDetailsRequest
    if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return

    setSelectedMonthData({
      monthIndex,
      year,
      label: new Date(2000, monthIndex, 1).toLocaleDateString('pt-BR', { month: 'short' }),
    })
    setSelectedMonthFilter(filter)
    setMonthModalOpen(true)
  }, [monthDetailsRequest])

  const toggleCategoryVisibility = (categoryName: string) => {
    const newHidden = new Set(hiddenCategories)
    if (newHidden.has(categoryName)) {
      newHidden.delete(categoryName)
    } else {
      newHidden.add(categoryName)
    }
    setHiddenCategories(newHidden)
  }

  const selectedTransactions = selectedCategory 
    ? getCategoryTransactions(selectedCategory.name, selectedCategory.tipo)
    : []

  const totalSelectedCategory = selectedTransactions.reduce((sum, t) => {
    if (selectedCategory?.tipo === 'investimento') {
      return sum + Math.abs(getInvestmentImpact(t))
    }
    return sum + Math.abs(t.valor || 0)
  }, 0)

  const selectedCategoryNetTotal = selectedTransactions.reduce((sum, t) => {
    if (selectedCategory?.tipo === 'investimento') {
      return sum + getInvestmentImpact(t)
    }
    return sum + Math.abs(t.valor || 0)
  }, 0)

  const selectedMonthTransactions = useMemo(() => {
    if (!selectedMonthData) return []

    return allTransacoes
      .filter((t) => {
        const tm = getTransactionMonth(t)
        if (!tm) return false
        if (tm.year !== selectedMonthData.year || tm.month !== selectedMonthData.monthIndex) return false
        return shouldIncludeTransactionInDashboardView(t, showPendingInMonthlyChart)
      })
      .sort((a, b) => getLancamentoTimestamp(b) - getLancamentoTimestamp(a))
  }, [allTransacoes, selectedMonthData, showPendingInMonthlyChart])

  const selectedMonthTotals = useMemo(() => {
    return selectedMonthTransactions.reduce((acc, transacao) => {
      const valor = Math.abs(Number(transacao.valor) || 0)
      if (transacao.tipo === 'receita') {
        if (isSeparatedInvestmentTransaction(showInvestmentsSeparately, transacao)) {
          acc.investimentos += getInvestmentImpact(transacao)
        } else {
          acc.receitas += valor
        }
      } else if (transacao.tipo === 'despesa') {
        if (isSeparatedInvestmentTransaction(showInvestmentsSeparately, transacao)) {
          acc.investimentos += getInvestmentImpact(transacao)
        } else {
          acc.despesas += valor
        }
      }
      return acc
    }, { receitas: 0, despesas: 0, investimentos: 0 })
  }, [selectedMonthTransactions, showInvestmentsSeparately])

  const filteredSelectedMonthTransactions = useMemo(() => {
    if (selectedMonthFilter === 'all') return selectedMonthTransactions

    return selectedMonthTransactions.filter((transacao) => {
      const isInvestment = isSeparatedInvestmentTransaction(showInvestmentsSeparately, transacao)

      if (selectedMonthFilter === 'investimentos') {
        return isInvestment
      }

      if (isInvestment) return false

      if (selectedMonthFilter === 'receitas') return transacao.tipo === 'receita'
      if (selectedMonthFilter === 'despesas') return transacao.tipo === 'despesa'

      return true
    })
  }, [selectedMonthFilter, selectedMonthTransactions, showInvestmentsSeparately])

  const selectedMonthFilterLabel =
    selectedMonthFilter === 'receitas'
      ? 'Receitas'
      : selectedMonthFilter === 'despesas'
        ? 'Despesas'
        : selectedMonthFilter === 'investimentos'
          ? 'Investimentos'
          : 'Todos'

  const getMonthMetricCardClassName = (filter: Exclude<MonthModalFilter, 'all'>) => {
    const isActive = selectedMonthFilter === filter

    if (filter === 'receitas') {
      return isActive
        ? 'border-green-500/40 bg-green-500/10 shadow-sm'
        : 'hover:border-green-500/20 hover:bg-green-500/5'
    }

    if (filter === 'despesas') {
      return isActive
        ? 'border-red-500/40 bg-red-500/10 shadow-sm'
        : 'hover:border-red-500/20 hover:bg-red-500/5'
    }

    return isActive
      ? 'border-sky-500/40 bg-sky-500/10 shadow-sm'
      : 'hover:border-sky-500/20 hover:bg-sky-500/5'
  }

  const selectedMonthLabel = selectedMonthData
    ? `${selectedMonthData.label.replace('.', '')}/${selectedMonthData.year}`
    : ''
  const monthlyChartDescription = showPendingInMonthlyChart
    ? showInvestmentsSeparately
      ? 'Comparação entre receitas, despesas e investimentos liquidos, incluindo pendentes e faturas'
      : 'Comparação entre receitas e despesas mês a mês, incluindo pendentes e faturas'
    : showInvestmentsSeparately
      ? 'Comparação entre receitas, despesas e investimentos liquidos mês a mês'
      : 'Comparação entre receitas e despesas mês a mês'

  // Dados de faturas do cartão mês a mês (próximos 6 meses)
  const cartaoFaturas = useMemo(() => {
    if (!cartoes || cartoes.length === 0) return []
    
    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1 // 1-12
    const anoAtual = hoje.getFullYear()
    
    // Transações de cartão (despesas)
    const transacoesCartao = allTransacoesRaw.filter(t => t.cartao_id && t.tipo === 'despesa')
    
    // Detectar se é parcelada
    const parcelaRegex = /\d{1,2}\/\d{1,2}\s*$/
    const isParcelada = (t: Transacao) => {
      const desc = (t.descricao || '').trim()
      return parcelaRegex.test(desc)
    }
    
    // Gerar os próximos 6 meses
    const meses: { mes: number, ano: number, label: string, total: number, parcelado: number, avulso: number, pago: number, aberto: number }[] = []
    
    for (let i = 0; i < 6; i++) {
      let mes = mesAtual + i
      let ano = anoAtual
      if (mes > 12) {
        mes = mes - 12
        ano = anoAtual + 1
      }
      
      const nomeMes = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short' })
      const label = `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1).replace('.', '')}/${String(ano).slice(2)}`
      
      // Filtrar transações dessa fatura
      const transMes = transacoesCartao.filter(t => {
        if (t.fatura_mes && t.fatura_ano) {
          return t.fatura_mes === mes && t.fatura_ano === ano
        }
        const d = parseToDateUTC(t.data)
        if (!d) return false
        return (d.getMonth() + 1) === mes && d.getFullYear() === ano
      })
      
      const total = transMes.reduce((acc, t) => acc + Math.abs(t.valor || 0), 0)
      const parcelado = transMes.filter(t => isParcelada(t)).reduce((acc, t) => acc + Math.abs(t.valor || 0), 0)
      const avulso = Math.max(0, total - parcelado)
      const pago = transMes.filter(t => t.pago === true).reduce((acc, t) => acc + Math.abs(t.valor || 0), 0)
      const aberto = Math.max(0, total - pago)
      
      meses.push({ mes, ano, label, total, parcelado, avulso, pago, aberto })
    }
    
    return meses
  }, [cartoes, allTransacoesRaw])

  const maiorFatura = Math.max(...cartaoFaturas.map(f => f.total), 1)
  return (
    <div className="space-y-6">

      {/* Linha 1: Evolução Mensal (2/3) + Gastos no Cartão (1/3) */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Evolução Mensal - 2/3 */}
        <Card className="lg:col-span-2 overflow-hidden border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10">
                <span className="text-xl">📈</span>
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Evolução Mensal</CardTitle>
                <CardDescription className="text-xs">{monthlyChartDescription}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[320px] md:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBalanceData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.35)" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 13 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
                  />
                  <YAxis 
                    tickFormatter={formatAxisValue}
                    tick={{ fontSize: 13 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatValue(value)}
                    contentStyle={{
                      background: 'rgba(23, 23, 35, 0.95)',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#e5e7eb',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                      fontSize: 14,
                      padding: 12,
                    }}
                    cursor={false}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                    formatter={(value) => {
                      const labels: Record<string, string> = { receitas: 'Receitas', despesas: 'Despesas', investimentos: 'Investimentos' }
                      return labels[value] || value
                    }}
                  />
                  <Bar dataKey="receitas" fill="#10b981" name="Receitas" radius={[4, 4, 0, 0]} onClick={handleMonthClick} className="cursor-pointer" />
                  <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} onClick={handleMonthClick} className="cursor-pointer" />
                  {showInvestmentsSeparately && (
                    <Bar dataKey="investimentos" fill={INVESTMENT_SERIES_COLOR} name="Investimentos" radius={[4, 4, 0, 0]} onClick={handleMonthClick} className="cursor-pointer" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {showPendingInMonthlyChart
                ? showInvestmentsSeparately
                  ? 'Clique em uma barra para ver os lançamentos do mês, incluindo pendentes, faturas e a movimentacao liquida de investimentos.'
                  : 'Clique em uma barra para ver os lançamentos do mês, incluindo pendentes e despesas em fatura.'
                : showInvestmentsSeparately
                  ? 'Clique em uma barra para ver os lançamentos pagos do mês, com investimento liquido separado.'
                  : 'Clique em uma barra para ver os lançamentos pagos que compõem o mês.'}
            </p>
          </CardContent>
        </Card>

        {/* Faturas do Cartão por Mês - 1/3 */}
        <Card className="overflow-hidden border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/10 p-2.5">
                <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Faturas do Cartão</CardTitle>
                <CardDescription className="text-xs">Previsão dos próximos meses</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {cartaoFaturas.length > 0 ? (
              <div className="space-y-3">
                {cartaoFaturas.map((fatura, index) => {
                  const isMesAtual = index === 0
                  const percParcelado = fatura.total > 0 ? Math.round((fatura.parcelado / fatura.total) * 100) : 0
                  const avulsoRatio = fatura.total > 0 ? (fatura.avulso / fatura.total) * 100 : 0
                  return (
                    <div
                      key={index}
                      className={`space-y-1.5 cursor-pointer rounded-lg p-2 transition-colors ${
                        isMesAtual ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => onOpenFatura?.(String(fatura.mes).padStart(2, '0'), String(fatura.ano))}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isMesAtual ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{fatura.label}</span>
                        <div className="flex items-center gap-2">
                          {fatura.parcelado > 0 && fatura.avulso > 0 && (
                            <span className="text-[10px] font-semibold text-amber-400">{percParcelado}% parcelas</span>
                          )}
                          {fatura.total > 0 ? (
                            <span className={`text-base font-bold ${isMesAtual ? 'text-red-600 dark:text-red-400' : 'text-red-700 dark:text-rose-100'}`}>{formatValue(fatura.total)}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/70">
                        {fatura.total > 0 && (
                          <div
                            className="absolute h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${(fatura.total / maiorFatura) * 100}%`,
                              background: fatura.parcelado > 0 && fatura.avulso > 0
                                ? `linear-gradient(90deg, #ef4444 0%, #f43f5e ${avulsoRatio}%, #f97316 ${avulsoRatio}%, #f59e0b 100%)`
                                : fatura.parcelado > 0
                                  ? 'linear-gradient(90deg, #f97316 0%, #f59e0b 100%)'
                                  : 'linear-gradient(90deg, #ef4444 0%, #f43f5e 100%)'
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-xs text-muted-foreground">Nenhum cartão cadastrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Receitas, Despesas e Investimentos por Categoria */}
      <div className={`grid gap-6 grid-cols-1 ${showInvestmentsSeparately ? 'xl:grid-cols-3' : 'lg:grid-cols-2'}`}>
        {/* Receitas por Categoria */}
        <Card className="overflow-hidden border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Receitas por Categoria</CardTitle>
                <CardDescription className="text-xs">Top categorias com mais receitas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {receitasData.length > 0 ? (
              <div className="space-y-3">
                {receitasData.map((category, index) => {
                  const percentage = totalReceitasCategoria > 0 ? ((category.value / totalReceitasCategoria) * 100).toFixed(1) : 0
                  const barPercentage = (category.value / Math.max(...receitasData.map(c => c.value))) * 100
                  
                  return (
                    <div 
                      key={index} 
                      className="space-y-1.5 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
                      onClick={() => handleCategoryClick(category.name, 'receita')}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground truncate max-w-[140px]">
                          {category.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-green-600 dark:text-green-500">
                            {percentage}%
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {formatValue(category.value)}
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${barPercentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-xs text-muted-foreground">Nenhuma receita registrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Despesas por Categoria */}
        <Card className="overflow-hidden border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Despesas por Categoria</CardTitle>
                <CardDescription className="text-xs">Top categorias com mais gastos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {despesasData.length > 0 ? (
              <div className="space-y-3">
                {despesasData.map((category, index) => {
                  const percentage = totalDespesasCategoria > 0 ? ((category.value / totalDespesasCategoria) * 100).toFixed(1) : 0
                  const barPercentage = (category.value / Math.max(...despesasData.map(c => c.value))) * 100
                  
                  return (
                    <div 
                      key={index} 
                      className="space-y-1.5 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
                      onClick={() => handleCategoryClick(category.name, 'despesa')}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground truncate max-w-[140px]">
                          {category.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-red-600 dark:text-red-500">
                            {percentage}%
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {formatValue(category.value)}
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-gradient-to-r from-red-500 to-rose-600 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${barPercentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-xs text-muted-foreground">Nenhuma despesa registrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {showInvestmentsSeparately && (
          <Card className="overflow-hidden border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-sky-500/10">
                  <Landmark className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Investimentos por Categoria</CardTitle>
                  <CardDescription className="text-xs">Aportes, resgates e rendimentos separados de receitas e despesas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {investimentosData.length > 0 ? (
                <div className="space-y-3">
                  {investimentosData.map((category, index) => {
                    const percentage = totalInvestimentosCategoria > 0 ? ((category.magnitude / totalInvestimentosCategoria) * 100).toFixed(1) : 0
                    const barPercentage = (category.magnitude / Math.max(...investimentosData.map(c => c.magnitude), 1)) * 100

                    return (
                      <div
                        key={index}
                        className="space-y-1.5 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
                        onClick={() => handleCategoryClick(category.name, 'investimento')}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground truncate max-w-[140px]">
                            {category.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                              {percentage}%
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                              {formatValue(category.value)}
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="absolute h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${barPercentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <p className="text-xs text-muted-foreground">Nenhuma movimentação de investimento registrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Linha 3: Últimos Lançamentos (2/3) + Lembretes (1/3) */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Últimos Lançamentos - 2/3 */}
        <Card className="lg:col-span-2 overflow-hidden border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-slate-500/10">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Últimos Lançamentos</CardTitle>
                <CardDescription className="text-xs">Os 5 lançamentos mais recentes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              { allTransacoes
                .slice()
                .sort((a, b) => {
                  return getLancamentoTimestamp(b) - getLancamentoTimestamp(a)
                })
                .slice(0, 5)
                .map((transacao) => (
                    <div 
                      key={transacao.id} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          isSeparatedInvestmentTransaction(showInvestmentsSeparately, transacao)
                          ? 'bg-sky-500'
                          : transacao.tipo === 'receita'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`} />
                    <div>
                      <div className="font-medium text-sm">
                        {transacao.descricao || 'Sem descrição'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                          {transacao.categorias?.nome || 'Sem categoria'}
                          {transacao.cartao_id && cartoesMap[transacao.cartao_id] ? (
                            <> • 💳 {cartoesMap[transacao.cartao_id].nome}</>
                          ) : transacao.cartao_id ? (
                            <> • 💳 Cartão</>
                          ) : null}
                          {transacao.conta_id && accountsMap[transacao.conta_id] && (
                            <> • 🏦 {accountsMap[transacao.conta_id].name}</>
                          )}
                          {!transacao.cartao_id && !transacao.conta_id && ' • 🏦 Conta'}
                          {' • '}{formatLancamentoDate(transacao)}
                        </div>
                      </div>
                    </div>
                    <div className={`font-semibold text-sm ${
                      isSeparatedInvestmentTransaction(showInvestmentsSeparately, transacao)
                        ? 'text-sky-600 dark:text-sky-400'
                        : getDisplayAmount(showInvestmentsSeparately, transacao) >= 0
                          ? 'text-green-600 dark:text-green-500'
                          : 'text-red-600 dark:text-red-500'
                    }`}>
                      {formatValue(getDisplayAmount(showInvestmentsSeparately, transacao))}
                    </div>
                  </div>
                ))
              }
              {allTransacoes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma transação encontrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lembretes - 1/3 */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-teal-500/10">
                  <Calendar className="h-5 w-5 text-teal-600 dark:text-teal-500" />
                </div>
                <CardTitle className="text-lg font-semibold">Próximo Lembrete</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {(() => {
                const proximoLembrete = lembretes
                  .filter(l => l.data && new Date(l.data) >= new Date())
                  .sort((a, b) => new Date(a.data!).getTime() - new Date(b.data!).getTime())[0]
                
                return proximoLembrete ? (
                  <div className="space-y-2 p-4 rounded-lg border bg-card">
                    <p className="font-medium text-sm">{proximoLembrete.titulo}</p>
                    {proximoLembrete.descricao && (
                      <p className="text-xs text-muted-foreground">{proximoLembrete.descricao}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(proximoLembrete.data!).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {proximoLembrete.valor && (
                      <p className="text-base font-semibold text-teal-600 dark:text-teal-500">
                        {formatValue(proximoLembrete.valor)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="text-3xl mb-1 opacity-20">📅</div>
                    <p className="text-xs text-muted-foreground">Nenhum lembrete próximo</p>
                  </div>
                )
              })()}
            </CardContent>
          </Card>


        </div>
      </div>

      {/* Modal de Lançamentos por Categoria */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                selectedCategory?.tipo === 'receita'
                  ? 'bg-green-500/10'
                  : selectedCategory?.tipo === 'investimento'
                    ? 'bg-sky-500/10'
                    : 'bg-red-500/10'
              }`}>
                {selectedCategory?.tipo === 'receita' ? (
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-500" />
                ) : selectedCategory?.tipo === 'investimento' ? (
                  <Landmark className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
                )}
              </div>
              {selectedCategory?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTransactions.length} lançamento(s) • {selectedCategory?.tipo === 'investimento' ? 'Liquido' : 'Total'}: {formatValue(selectedCategory?.tipo === 'investimento' ? selectedCategoryNetTotal : totalSelectedCategory)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {selectedTransactions.length > 0 ? (
              selectedTransactions.map((transacao) => {
                const percentage = totalSelectedCategory > 0 
                  ? (((selectedCategory?.tipo === 'investimento' ? Math.abs(getInvestmentImpact(transacao)) : Math.abs(transacao.valor || 0)) / totalSelectedCategory) * 100).toFixed(1) 
                  : 0
                
                return (
                  <div 
                    key={transacao.id} 
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${
                            isSeparatedInvestmentTransaction(showInvestmentsSeparately, transacao)
                              ? 'bg-sky-500'
                              : getDisplayAmount(showInvestmentsSeparately, transacao) >= 0
                                ? 'bg-green-500'
                                : 'bg-red-500'
                          }`} />
                          <span className="font-semibold text-sm">
                            {transacao.descricao || 'Sem descrição'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {transacao.cartao_id && cartoesMap[transacao.cartao_id] ? (
                            <span>💳 {cartoesMap[transacao.cartao_id].nome} • </span>
                          ) : transacao.cartao_id ? (
                            <span>💳 Cartão • </span>
                          ) : transacao.conta_id && accountsMap[transacao.conta_id] ? (
                            <span>🏦 {accountsMap[transacao.conta_id].name} • </span>
                          ) : (
                            <span>🏦 Conta • </span>
                          )}
                          {(() => {
                            const raw = transacao.data ?? transacao.created_at
                            const parsed = parseToDateUTC(raw)
                            return parsed ? parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : String(raw || '')
                          })()}
                        </div>
                        {transacao.observacao && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {transacao.observacao}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-lg ${
                          isSeparatedInvestmentTransaction(showInvestmentsSeparately, transacao)
                            ? 'text-sky-600 dark:text-sky-400'
                            : getDisplayAmount(showInvestmentsSeparately, transacao) >= 0
                              ? 'text-green-600 dark:text-green-500'
                              : 'text-red-600 dark:text-red-500'
                        }`}>
                          {formatValue(getDisplayAmount(showInvestmentsSeparately, transacao))}
                        </div>
                        <div className={`text-xs font-semibold ${
                          isSeparatedInvestmentTransaction(showInvestmentsSeparately, transacao)
                            ? 'text-sky-600/70 dark:text-sky-400/70'
                            : getDisplayAmount(showInvestmentsSeparately, transacao) >= 0
                              ? 'text-green-600/70 dark:text-green-500/70'
                              : 'text-red-600/70 dark:text-red-500/70'
                        }`}>
                          {percentage}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Categoria</span>
                        <span className="font-medium">{transacao.categorias?.nome || 'Sem categoria'}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={monthModalOpen}
        onOpenChange={(open) => {
          setMonthModalOpen(open)
          if (!open) setSelectedMonthFilter('all')
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              {selectedMonthLabel ? `Lançamentos de ${selectedMonthLabel}` : 'Lançamentos do mês'}
            </DialogTitle>
            <DialogDescription>
              {selectedMonthTransactions.length} lançamento(s) considerados no gráfico
              {showPendingInMonthlyChart ? ' • incluindo pendentes e faturas' : ' • somente pagos'}
              {showInvestmentsSeparately ? ' • investimento liquido separado' : ''}
              {selectedMonthFilter !== 'all' ? ` • visualizando somente ${selectedMonthFilterLabel.toLowerCase()}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className={`grid gap-3 mt-4 ${showInvestmentsSeparately ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
            <button
              type="button"
              className={`rounded-lg border bg-card p-4 text-left transition-all ${getMonthMetricCardClassName('receitas')}`}
              onClick={() => setSelectedMonthFilter('receitas')}
              aria-pressed={selectedMonthFilter === 'receitas'}
            >
              <p className="text-xs text-muted-foreground">Receitas</p>
              <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-500">
                {formatValue(selectedMonthTotals.receitas)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {selectedMonthFilter === 'receitas' ? 'Filtrando a lista' : 'Clique para ver só receitas'}
              </p>
            </button>
            <button
              type="button"
              className={`rounded-lg border bg-card p-4 text-left transition-all ${getMonthMetricCardClassName('despesas')}`}
              onClick={() => setSelectedMonthFilter('despesas')}
              aria-pressed={selectedMonthFilter === 'despesas'}
            >
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="mt-1 text-lg font-semibold text-red-600 dark:text-red-500">
                {formatValue(selectedMonthTotals.despesas)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {selectedMonthFilter === 'despesas' ? 'Filtrando a lista' : 'Clique para ver só despesas'}
              </p>
            </button>
            {showInvestmentsSeparately && (
              <button
                type="button"
                className={`rounded-lg border bg-card p-4 text-left transition-all ${getMonthMetricCardClassName('investimentos')}`}
                onClick={() => setSelectedMonthFilter('investimentos')}
                aria-pressed={selectedMonthFilter === 'investimentos'}
              >
                <p className="text-xs text-muted-foreground">Investimentos</p>
                <p className="mt-1 text-lg font-semibold text-sky-600 dark:text-sky-400">
                  {formatValue(selectedMonthTotals.investimentos)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {selectedMonthFilter === 'investimentos' ? 'Filtrando a lista' : 'Clique para ver só investimentos'}
                </p>
              </button>
            )}
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Saldo do mês</p>
              <p className={`mt-1 text-lg font-semibold ${
                selectedMonthTotals.receitas - selectedMonthTotals.despesas >= 0
                  ? 'text-green-600 dark:text-green-500'
                  : 'text-red-600 dark:text-red-500'
              }`}>
                {formatValue(selectedMonthTotals.receitas - selectedMonthTotals.despesas)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {selectedMonthFilter === 'all'
                ? `Mostrando todos os ${filteredSelectedMonthTransactions.length} lançamentos do mês`
                : `Mostrando ${filteredSelectedMonthTransactions.length} lançamento(s) de ${selectedMonthFilterLabel.toLowerCase()}`}
            </div>
            {selectedMonthFilter !== 'all' && (
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedMonthFilter('all')}>
                Ver tudo
              </Button>
            )}
          </div>

          <div className="space-y-3 mt-4">
            {filteredSelectedMonthTransactions.length > 0 ? (
              filteredSelectedMonthTransactions.map((transacao) => (
                <div
                  key={transacao.id}
                  className="p-4 rounded-lg border bg-card hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${
                          isSeparatedInvestmentTransaction(showInvestmentsSeparately, transacao)
                            ? 'bg-sky-500'
                            : getDisplayAmount(showInvestmentsSeparately, transacao) >= 0
                              ? 'bg-green-500'
                              : 'bg-red-500'
                        }`} />
                        <span className="font-semibold text-sm">
                          {transacao.descricao || 'Sem descrição'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {transacao.categorias?.nome || 'Sem categoria'}
                        {transacao.cartao_id && cartoesMap[transacao.cartao_id] ? (
                          <> • 💳 {cartoesMap[transacao.cartao_id].nome}</>
                        ) : transacao.cartao_id ? (
                          <> • 💳 Cartão</>
                        ) : transacao.conta_id && accountsMap[transacao.conta_id] ? (
                          <> • 🏦 {accountsMap[transacao.conta_id].name}</>
                        ) : (
                          <> • 🏦 Conta</>
                        )}
                        {' • '}
                        {(() => {
                          const raw = transacao.data ?? transacao.created_at
                          const parsed = parseToDateUTC(raw)
                          return parsed ? parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : String(raw || '')
                        })()}
                      </div>
                      {transacao.observacao && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {transacao.observacao}
                        </div>
                      )}
                      <div className="mt-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isSeparatedInvestmentTransaction(showInvestmentsSeparately, transacao)
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                            : transacao.pago === true
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : transacao.cartao_id
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-slate-500/10 text-slate-500 dark:text-slate-400'
                        }`}>
                          {isSeparatedInvestmentTransaction(showInvestmentsSeparately, transacao)
                            ? 'Investimento'
                            : transacao.pago === true
                              ? 'Pago'
                              : transacao.cartao_id
                                ? 'Pendente em fatura'
                                : 'Pendente'}
                        </span>
                      </div>
                    </div>
                    <div className={`shrink-0 text-right font-bold text-base ${
                      isSeparatedInvestmentTransaction(showInvestmentsSeparately, transacao)
                        ? 'text-sky-600 dark:text-sky-400'
                        : getDisplayAmount(showInvestmentsSeparately, transacao) >= 0
                          ? 'text-green-600 dark:text-green-500'
                          : 'text-red-600 dark:text-red-500'
                    }`}>
                      {formatValue(getDisplayAmount(showInvestmentsSeparately, transacao))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {selectedMonthFilter === 'all'
                    ? 'Nenhum lançamento encontrado para este mês.'
                    : `Nenhum lançamento de ${selectedMonthFilterLabel.toLowerCase()} encontrado para este mês.`}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
