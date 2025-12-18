import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Calendar, AlertTriangle, CheckCircle2, Target, Wallet, CreditCard, Activity, ArrowUpRight, ArrowDownRight, Percent, Clock, ShoppingBag, Receipt, Zap, Brain, TrendingUpDown, BarChart4 } from 'lucide-react'
import { useReports } from '@/hooks/useReports'
import { useAuth } from '@/hooks/useAuth'
import { ReportFiltersComponent } from '@/components/reports/ReportFilters'
import { PDFExportOptions as PDFOptions } from '@/components/reports/PDFExportOptions'
import { toast } from '@/hooks/use-toast'
import { generatePDFReport } from '@/utils/pdfGenerator'
import { formatCurrency } from '@/utils/currency'
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'

const COLORS = ['#6366f1', '#14b8a6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#84cc16', '#06b6d4', '#f97316']
const GRADIENT_COLORS = [
  { start: '#6366f1', end: '#14b8a6' },
  { start: '#ec4899', end: '#f43f5e' },
  { start: '#06b6d4', end: '#0891b2' },
  { start: '#10b981', end: '#059669' },
  { start: '#f59e0b', end: '#d97706' },
]

export default function Relatorios() {
  const { user } = useAuth()
  const { transactions, isLoading, filters, setFilters, summaryData } = useReports()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Análises avançadas e inteligentes
  const analytics = useMemo(() => {
    try {
      if (!transactions || transactions.length === 0) {
        return {
          totalReceitas: 0,
          totalDespesas: 0,
          saldo: 0,
          mediaDiaria: 0,
          mediaSemanal: 0,
          mediaMensal: 0,
          ticketMedio: 0,
          ticketMedioReceita: 0,
          maiorDespesa: 0,
          menorDespesa: 0,
          maiorDespesaItem: null,
          maiorReceita: 0,
          maiorReceitaItem: null,
          categoriasDespesas: {},
          categoriasReceitas: {},
          topCategoriasDespesas: [],
          categoriaMaisGasta: null,
          categoriaTicketMaisAlto: null,
          metodosPagamento: {},
          metodoMaisUsado: null,
          frequenciaMedia: 0,
          taxaPoupanca: 0,
          taxaGasto: 0,
          saudeFinanceira: 50,
          projecaoMes: 0,
          economiaProjetada: 0,
          tendencia: 0,
          gastoUltimos7: 0,
          gastoAnteriores7: 0,
          insights: [],
          metaEconomia: 0,
          economizado: 0,
          percentualMeta: 0,
          receitasCount: 0,
          despesasCount: 0,
          dias: 1,
          semanas: 1,
          meses: 1
        }
      }

      const receitas = transactions.filter(t => t.tipo === 'receita')
      const despesas = transactions.filter(t => t.tipo === 'despesa')
    
    const totalReceitas = receitas.reduce((sum, t) => sum + Math.abs(Number(t.valor) || 0), 0)
    const totalDespesas = despesas.reduce((sum, t) => sum + Math.abs(Number(t.valor) || 0), 0)
    const saldo = totalReceitas - totalDespesas
    
    // Análise temporal avançada
    const hoje = new Date()
    const primeiraTrans = transactions.length > 0 ? new Date(transactions[transactions.length - 1].created_at) : hoje
    const dias = Math.max(1, Math.ceil((hoje.getTime() - primeiraTrans.getTime()) / (1000 * 60 * 60 * 24)))
    const semanas = Math.max(1, Math.ceil(dias / 7))
    const meses = Math.max(1, Math.ceil(dias / 30))
    
    const mediaDiaria = totalDespesas / dias
    const mediaSemanal = totalDespesas / semanas
    const mediaMensal = totalDespesas / meses
    
    // Análise de transações
    const ticketMedio = despesas.length > 0 ? totalDespesas / despesas.length : 0
    const ticketMedioReceita = receitas.length > 0 ? totalReceitas / receitas.length : 0
    
    const maiorDespesa = despesas.length > 0 ? Math.max(...despesas.map(t => Math.abs(Number(t.valor) || 0))) : 0
    const menorDespesa = despesas.length > 0 ? Math.min(...despesas.map(t => Math.abs(Number(t.valor) || 0))) : 0
    const maiorDespesaItem = despesas.find(t => Math.abs(Number(t.valor) || 0) === maiorDespesa)
    
    const maiorReceita = receitas.length > 0 ? Math.max(...receitas.map(t => Math.abs(Number(t.valor) || 0))) : 0
    const maiorReceitaItem = receitas.find(t => Math.abs(Number(t.valor) || 0) === maiorReceita)
    
    // Análise de categorias
    const categoriasDespesas: { [key: string]: { total: number, count: number, transacoes: any[] } } = {}
    const categoriasReceitas: { [key: string]: { total: number, count: number } } = {}
    
    despesas.forEach(t => {
      const cat = t.categorias?.nome || 'Sem categoria'
      if (!categoriasDespesas[cat]) categoriasDespesas[cat] = { total: 0, count: 0, transacoes: [] }
      categoriasDespesas[cat].total += Math.abs(Number(t.valor) || 0)
      categoriasDespesas[cat].count += 1
      categoriasDespesas[cat].transacoes.push(t)
    })
    
    receitas.forEach(t => {
      const cat = t.categorias?.nome || 'Sem categoria'
      if (!categoriasReceitas[cat]) categoriasReceitas[cat] = { total: 0, count: 0 }
      categoriasReceitas[cat].total += Math.abs(Number(t.valor) || 0)
      categoriasReceitas[cat].count += 1
    })
    
    const topCategoriasDespesas = Object.entries(categoriasDespesas)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
    
    const categoriaMaisGasta = topCategoriasDespesas[0]
    const categoriaTicketMaisAlto = Object.entries(categoriasDespesas)
      .sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0]
    
    // Análise de métodos de pagamento
    const metodosPagamento: { [key: string]: number } = {}
    despesas.forEach(t => {
      const metodo = (t as any).metodo || 'Não especificado'
      metodosPagamento[metodo] = (metodosPagamento[metodo] || 0) + Math.abs(Number(t.valor) || 0)
    })
    const metodoMaisUsado = Object.entries(metodosPagamento).sort((a, b) => b[1] - a[1])[0]
    
    // Análise de frequência e padrões
    const transacoesPorDia: { [key: string]: number } = {}
    despesas.forEach(t => {
      const dia = new Date(t.quando || t.created_at).toLocaleDateString('pt-BR')
      transacoesPorDia[dia] = (transacoesPorDia[dia] || 0) + 1
    })
    const frequenciaMedia = Object.values(transacoesPorDia).length > 0 
      ? Object.values(transacoesPorDia).reduce((a, b) => a + b, 0) / Object.values(transacoesPorDia).length 
      : 0
    
    // Indicadores financeiros
    const taxaPoupanca = totalReceitas > 0 ? (saldo / totalReceitas) * 100 : 0
    const taxaGasto = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0
    
    // Saúde financeira (0-100)
    let saudeFinanceira = 50
    if (taxaPoupanca > 20) saudeFinanceira += 20
    else if (taxaPoupanca > 10) saudeFinanceira += 10
    else if (taxaPoupanca < 0) saudeFinanceira -= 20
    
    if (totalDespesas < totalReceitas * 0.7) saudeFinanceira += 15
    else if (totalDespesas > totalReceitas * 0.95) saudeFinanceira -= 15
    
    if (frequenciaMedia < 3) saudeFinanceira += 10
    if (topCategoriasDespesas.length > 0 && topCategoriasDespesas[0][1].total / totalDespesas < 0.4) saudeFinanceira += 5
    
    saudeFinanceira = Math.max(0, Math.min(100, saudeFinanceira))
    
    // Meta de economia
    const metaEconomia = totalReceitas * 0.1
    const economizado = saldo
    const percentualMeta = totalReceitas > 0 ? (economizado / metaEconomia) * 100 : 0
    
    // Projeções
    const diaAtual = hoje.getDate()
    const diasMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
    const projecaoMes = (totalDespesas / diaAtual) * diasMes
    const economiaProjetada = totalReceitas - projecaoMes
    
    // Tendência (últimos 7 dias vs 7 anteriores)
    const ultimos7Dias = despesas.filter(t => {
      const diff = hoje.getTime() - new Date(t.quando || t.created_at).getTime()
      return diff <= 7 * 24 * 60 * 60 * 1000
    })
    const anteriores7Dias = despesas.filter(t => {
      const diff = hoje.getTime() - new Date(t.quando || t.created_at).getTime()
      return diff > 7 * 24 * 60 * 60 * 1000 && diff <= 14 * 24 * 60 * 60 * 1000
    })
    
    const gastoUltimos7 = ultimos7Dias.reduce((sum, t) => sum + Math.abs(Number(t.valor) || 0), 0)
    const gastoAnteriores7 = anteriores7Dias.reduce((sum, t) => sum + Math.abs(Number(t.valor) || 0), 0)
    const tendencia = gastoAnteriores7 > 0 ? ((gastoUltimos7 - gastoAnteriores7) / gastoAnteriores7) * 100 : 0
    
    // Insights inteligentes
    const insights: string[] = []
    if (taxaPoupanca > 20) insights.push('💎 Excelente! Você está economizando mais de 20% das suas receitas.')
    else if (taxaPoupanca < 5 && totalReceitas > 0) insights.push('⚠️ Atenção: Sua taxa de poupança está muito baixa. Tente reduzir gastos.')
    
    if (tendencia > 20) insights.push('📈 Seus gastos aumentaram 20% na última semana. Considere revisar despesas.')
    else if (tendencia < -20) insights.push('📉 Parabéns! Você reduziu seus gastos em 20% na última semana.')
    
    if (categoriaMaisGasta && categoriaMaisGasta[1].total / totalDespesas > 0.5) {
      insights.push(`🎯 A categoria "${categoriaMaisGasta[0]}" representa mais de 50% dos seus gastos. Foque nela para economizar.`)
    }
    
    if (frequenciaMedia > 5) insights.push('🛍️ Você tem muitas transações diárias. Considere agrupar compras.')
    
    if (saudeFinanceira >= 80) insights.push('✨ Sua saúde financeira está excelente! Continue assim.')
    else if (saudeFinanceira < 40) insights.push('🚨 Sua saúde financeira precisa de atenção. Revise seu orçamento.')
    
    return {
      totalReceitas,
      totalDespesas,
      saldo,
      mediaDiaria,
      mediaSemanal,
      mediaMensal,
      ticketMedio,
      ticketMedioReceita,
      maiorDespesa,
      menorDespesa,
      maiorDespesaItem,
      maiorReceita,
      maiorReceitaItem,
      categoriasDespesas,
      categoriasReceitas,
      topCategoriasDespesas,
      categoriaMaisGasta,
      categoriaTicketMaisAlto,
      metodosPagamento,
      metodoMaisUsado,
      frequenciaMedia,
      taxaPoupanca,
      taxaGasto,
      saudeFinanceira,
      projecaoMes,
      economiaProjetada,
      tendencia,
      gastoUltimos7,
      gastoAnteriores7,
      insights,
      metaEconomia,
      economizado,
      percentualMeta,
      receitasCount: receitas.length,
      despesasCount: despesas.length,
      dias,
      semanas,
      meses
    }
    } catch (error) {
      console.error('Erro ao calcular analytics:', error)
      return {
        totalReceitas: 0,
        totalDespesas: 0,
        saldo: 0,
        mediaDiaria: 0,
        mediaSemanal: 0,
        mediaMensal: 0,
        ticketMedio: 0,
        ticketMedioReceita: 0,
        maiorDespesa: 0,
        menorDespesa: 0,
        maiorDespesaItem: null,
        maiorReceita: 0,
        maiorReceitaItem: null,
        categoriasDespesas: {},
        categoriasReceitas: {},
        topCategoriasDespesas: [],
        categoriaMaisGasta: null,
        categoriaTicketMaisAlto: null,
        metodosPagamento: {},
        metodoMaisUsado: null,
        frequenciaMedia: 0,
        taxaPoupanca: 0,
        taxaGasto: 0,
        saudeFinanceira: 50,
        projecaoMes: 0,
        economiaProjetada: 0,
        tendencia: 0,
        gastoUltimos7: 0,
        gastoAnteriores7: 0,
        insights: [],
        metaEconomia: 0,
        economizado: 0,
        percentualMeta: 0,
        receitasCount: 0,
        despesasCount: 0,
        dias: 1,
        semanas: 1,
        meses: 1
      }
    }
  }, [transactions])

  // Dados para gráficos avançados
  const chartData = useMemo(() => {
    try {
      if (!transactions || transactions.length === 0) return []
    const byDay: { [key: string]: { receitas: number, despesas: number, count: number } } = {}
    
    transactions.forEach(t => {
      const date = new Date(t.quando || t.created_at).toLocaleDateString('pt-BR')
      if (!byDay[date]) byDay[date] = { receitas: 0, despesas: 0, count: 0 }
      
      if (t.tipo === 'receita') {
        byDay[date].receitas += Math.abs(Number(t.valor) || 0)
      } else {
        byDay[date].despesas += Math.abs(Number(t.valor) || 0)
      }
      byDay[date].count += 1
    })
    
    return Object.entries(byDay)
      .map(([date, values]) => ({
        date,
        receitas: values.receitas,
        despesas: values.despesas,
        saldo: values.receitas - values.despesas,
        transacoes: values.count
      }))
      .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime())
    } catch (error) {
      console.error('Erro ao calcular chartData:', error)
      return []
    }
  }, [transactions])

  const categoryData = useMemo(() => {
    try {
      if (!transactions || transactions.length === 0) return []
      
      const categorias: { [key: string]: { total: number, count: number } } = {}
    
      transactions.filter(t => t.tipo === 'despesa').forEach(t => {
        const cat = t.categorias?.nome || 'Sem categoria'
        if (!categorias[cat]) categorias[cat] = { total: 0, count: 0 }
        categorias[cat].total += Math.abs(Number(t.valor) || 0)
        categorias[cat].count += 1
      })
    
      return Object.entries(categorias)
        .map(([name, data]) => ({ 
          name, 
          value: data.total,
          count: data.count,
          media: data.total / data.count
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    } catch (error) {
      console.error('Erro ao calcular categoryData:', error)
      return []
    }
  }, [transactions])

  const paymentMethodData = useMemo(() => {
    try {
      const metodos: { [key: string]: number } = {}
      
      transactions.filter(t => t.tipo === 'despesa').forEach(t => {
        const metodo = (t as any).metodo || 'Não especificado'
        const label = metodo === 'pix' ? 'PIX' : 
                      metodo === 'debito' ? 'Débito' :
                      metodo === 'cartao_credito' ? 'Crédito' :
                      metodo === 'transferencia' ? 'Transferência' : metodo
        metodos[label] = (metodos[label] || 0) + Math.abs(Number(t.valor) || 0)
      })
      
      return Object.entries(metodos)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    } catch (error) {
      console.error('Erro ao calcular paymentMethodData:', error)
      return []
    }
  }, [transactions])

  const weekdayData = useMemo(() => {
    try {
      const dias: { [key: string]: { total: number, count: number } } = {
        'Dom': { total: 0, count: 0 },
        'Seg': { total: 0, count: 0 },
        'Ter': { total: 0, count: 0 },
        'Qua': { total: 0, count: 0 },
        'Qui': { total: 0, count: 0 },
        'Sex': { total: 0, count: 0 },
        'Sáb': { total: 0, count: 0 }
      }
      
      transactions.filter(t => t.tipo === 'despesa').forEach(t => {
        const date = new Date(t.quando || t.created_at)
        const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()]
        if (dias[diaSemana]) {
          dias[diaSemana].total += Math.abs(Number(t.valor) || 0)
          dias[diaSemana].count += 1
        }
      })
      
      return Object.entries(dias).map(([dia, data]) => ({
        dia,
        gasto: data.total,
        transacoes: data.count,
        media: data.count > 0 ? data.total / data.count : 0
      }))
    } catch (error) {
      console.error('Erro ao calcular weekdayData:', error)
      return []
    }
  }, [transactions])

  const monthlyComparison = useMemo(() => {
    try {
      const meses: { [key: string]: { receitas: number, despesas: number } } = {}
      
      transactions.forEach(t => {
        const date = new Date(t.quando || t.created_at)
        const mes = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        if (!meses[mes]) meses[mes] = { receitas: 0, despesas: 0 }
        
        if (t.tipo === 'receita') {
          meses[mes].receitas += Math.abs(Number(t.valor) || 0)
        } else {
          meses[mes].despesas += Math.abs(Number(t.valor) || 0)
        }
      })
      
      return Object.entries(meses)
        .map(([mes, values]) => ({
          mes,
          receitas: values.receitas,
          despesas: values.despesas,
          saldo: values.receitas - values.despesas,
          economia: values.receitas > 0 ? ((values.receitas - values.despesas) / values.receitas) * 100 : 0
        }))
        .sort((a, b) => {
          const [mesA, anoA] = a.mes.split(' ')
          const [mesB, anoB] = b.mes.split(' ')
          return new Date(`20${anoA}-${mesA}-01`).getTime() - new Date(`20${anoB}-${mesB}-01`).getTime()
        })
    } catch (error) {
      console.error('Erro ao calcular monthlyComparison:', error)
      return []
    }
  }, [transactions])

  const clearFilters = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    
    setFilters({
      startDate: startOfMonth,
      endDate: endOfMonth,
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
        userName: user?.user_metadata?.nome || user?.email || 'Usuário',
        analytics: {
          saudeFinanceira: analytics.saudeFinanceira,
          taxaPoupanca: analytics.taxaPoupanca,
          taxaGasto: analytics.taxaGasto,
          mediaDiaria: analytics.mediaDiaria,
          mediaSemanal: analytics.mediaSemanal,
          mediaMensal: analytics.mediaMensal,
          ticketMedio: analytics.ticketMedio,
          maiorDespesa: analytics.maiorDespesa,
          maiorDespesaItem: analytics.maiorDespesaItem,
          categoriaMaisGasta: analytics.categoriaMaisGasta,
          projecaoMes: analytics.projecaoMes,
          tendencia: analytics.tendencia,
          insights: analytics.insights
        }
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
          {/* Indicador de Saúde Financeira */}
          <Card className="border-0 bg-gradient-to-br from-indigo-500/10 via-teal-500/5 to-cyan-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Score de Saúde Financeira
              </CardTitle>
              <CardDescription>Indicador geral baseado em múltiplos fatores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-6xl font-bold bg-gradient-to-r from-indigo-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  {analytics.saudeFinanceira.toFixed(0)}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-muted-foreground">Classificação</div>
                  <div className={`text-2xl font-bold ${
                    analytics.saudeFinanceira >= 80 ? 'text-green-600' :
                    analytics.saudeFinanceira >= 60 ? 'text-blue-600' :
                    analytics.saudeFinanceira >= 40 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {analytics.saudeFinanceira >= 80 ? 'Excelente' :
                     analytics.saudeFinanceira >= 60 ? 'Bom' :
                     analytics.saudeFinanceira >= 40 ? 'Regular' : 'Crítico'}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Crítico</span>
                  <span>Regular</span>
                  <span>Bom</span>
                  <span>Excelente</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 via-blue-500 to-green-500 transition-all duration-1000"
                    style={{ width: `${analytics.saudeFinanceira}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards de Resumo Principal */}
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

            <Card className="border-0 bg-gradient-to-br from-teal-500/10 to-cyan-500/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <DollarSign className="h-4 w-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-600">
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
                  {analytics.categoriaMaisGasta ? formatCurrency(analytics.categoriaMaisGasta[1].total) : 'N/A'}
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
                <CardTitle>Evolução Mensal</CardTitle>
                <CardDescription>Comparação entre receitas e despesas mês a mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyComparison} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis 
                        dataKey="mes" 
                        tick={{ fontSize: 13 }}
                        tickLine={false}
                      />
                      <YAxis 
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 13 }}
                        tickLine={false}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
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
                      <Legend />
                      <Bar dataKey="receitas" fill="#10b981" name="Receitas" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Insights Inteligentes */}
          {analytics.insights.length > 0 && (
            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-600" />
                  Insights Inteligentes
                </CardTitle>
                <CardDescription>Análises automáticas baseadas nos seus dados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                      <Zap className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Métricas Temporais Expandidas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cyan-600" />
                  Média Diária
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-600">{formatCurrency(analytics.mediaDiaria)}</div>
                <p className="text-xs text-muted-foreground mt-1">Últimos {analytics.dias} dias</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-teal-500/10 to-cyan-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-teal-600" />
                  Média Semanal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-600">{formatCurrency(analytics.mediaSemanal)}</div>
                <p className="text-xs text-muted-foreground mt-1">Últimas {analytics.semanas} semanas</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart4 className="h-4 w-4 text-amber-600" />
                  Média Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(analytics.mediaMensal)}</div>
                <p className="text-xs text-muted-foreground mt-1">Últimos {analytics.meses} meses</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-rose-500/10 to-pink-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUpDown className="h-4 w-4 text-rose-600" />
                  Tendência 7 dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold flex items-center gap-1 ${analytics.tendencia > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {analytics.tendencia > 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                  {Math.abs(analytics.tendencia).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.tendencia > 0 ? 'Aumento' : 'Redução'} vs semana anterior
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Análise Detalhada de Receitas e Despesas */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
                  Análise de Receitas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Maior Receita</div>
                    <div className="text-lg font-bold text-green-600">{formatCurrency(analytics.maiorReceita)}</div>
                    <div className="text-xs text-muted-foreground truncate">{analytics.maiorReceitaItem?.estabelecimento || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Ticket Médio</div>
                    <div className="text-lg font-bold text-green-600">{formatCurrency(analytics.ticketMedioReceita)}</div>
                    <div className="text-xs text-muted-foreground">{analytics.receitasCount} transações</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                  Análise de Despesas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Maior Despesa</div>
                    <div className="text-lg font-bold text-red-600">{formatCurrency(analytics.maiorDespesa)}</div>
                    <div className="text-xs text-muted-foreground truncate">{analytics.maiorDespesaItem?.estabelecimento || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Menor Despesa</div>
                    <div className="text-lg font-bold text-red-600">{formatCurrency(analytics.menorDespesa)}</div>
                    <div className="text-xs text-muted-foreground">{analytics.despesasCount} transações</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Indicadores Financeiros */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Taxa de Poupança
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${analytics.taxaPoupanca >= 20 ? 'text-green-600' : analytics.taxaPoupanca >= 10 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {analytics.taxaPoupanca.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {analytics.taxaPoupanca >= 20 ? 'Excelente!' : analytics.taxaPoupanca >= 10 ? 'Bom' : 'Pode melhorar'}
                </p>
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${analytics.taxaPoupanca >= 20 ? 'bg-green-500' : analytics.taxaPoupanca >= 10 ? 'bg-blue-500' : 'bg-orange-500'}`}
                    style={{ width: `${Math.min(100, Math.max(0, analytics.taxaPoupanca))}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Taxa de Gasto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${analytics.taxaGasto <= 70 ? 'text-green-600' : analytics.taxaGasto <= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {analytics.taxaGasto.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {analytics.taxaGasto <= 70 ? 'Ótimo controle!' : analytics.taxaGasto <= 90 ? 'Atenção' : 'Alto'}
                </p>
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${analytics.taxaGasto <= 70 ? 'bg-green-500' : analytics.taxaGasto <= 90 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, analytics.taxaGasto)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Frequência Média
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-teal-600">
                  {analytics.frequenciaMedia.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Transações por dia
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Comparação Mensal */}
          {monthlyComparison.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Comparação Mensal</CardTitle>
                <CardDescription>Evolução das receitas, despesas e economia ao longo dos meses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyComparison}>
                      <defs>
                        <linearGradient id="colorEconomia" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis 
                        yAxisId="left"
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(value) => `${value.toFixed(0)}%`}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'economia') return `${value.toFixed(1)}%`
                          return formatCurrency(value)
                        }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="receitas" fill="#10b981" name="Receitas" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="economia" stroke="#3b82f6" strokeWidth={3} name="Taxa Economia %" dot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Análise por Dia da Semana */}
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Dia da Semana</CardTitle>
              <CardDescription>Identificar padrões de consumo semanal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis dataKey="dia" />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
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
                    <Bar yAxisId="left" dataKey="gasto" fill="#f59e0b" name="Gasto Total" radius={[8, 8, 0, 0]} />
                    <Bar yAxisId="right" dataKey="transacoes" fill="#14b8a6" name="Nº Transações" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Métodos de Pagamento */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pagamento</CardTitle>
                <CardDescription>Como você gasta seu dinheiro</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        labelLine
                        label={(entry) => `${entry.name}: R$ ${(entry.value / 1000).toFixed(1)}k`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentMethodData.map((entry, index) => (
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

            <Card>
              <CardHeader>
                <CardTitle>Top 5 Categorias</CardTitle>
                <CardDescription>Maiores gastos por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topCategoriasDespesas.slice(0, 5).map(([nome, data], index) => {
                    const percentual = (data.total / analytics.totalDespesas) * 100
                    return (
                      <div key={nome} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{nome}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(data.total)}</div>
                            <div className="text-xs text-muted-foreground">{data.count} transações</div>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500"
                            style={{ 
                              width: `${percentual}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          {percentual.toFixed(1)}% do total • Média: {formatCurrency(data.total / data.count)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Categorias Detalhadas */}
          <Card>
            <CardHeader>
              <CardTitle>Análise Completa por Categoria</CardTitle>
              <CardDescription>Visão detalhada de todos os gastos por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={categoryData} 
                    layout="vertical"
                    margin={{ left: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis 
                      type="number"
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={90}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Projeções e Economia */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                  Projeção Fim do Mês
                </CardTitle>
                <CardDescription>Estimativa baseada no consumo atual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Projeção de Despesas</div>
                  <div className="text-3xl font-bold text-amber-600">{formatCurrency(analytics.projecaoMes)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Economia Projetada</div>
                  <div className={`text-2xl font-bold ${analytics.economiaProjetada >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(analytics.economiaProjetada)}
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    {analytics.economiaProjetada >= 0 
                      ? `✨ Se manter esse ritmo, você economizará ${formatCurrency(analytics.economiaProjetada)} este mês!`
                      : `⚠️ Atenção: Você pode ter um déficit de ${formatCurrency(Math.abs(analytics.economiaProjetada))} este mês.`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  Resumo de Tickets
                </CardTitle>
                <CardDescription>Análise dos valores médios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Ticket Médio Despesas</div>
                    <div className="text-xl font-bold text-red-600">{formatCurrency(analytics.ticketMedio)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Ticket Médio Receitas</div>
                    <div className="text-xl font-bold text-green-600">{formatCurrency(analytics.ticketMedioReceita)}</div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Categoria com Maior Ticket Médio</div>
                  <div className="font-semibold">{analytics.categoriaTicketMaisAlto?.[0] || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">
                    {analytics.categoriaTicketMaisAlto && formatCurrency(analytics.categoriaTicketMaisAlto[1].total / analytics.categoriaTicketMaisAlto[1].count)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumo Final com Call to Action */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="text-xl">💡 Resumo Executivo</CardTitle>
              <CardDescription>Principais métricas do período analisado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 rounded-lg bg-background/50">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(analytics.totalReceitas)}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total em Receitas</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-background/50">
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(analytics.totalDespesas)}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total em Despesas</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-background/50">
                  <div className={`text-2xl font-bold ${analytics.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(analytics.saldo)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Saldo Final</div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="font-semibold">Categoria Top</div>
                    <div className="text-sm text-muted-foreground">{analytics.categoriaMaisGasta?.[0] || 'N/A'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                  <CreditCard className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="font-semibold">Método Preferido</div>
                    <div className="text-sm text-muted-foreground">{analytics.metodoMaisUsado?.[0] || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
