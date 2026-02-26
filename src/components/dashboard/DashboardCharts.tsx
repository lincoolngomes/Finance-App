
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency } from '@/utils/currency'
import { getTransactionMonth, parseToDateUTC } from '@/utils/dateParser'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, ReferenceLine } from 'recharts'
import { Calendar, CreditCard, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'

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

interface DashboardChartsProps {
  transacoes: Transacao[]
  recentTransacoes?: Transacao[]
  contas?: any[]
  cartoes?: any[]
  lembretes?: Lembrete[]
  selectedMonth?: string
  selectedYear?: string
  allTransactions?: Transacao[]
  showCardTransactions?: boolean
  onOpenFatura?: (mes: string, ano: string) => void
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#84cc16']

export function DashboardCharts({ transacoes, recentTransacoes, contas = [], cartoes = [], lembretes = [], selectedMonth, selectedYear, allTransactions, showCardTransactions = false, onOpenFatura }: DashboardChartsProps) {
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

  // Criar mapa de contas para exibir nome da conta
  const accountsMap = contas.reduce((acc, conta) => {
    acc[conta.id] = conta
    return acc
  }, {} as Record<string, any>)

  // Criar mapa de cartões para exibir nome do cartão
  const cartoesMap = cartoes.reduce((acc, cartao) => {
    acc[cartao.id] = cartao
    return acc
  }, {} as Record<string, any>)

  // Filtra transações de cartão se showCardTransactions está desativado
  const allTransacoesRaw = allTransactions || recentTransacoes || transacoes
  const allTransacoes = showCardTransactions
    ? allTransacoesRaw
    : allTransacoesRaw.filter(t => !t.cartao_id)

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

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<{ name: string, tipo: 'receita' | 'despesa' } | null>(null)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())

  const getCategoriesData = (tipo: 'receita' | 'despesa') => {
    const categorias: { [key: string]: number } = {}
    
    transacoes.forEach(t => {
      if (t.valor && t.tipo === tipo) {
        // Receitas de cartão são estornos/pagamentos, não receita real
        if (tipo === 'receita' && t.cartao_id) return
        const nomeCategoria = t.categorias?.nome || 'Sem categoria'
        categorias[nomeCategoria] = (categorias[nomeCategoria] || 0) + Math.abs(t.valor)
      }
    })

    return Object.entries(categorias)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Limitar a 8 categorias para melhor visualização
  }

  const getCategoryTransactions = (categoryName: string, tipo: 'receita' | 'despesa') => {
    return transacoes
      .filter(t => {
        const nome = t.categorias?.nome || 'Sem categoria'
        return nome === categoryName && t.tipo === tipo
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
    const receitas = transacoes.filter(t => t.tipo === 'receita' && !t.cartao_id).reduce((sum, t) => sum + (Number(t.valor) || 0), 0)
    const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + Math.abs(Number(t.valor) || 0), 0)

    return [
      { name: 'Receitas', value: receitas },
      { name: 'Despesas', value: despesas }
    ]
  }

  // Função para gerar dados mensais do ano selecionado
  const getMonthlyBalanceData = () => {
    const currentYear = selectedYear ? parseInt(selectedYear) : new Date().getFullYear()
    const monthlyData: { [key: string]: { receitas: number; despesas: number } } = {}
    
    // Inicializar todos os 12 meses do ano
    for (let month = 0; month < 12; month++) {
      const monthKey = String(month).padStart(2, '0')
      monthlyData[monthKey] = { receitas: 0, despesas: 0 }
    }

    // Agrupar transações por mês (usando TODAS as transações do ano selecionado)
    allTransacoes.forEach(t => {
      const tm = getTransactionMonth(t)
      if (!tm) return
      if (tm.year !== currentYear) return
      const monthKey = String(tm.month).padStart(2, '0')

      if (monthlyData[monthKey]) {
        if (t.tipo === 'receita' && !t.cartao_id) {
          // Receitas: apenas de contas (receitas de cartão são pgto fatura/estorno, ignorar)
          monthlyData[monthKey].receitas += Math.abs(Number(t.valor) || 0)
        } else if (t.tipo === 'despesa') {
          monthlyData[monthKey].despesas += Math.abs(Number(t.valor) || 0)
        }
        // Receitas de cartão (pagamentos/estornos) são ignoradas
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
          despesas: parseFloat(monthlyData[key].despesas.toFixed(2))
        }
      })
    
    if (import.meta.env.DEV) {
      console.log('📊 GRÁFICO BARRAS:', {
        currentYear,
        showCardTransactions,
        totalAllTransacoes: allTransacoes.length,
        cartaoNoAll: allTransacoes.filter(t => t.cartao_id).length,
        contaNoAll: allTransacoes.filter(t => !t.cartao_id).length,
        meses: result.filter(m => m.receitas > 0 || m.despesas > 0)
      })
    }
    
    return result
  }

  const despesasDataAll = getCategoriesData('despesa')
  const receitasData = getCategoriesData('receita')
  const receitasDespesasData = getReceitasDespesasData()
  
  // Recalcula dados mensais quando ano mudar
  const monthlyBalanceData = useMemo(() => getMonthlyBalanceData(), [selectedYear, allTransacoes])

  // Filtrar categorias visíveis
  const despesasData = despesasDataAll.filter(c => !hiddenCategories.has(c.name))

  const totalDespesasCategoria = despesasData.reduce((sum, c) => sum + c.value, 0)
  const totalReceitasCategoria = receitasData.reduce((sum, c) => sum + c.value, 0)

  const handleCategoryClick = (categoryName: string, tipo: 'receita' | 'despesa') => {
    setSelectedCategory({ name: categoryName, tipo })
    setModalOpen(true)
  }

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

  const totalSelectedCategory = selectedTransactions.reduce((sum, t) => sum + Math.abs(t.valor || 0), 0)

  // Dados de faturas do cartão mês a mês (próximos 6 meses)
  const getCartaoFaturasMensais = () => {
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
  }

  const cartaoFaturas = useMemo(() => getCartaoFaturasMensais(), [cartoes, allTransacoesRaw])
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
                <CardDescription className="text-xs">Comparação entre receitas e despesas mês a mês</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[320px] md:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBalanceData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 13 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 13 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
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
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                    formatter={(value) => {
                      const labels: any = { receitas: 'Receitas', despesas: 'Despesas' }
                      return labels[value] || value
                    }}
                  />
                  <Bar dataKey="receitas" fill="#10b981" name="Receitas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Faturas do Cartão por Mês - 1/3 */}
        <Card className="overflow-hidden border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
                  return (
                    <div
                      key={index}
                      className="space-y-1.5 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
                      onClick={() => onOpenFatura?.(String(fatura.mes).padStart(2, '0'), String(fatura.ano))}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isMesAtual ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>{fatura.label}</span>
                        <div className="flex items-center gap-2">
                          {fatura.parcelado > 0 && fatura.avulso > 0 && (
                            <span className="text-[10px] text-cyan-500 font-medium">{percParcelado}% parcelas</span>
                          )}
                          {fatura.total > 0 ? (
                            <span className={`text-base font-bold ${isMesAtual ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>{formatCurrency(fatura.total)}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                      {/* Barra degradê contínua */}
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        {fatura.total > 0 && (
                          <div
                            className="absolute h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${(fatura.total / maiorFatura) * 100}%`,
                              background: fatura.parcelado > 0 && fatura.avulso > 0
                                ? `linear-gradient(90deg, #3b82f6 0%, #6366f1 ${(fatura.avulso / fatura.total) * 100}%, #06b6d4 ${(fatura.avulso / fatura.total) * 100}%, #14b8a6 100%)`
                                : fatura.parcelado > 0
                                  ? 'linear-gradient(90deg, #06b6d4 0%, #14b8a6 100%)'
                                  : 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)'
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

      {/* Linha 2: Receitas e Despesas por Categoria */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
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
                            {formatCurrency(category.value)}
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
                            {formatCurrency(category.value)}
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
                        transacao.tipo === 'receita' ? 'bg-green-500' : 'bg-red-500'
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
                      transacao.tipo === 'receita' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                    }`}>
                      {transacao.tipo === 'receita' ? '+' : '-'}{formatCurrency(Math.abs(transacao.valor || 0))}
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
                        {formatCurrency(proximoLembrete.valor)}
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
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                selectedCategory?.tipo === 'receita' ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                {selectedCategory?.tipo === 'receita' ? (
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
                )}
              </div>
              {selectedCategory?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTransactions.length} lançamento(s) • Total: {formatCurrency(totalSelectedCategory)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {selectedTransactions.length > 0 ? (
              selectedTransactions.map((transacao) => {
                const percentage = totalSelectedCategory > 0 
                  ? ((Math.abs(transacao.valor || 0) / totalSelectedCategory) * 100).toFixed(1) 
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
                            transacao.tipo === 'receita' ? 'bg-green-500' : 'bg-red-500'
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
                          transacao.tipo === 'receita' 
                            ? 'text-green-600 dark:text-green-500' 
                            : 'text-red-600 dark:text-red-500'
                        }`}>
                          {formatCurrency(Math.abs(transacao.valor || 0))}
                        </div>
                        <div className={`text-xs font-semibold ${
                          transacao.tipo === 'receita' 
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
    </div>
  )
}
