import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  Brain,
  Calendar,
  Download,
  LineChart as LineChartIcon,
  PiggyBank,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useReports } from '@/hooks/useReports'
import { useAuth } from '@/hooks/useAuth'
import { ReportFiltersComponent } from '@/components/reports/ReportFilters'
import { PDFExportOptions as PDFOptions, PDFExportOptions } from '@/components/reports/PDFExportOptions'
import { toast } from '@/hooks/use-toast'
import { generatePDFReport } from '@/utils/pdfGenerator'
import { formatCurrency } from '@/utils/currency'
import { getInvestmentImpact, getTransactionAbsoluteAmount, isInvestmentTransaction } from '@/utils/dashboard-classification'

type FlowPoint = {
  label: string
  receitas: number
  despesas: number
  saldo: number
}

type CategorySummary = {
  name: string
  total: number
  count: number
  percentage: number
}

type DecisionItem = {
  title: string
  description: string
  tone: 'good' | 'warn' | 'neutral'
}

function parseTransactionDate(value: string | null | undefined) {
  const raw = String(value || '').trim()
  if (!raw) return null

  if (raw.match(/^\d{4}-\d{2}-\d{2}/)) {
    const parsed = new Date(`${raw.slice(0, 10)}T00:00:00Z`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const brDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (brDate) {
    const day = Number(brDate[1])
    const month = Number(brDate[2]) - 1
    const year = Number(brDate[3]) < 100 ? 2000 + Number(brDate[3]) : Number(brDate[3])
    const parsed = new Date(Date.UTC(year, month, day))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const fallback = new Date(raw)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

function getPeriodLabel(period: string, startDate: string, endDate: string) {
  const monthFromDate = startDate ? Number(startDate.slice(5, 7)) : null
  const yearFromDate = startDate ? startDate.slice(0, 4) : ''
  const monthNames = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ]

  switch (period) {
    case 'day':
      return 'Hoje'
    case 'month':
      if (monthFromDate && yearFromDate) {
        return `${monthNames[monthFromDate - 1]} de ${yearFromDate}`
      }
      return 'Mês selecionado'
    case 'year':
      return yearFromDate || 'Ano selecionado'
    case 'custom':
      if (startDate && endDate) {
        return `${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`
      }
      return 'Período personalizado'
    default:
      return 'Período selecionado'
  }
}

function buildDecisionItems(params: {
  receitas: number
  despesas: number
  resultado: number
  commitmentRate: number
  savingsRate: number
  investmentNet: number
  topCategory: CategorySummary | null
}): DecisionItem[] {
  const {
    receitas,
    despesas,
    resultado,
    commitmentRate,
    savingsRate,
    investmentNet,
    topCategory,
  } = params

  const items: DecisionItem[] = []

  if (receitas <= 0 && despesas > 0) {
    items.push({
      title: 'Sem entradas no recorte',
      tone: 'warn',
      description: 'Há despesas pagas, mas nenhuma receita paga no período filtrado.',
    })
  } else if (resultado >= 0) {
    items.push({
      title: 'Resultado positivo',
      tone: 'good',
      description: `Sobrou ${formatCurrency(resultado)} depois das despesas do dia a dia.`,
    })
  } else {
    items.push({
      title: 'Resultado negativo',
      tone: 'warn',
      description: `Faltaram ${formatCurrency(Math.abs(resultado))} para fechar o período no azul.`,
    })
  }

  if (topCategory && topCategory.percentage >= 30) {
    items.push({
      title: 'Maior ponto de atenção',
      tone: 'neutral',
      description: `${topCategory.name} representa ${topCategory.percentage.toFixed(1)}% das despesas operacionais.`,
    })
  }

  if (investmentNet > 0) {
    items.push({
      title: 'Aporte em investimentos',
      tone: 'neutral',
      description: `${formatCurrency(investmentNet)} foram direcionados para investimentos e ficaram fora da despesa operacional.`,
    })
  } else if (investmentNet < 0) {
    items.push({
      title: 'Resgate líquido',
      tone: 'neutral',
      description: `Houve resgate líquido de ${formatCurrency(Math.abs(investmentNet))} no período.`,
    })
  }

  if (receitas > 0 && commitmentRate >= 90) {
    items.push({
      title: 'Receita muito comprometida',
      tone: 'warn',
      description: `${commitmentRate.toFixed(1)}% das entradas já foram consumidas por despesas operacionais.`,
    })
  } else if (receitas > 0 && savingsRate >= 20) {
    items.push({
      title: 'Boa margem de sobra',
      tone: 'good',
      description: `${savingsRate.toFixed(1)}% da receita continuou disponível após os gastos.`,
    })
  }

  return items.slice(0, 3)
}

function LoadingState() {
  return (
    <div className="space-y-6 p-6">
      {[...Array(4)].map((_, index) => (
        <Card key={index} className="animate-pulse border-slate-800 bg-slate-950/40">
          <CardContent className="p-6">
            <div className="h-24 rounded-xl bg-slate-900/70" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function Relatorios() {
  const { user } = useAuth()
  const { transactions, isLoading, filters, setFilters } = useReports()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const periodLabel = useMemo(
    () => getPeriodLabel(filters.period, filters.startDate, filters.endDate),
    [filters.period, filters.startDate, filters.endDate]
  )

  const investmentTransactions = useMemo(
    () => transactions.filter((transaction) => isInvestmentTransaction(transaction)),
    [transactions]
  )

  const coreTransactions = useMemo(
    () => transactions.filter((transaction) => !isInvestmentTransaction(transaction)),
    [transactions]
  )

  const receitas = useMemo(
    () =>
      coreTransactions
        .filter((transaction) => transaction.tipo === 'receita')
        .reduce((sum, transaction) => sum + getTransactionAbsoluteAmount(transaction), 0),
    [coreTransactions]
  )

  const despesas = useMemo(
    () =>
      coreTransactions
        .filter((transaction) => transaction.tipo === 'despesa')
        .reduce((sum, transaction) => sum + getTransactionAbsoluteAmount(transaction), 0),
    [coreTransactions]
  )

  const resultado = receitas - despesas
  const commitmentRate = receitas > 0 ? (despesas / receitas) * 100 : 0
  const savingsRate = receitas > 0 ? (resultado / receitas) * 100 : 0
  const investmentNet = useMemo(
    () => investmentTransactions.reduce((sum, transaction) => sum + getInvestmentImpact(transaction), 0),
    [investmentTransactions]
  )

  const topExpenses = useMemo(
    () =>
      coreTransactions
        .filter((transaction) => transaction.tipo === 'despesa')
        .sort((a, b) => getTransactionAbsoluteAmount(b) - getTransactionAbsoluteAmount(a))
        .slice(0, 5),
    [coreTransactions]
  )

  const topIncomes = useMemo(
    () =>
      coreTransactions
        .filter((transaction) => transaction.tipo === 'receita')
        .sort((a, b) => getTransactionAbsoluteAmount(b) - getTransactionAbsoluteAmount(a))
        .slice(0, 5),
    [coreTransactions]
  )

  const expenseCategories = useMemo<CategorySummary[]>(() => {
    const grouped = new Map<string, { total: number; count: number }>()

    coreTransactions
      .filter((transaction) => transaction.tipo === 'despesa')
      .forEach((transaction) => {
        const name = transaction.categorias?.nome || 'Sem categoria'
        const current = grouped.get(name) || { total: 0, count: 0 }
        current.total += getTransactionAbsoluteAmount(transaction)
        current.count += 1
        grouped.set(name, current)
      })

    return Array.from(grouped.entries())
      .map(([name, values]) => ({
        name,
        total: values.total,
        count: values.count,
        percentage: despesas > 0 ? (values.total / despesas) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [coreTransactions, despesas])

  const flowData = useMemo<FlowPoint[]>(() => {
    const grouped = new Map<string, FlowPoint>()

    coreTransactions.forEach((transaction) => {
      const date = parseTransactionDate(transaction.data || transaction.created_at)
      if (!date) return

      const useMonthlyBuckets = filters.period === 'year'
      const label = useMonthlyBuckets
        ? date.toLocaleDateString('pt-BR', { month: 'short' })
        : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      const key = useMonthlyBuckets
        ? `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`
        : `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`

      const current = grouped.get(key) || { label, receitas: 0, despesas: 0, saldo: 0 }
      const amount = getTransactionAbsoluteAmount(transaction)

      if (transaction.tipo === 'receita') {
        current.receitas += amount
      } else {
        current.despesas += amount
      }

      current.saldo = current.receitas - current.despesas
      grouped.set(key, current)
    })

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value)
      .slice(-12)
  }, [coreTransactions, filters.period])

  const topCategory = expenseCategories[0] || null
  const decisionItems = buildDecisionItems({
    receitas,
    despesas,
    resultado,
    commitmentRate,
    savingsRate,
    investmentNet,
    topCategory,
  })

  const exportSummary = useMemo(() => {
    const byCategory = coreTransactions.reduce((acc, transaction) => {
      const categoryName = transaction.categorias?.nome || 'Sem categoria'
      const value = getTransactionAbsoluteAmount(transaction)

      if (!acc[categoryName]) {
        acc[categoryName] = { receitas: 0, despesas: 0, total: 0 }
      }

      if (transaction.tipo === 'receita') {
        acc[categoryName].receitas += value
      } else {
        acc[categoryName].despesas += value
      }

      acc[categoryName].total = acc[categoryName].receitas - acc[categoryName].despesas
      return acc
    }, {} as Record<string, { receitas: number; despesas: number; total: number }>)

    return {
      receitas,
      despesas,
      saldo: resultado,
      byCategory,
      chartData: [
        { name: 'Receitas', value: receitas, color: '#22c55e' },
        { name: 'Despesas', value: despesas, color: '#ef4444' },
      ],
      totalTransactions: coreTransactions.length,
    }
  }, [coreTransactions, despesas, receitas, resultado])

  const clearFilters = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()

    setFilters({
      startDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
      endDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`,
      type: '',
      categoryId: '',
      period: 'month',
      month: String(currentMonth).padStart(2, '0'),
      year: String(currentYear),
    })
  }

  const generatePDF = async (options: PDFOptions) => {
    setIsGeneratingPDF(true)
    try {
      generatePDFReport(
        {
          transactions: coreTransactions,
          summaryData: exportSummary,
          filters,
          userName: user?.user_metadata?.nome || user?.email || 'Usuário',
          analytics: {
            saudeFinanceira: 0,
            taxaPoupanca: savingsRate,
            taxaGasto: commitmentRate,
            mediaDiaria: 0,
            mediaSemanal: 0,
            mediaMensal: 0,
            ticketMedio: despesas > 0 ? despesas / Math.max(1, coreTransactions.filter((t) => t.tipo === 'despesa').length) : 0,
            maiorDespesa: getTransactionAbsoluteAmount(topExpenses[0]),
            maiorDespesaItem: topExpenses[0] || null,
            categoriaMaisGasta: topCategory ? [topCategory.name, { total: topCategory.total }] : null,
            projecaoMes: 0,
            tendencia: 0,
            insights: decisionItems.map((item) => item.description),
          },
        },
        options
      )

      toast({
        title: 'PDF gerado com sucesso',
        description: 'O relatório foi exportado em formato PDF.',
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Ocorreu um erro ao exportar o relatório.',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <Badge className="w-fit border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-cyan-200">
            Relatório enxuto
          </Badge>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Relatórios</h1>
            <p className="mt-2 max-w-3xl text-base text-slate-400">
              Uma leitura executiva do período, com foco em caixa do dia a dia, concentração de gastos e principais movimentos.
            </p>
          </div>
        </div>

        <div className="w-full xl:w-auto">
          <PDFExportOptions
            onExport={generatePDF}
            isGenerating={isGeneratingPDF}
            disabled={coreTransactions.length === 0}
          />
        </div>
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

      {coreTransactions.length === 0 ? (
        <Card className="border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))]">
          <CardContent className="flex flex-col items-center gap-4 p-14 text-center">
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
              <LineChartIcon className="h-10 w-10 text-cyan-300" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-100">Sem dados operacionais no período</h2>
              <p className="max-w-xl text-sm text-slate-400">
                Ajuste o intervalo acima ou registre transações pagas para gerar uma leitura útil das finanças.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.75fr,0.95fr]">
            <Card className="overflow-hidden border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]">
              <CardContent className="p-0">
                <div className="border-b border-slate-800/80 px-6 py-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Resumo do período</p>
                      <h2 className="mt-2 text-3xl font-semibold text-slate-50">{periodLabel}</h2>
                      <p className="mt-2 text-sm text-slate-400">
                        {coreTransactions.length} lançamentos pagos considerados, sem duplicar pagamento de fatura.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resultado do período</p>
                      <p className={`mt-2 text-2xl font-semibold ${resultado >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {formatCurrency(resultado)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-px bg-slate-800/70 sm:grid-cols-2 2xl:grid-cols-4">
                  {[
                    {
                      label: 'Receitas',
                      value: receitas,
                      note: 'Entradas operacionais',
                      icon: ArrowUpRight,
                      tone: 'text-emerald-300',
                      bg: 'bg-emerald-500/10',
                      formatter: (value: number) => formatCurrency(value),
                    },
                    {
                      label: 'Despesas',
                      value: despesas,
                      note: 'Saídas operacionais',
                      icon: ArrowDownRight,
                      tone: 'text-red-300',
                      bg: 'bg-red-500/10',
                      formatter: (value: number) => formatCurrency(value),
                    },
                    {
                      label: 'Comprometimento',
                      value: commitmentRate,
                      note: 'Quanto da receita foi consumido',
                      icon: BadgeDollarSign,
                      tone: commitmentRate <= 80 ? 'text-cyan-300' : 'text-amber-300',
                      bg: 'bg-cyan-500/10',
                      formatter: (value: number) => `${value.toFixed(1)}%`,
                    },
                    {
                      label: 'Investimentos líquidos',
                      value: investmentNet,
                      note: 'Aportes, resgates e rendimentos',
                      icon: PiggyBank,
                      tone: investmentNet >= 0 ? 'text-blue-300' : 'text-amber-300',
                      bg: 'bg-blue-500/10',
                      formatter: (value: number) => formatCurrency(value),
                    },
                  ].map((item) => {
                    const Icon = item.icon

                    return (
                      <div key={item.label} className="min-w-0 bg-slate-950/60 p-5">
                        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${item.bg}`}>
                          <Icon className={`h-5 w-5 ${item.tone}`} />
                        </div>
                        <p className="text-sm text-slate-400">{item.label}</p>
                        <p
                          className={`mt-1 text-[clamp(2rem,2.2vw,2.75rem)] font-semibold leading-none tracking-tight tabular-nums [overflow-wrap:anywhere] ${item.tone}`}
                        >
                          {item.formatter(item.value)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">{item.note}</p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-[linear-gradient(180deg,rgba(8,15,30,0.96),rgba(3,7,18,0.98))]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-slate-50">
                  <Brain className="h-5 w-5 text-cyan-300" />
                  Leitura rápida
                </CardTitle>
                <CardDescription className="text-slate-400">
                  O que vale atenção primeiro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {decisionItems.map((item) => (
                  <div
                    key={item.title}
                    className={`rounded-2xl border p-4 ${
                      item.tone === 'good'
                        ? 'border-emerald-500/20 bg-emerald-500/10'
                        : item.tone === 'warn'
                          ? 'border-amber-500/20 bg-amber-500/10'
                          : 'border-slate-700/70 bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {item.tone === 'good' ? (
                        <TrendingUp className="h-4 w-4 text-emerald-300" />
                      ) : item.tone === 'warn' ? (
                        <TrendingDown className="h-4 w-4 text-amber-300" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-cyan-300" />
                      )}
                      <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.45fr,0.95fr]">
            <Card className="border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))]">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-50">Fluxo operacional</CardTitle>
                <CardDescription className="text-slate-400">
                  Entradas, saídas e saldo do dia a dia. Investimentos ficaram separados.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={flowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                      <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                      <YAxis
                        stroke="#94a3b8"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => formatCurrency(Number(value))}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(15,23,42,0.42)' }}
                        contentStyle={{
                          background: '#020617',
                          border: '1px solid rgba(51,65,85,0.9)',
                          borderRadius: '16px',
                          color: '#e2e8f0',
                        }}
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          name === 'receitas' ? 'Receitas' : name === 'despesas' ? 'Despesas' : 'Saldo',
                        ]}
                      />
                      <ReferenceLine y={0} stroke="rgba(148,163,184,0.35)" />
                      <Bar dataKey="receitas" name="receitas" fill="#22c55e" radius={[8, 8, 0, 0]} maxBarSize={34} />
                      <Bar dataKey="despesas" name="despesas" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={34} />
                      <Line type="monotone" dataKey="saldo" name="saldo" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3, fill: '#38bdf8' }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-[linear-gradient(180deg,rgba(8,15,30,0.96),rgba(3,7,18,0.98))]">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-50">Onde o dinheiro saiu</CardTitle>
                <CardDescription className="text-slate-400">
                  Categorias de despesa do dia a dia com maior peso.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {expenseCategories.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-400">
                    Não há despesas operacionais neste recorte.
                  </div>
                ) : (
                  expenseCategories.map((category) => (
                    <div key={category.name} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-100">{category.name}</p>
                          <p className="text-xs text-slate-500">{category.count} lançamentos</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-200">{formatCurrency(category.total)}</p>
                          <p className="text-xs text-cyan-300">{category.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-300"
                          style={{ width: `${Math.min(100, category.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card className="border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))]">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-50">Maiores gastos reais</CardTitle>
                <CardDescription className="text-slate-400">
                  Despesas operacionais com maior impacto no período.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topExpenses.map((transaction) => {
                  const date = parseTransactionDate(transaction.data || transaction.created_at)
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{transaction.descricao || 'Sem descrição'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {transaction.categorias?.nome || 'Sem categoria'}
                          {date ? ` • ${date.toLocaleDateString('pt-BR')}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-red-300">-{formatCurrency(getTransactionAbsoluteAmount(transaction))}</p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-[linear-gradient(180deg,rgba(8,15,30,0.96),rgba(3,7,18,0.98))]">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-50">Principais entradas</CardTitle>
                <CardDescription className="text-slate-400">
                  Receitas que mais sustentaram o período.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topIncomes.map((transaction) => {
                  const date = parseTransactionDate(transaction.data || transaction.created_at)
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{transaction.descricao || 'Sem descrição'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {transaction.categorias?.nome || 'Sem categoria'}
                          {date ? ` • ${date.toLocaleDateString('pt-BR')}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-emerald-300">+{formatCurrency(getTransactionAbsoluteAmount(transaction))}</p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </section>

          <Card className="border-slate-800 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,rgba(8,15,30,0.96),rgba(3,7,18,0.98))]">
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-100">Leitura exportável</p>
                <p className="text-sm text-slate-400">
                  O PDF segue esta mesma lógica: despesas do dia a dia sem duplicar pagamento de fatura, com investimentos separados.
                </p>
              </div>
              <Button
                variant="outline"
                disabled={isGeneratingPDF || coreTransactions.length === 0}
                onClick={() =>
                  generatePDF({
                    transactionType: 'all',
                    includeSummary: true,
                    includeDetails: true,
                    includeAnalytics: true,
                  })
                }
                className="border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800"
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar esta leitura em PDF
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
