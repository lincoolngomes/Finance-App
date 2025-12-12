import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Calendar, AlertTriangle, CheckCircle2, Target, Wallet, CreditCard } from 'lucide-react'
import { useReports } from '@/hooks/useReports'
import { useAuth } from '@/hooks/useAuth'
import { ReportFiltersComponent } from '@/components/reports/ReportFilters'
import { PDFExportOptions as PDFOptions } from '@/components/reports/PDFExportOptions'
import { toast } from '@/hooks/use-toast'
import { generatePDFReport } from '@/utils/pdfGenerator'
import { formatCurrency } from '@/utils/currency'
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#84cc16']

export default function Relatorios() {
  const { user } = useAuth()
  const { transactions, isLoading, filters, setFilters, summaryData } = useReports()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Análises avançadas
  const analytics = useMemo(() => {
    const receitas = transactions.filter(t => t.tipo === 'receita')
    const despesas = transactions.filter(t => t.tipo === 'despesa')
    
    const totalReceitas = receitas.reduce((sum, t) => sum + Math.abs(Number(t.valor) || 0), 0)
    const totalDespesas = despesas.reduce((sum, t) => sum + Math.abs(Number(t.valor) || 0), 0)
    const saldo = totalReceitas - totalDespesas
    
    // Média diária
    const dias = transactions.length > 0 ? Math.max(1, Math.ceil((new Date().getTime() - new Date(transactions[transactions.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24))) : 1
    const mediaDiaria = totalDespesas / dias
    
    // Ticket médio
    const ticketMedio = despesas.length > 0 ? totalDespesas / despesas.length : 0
    
    // Maior despesa
    const maiorDespesa = despesas.length > 0 ? Math.max(...despesas.map(t => Math.abs(Number(t.valor) || 0))) : 0
    const maiorDespesaItem = despesas.find(t => Math.abs(Number(t.valor) || 0) === maiorDespesa)
    
    // Categoria com mais gastos
    const categorias: { [key: string]: number } = {}
    despesas.forEach(t => {
      const cat = t.categorias?.nome || 'Sem categoria'
      categorias[cat] = (categorias[cat] || 0) + Math.abs(Number(t.valor) || 0)
    })
    const categoriaMaisGasta = Object.entries(categorias).sort((a, b) => b[1] - a[1])[0]
    
    // Comparação com mês anterior (simulado)
    const variacaoMensal = totalDespesas > 0 ? ((totalDespesas - (totalDespesas * 0.9)) / (totalDespesas * 0.9)) * 100 : 0
    
    // Meta de economia (90% das receitas)
    const metaEconomia = totalReceitas * 0.1
    const economizado = saldo
    const percentualMeta = totalReceitas > 0 ? (economizado / metaEconomia) * 100 : 0
    
    // Projeção fim do mês
    const diaAtual = new Date().getDate()
    const diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const projecaoMes = (totalDespesas / diaAtual) * diasMes
    
    return {
      totalReceitas,
      totalDespesas,
      saldo,
      mediaDiaria,
      ticketMedio,
      maiorDespesa,
      maiorDespesaItem,
      categoriaMaisGasta,
      variacaoMensal,
      metaEconomia,
      economizado,
      percentualMeta,
      projecaoMes,
      receitasCount: receitas.length,
      despesasCount: despesas.length
    }
  }, [transactions])

  // Dados para gráficos
  const chartData = useMemo(() => {
    // Agrupa por dia
    const byDay: { [key: string]: { receitas: number, despesas: number } } = {}
    
    transactions.forEach(t => {
      const date = new Date(t.quando || t.created_at).toLocaleDateString('pt-BR')
      if (!byDay[date]) byDay[date] = { receitas: 0, despesas: 0 }
      
      if (t.tipo === 'receita') {
        byDay[date].receitas += Math.abs(Number(t.valor) || 0)
      } else {
        byDay[date].despesas += Math.abs(Number(t.valor) || 0)
      }
    })
    
    return Object.entries(byDay)
      .map(([date, values]) => ({
        date,
        receitas: values.receitas,
        despesas: values.despesas,
        saldo: values.receitas - values.despesas
      }))
      .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime())
  }, [transactions])

  const categoryData = useMemo(() => {
    const categorias: { [key: string]: number } = {}
    
    transactions.filter(t => t.tipo === 'despesa').forEach(t => {
      const cat = t.categorias?.nome || 'Sem categoria'
      categorias[cat] = (categorias[cat] || 0) + Math.abs(Number(t.valor) || 0)
    })
    
    return Object.entries(categorias)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [transactions])

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      type: '',
      categoryId: '',
      period: 'month'
    })
  }

  const generatePDF = async (options: PDFOptions) => {
    setIsGeneratingPDF(true)
    try {
      const reportData = {
        transactions,
        summaryData,
        filters,
        userName: user?.user_metadata?.nome || user?.email || 'Usuário'
      }
      generatePDFReport(reportData, options)
      toast({
        title: "PDF gerado com sucesso!",
        description: "O relatório foi exportado em formato PDF.",
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao exportar o relatório.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Análise Financeira</h2>
          <p className="text-muted-foreground">Insights detalhados das suas finanças</p>
        </div>
        <PDFOptions
          onExport={generatePDF}
          isGenerating={isGeneratingPDF}
          disabled={transactions.length === 0}
        />
      </div>

      {/* Filtros */}
      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <PieChart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground text-sm">
              Ajuste os filtros ou adicione transações para ver análises
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(analytics.totalReceitas)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.receitasCount} transação(ões)
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-red-500/10 to-rose-500/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(analytics.totalDespesas)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.despesasCount} transação(ões)
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Saldo</CardTitle>
                <Wallet className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${analytics.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatCurrency(analytics.saldo)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.saldo >= 0 ? 'Positivo' : 'Negativo'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-pink-500/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(analytics.ticketMedio)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Por transação
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Métricas Adicionais */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Média Diária
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics.mediaDiaria)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Gasto médio por dia no período
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Maior Despesa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(analytics.maiorDespesa)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {analytics.maiorDespesaItem?.estabelecimento || 'N/A'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Categoria Top
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.categoriaMaisGasta ? formatCurrency(analytics.categoriaMaisGasta[1]) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {analytics.categoriaMaisGasta?.[0] || 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Meta de Economia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Meta de Economia
              </CardTitle>
              <CardDescription>
                Objetivo: Economizar 10% das receitas ({formatCurrency(analytics.metaEconomia)})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span className="font-semibold">
                    {analytics.percentualMeta > 0 ? analytics.percentualMeta.toFixed(1) : 0}%
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      analytics.percentualMeta >= 100 ? 'bg-green-500' : 
                      analytics.percentualMeta >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, analytics.percentualMeta))}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {analytics.percentualMeta >= 100 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 font-medium">Meta atingida! Parabéns!</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-muted-foreground">
                      Faltam {formatCurrency(Math.max(0, analytics.metaEconomia - analytics.economizado))} para atingir a meta
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Projeção */}
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                Projeção para Fim do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 mb-2">
                {formatCurrency(analytics.projecaoMes)}
              </div>
              <p className="text-sm text-muted-foreground">
                Baseado no seu gasto médio diário atual
              </p>
            </CardContent>
          </Card>

          {/* Gráfico de Evolução */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução Diária</CardTitle>
              <CardDescription>Receitas, despesas e saldo por dia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="receitas" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorReceitas)"
                      name="Receitas"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="despesas" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorDespesas)"
                      name="Despesas"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos lado a lado */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Despesas por Categoria */}
            <Card>
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
                <CardDescription>Distribuição dos gastos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${((entry.value / analytics.totalDespesas) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Comparação */}
            <Card>
              <CardHeader>
                <CardTitle>Comparação Receitas vs Despesas</CardTitle>
                <CardDescription>Análise comparativa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Receitas', valor: analytics.totalReceitas, fill: '#10b981' },
                      { name: 'Despesas', valor: analytics.totalDespesas, fill: '#ef4444' },
                      { name: 'Saldo', valor: Math.abs(analytics.saldo), fill: analytics.saldo >= 0 ? '#3b82f6' : '#f59e0b' }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="valor" fill="#8884d8" radius={[8, 8, 0, 0]}>
                        {[0, 1, 2].map((index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#ef4444' : analytics.saldo >= 0 ? '#3b82f6' : '#f59e0b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
