
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency } from '@/utils/currency'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, ReferenceLine } from 'recharts'
import { Calendar, TrendingDown, TrendingUp } from 'lucide-react'
import { useState, useMemo } from 'react'

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

interface DashboardChartsProps {
  transacoes: Transacao[]
  recentTransacoes?: Transacao[]
  contas?: any[]
  lembretes?: Lembrete[]
  selectedMonth?: string
  selectedYear?: string
  allTransactions?: Transacao[]
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#84cc16']

export function DashboardCharts({ transacoes, recentTransacoes, contas = [], lembretes = [], selectedMonth, selectedYear, allTransactions }: DashboardChartsProps) {
  const parseDateUniversal = (dateStr: any): Date | null => {
    if (!dateStr && dateStr !== 0) return null
    const s = String(dateStr).trim()

    // dd/mm/yyyy or d/m/yyyy
    const dmYMatch = s.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})$/)
    if (dmYMatch) {
      const d = Number(dmYMatch[1])
      const m = Number(dmYMatch[2])
      const y = Number(dmYMatch[3])
      const fullYear = y < 100 ? 2000 + y : y
      // normalize to UTC midnight
      const dt = new Date(Date.UTC(fullYear, m - 1, d))
      return isNaN(dt.getTime()) ? null : dt
    }

    // ISO or other
    const dtIso = new Date(s)
    if (isNaN(dtIso.getTime())) return null
    return new Date(Date.UTC(dtIso.getUTCFullYear(), dtIso.getUTCMonth(), dtIso.getUTCDate()))
  }

  // Usa transações globais para stats do "Resumo do Período"
  const allTransacoes = allTransactions || recentTransacoes || transacoes

  if (import.meta.env.DEV) {
    const sample = allTransacoes.slice(0, 10).map(t => ({
      id: t.id,
      quando: t.quando,
      created_at: t.created_at,
      parsed_quando: parseDateUniversal(t.quando)?.toISOString() ?? null,
      parsed_created_at: parseDateUniversal(t.created_at)?.toISOString() ?? null
    }))
    console.debug('DashboardCharts sample dates:', sample)
  }

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<{ name: string, tipo: 'receita' | 'despesa' } | null>(null)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())

  const getCategoriesData = (tipo: 'receita' | 'despesa') => {
    const categorias: { [key: string]: number } = {}
    
    transacoes.forEach(t => {
      if (t.categorias?.nome && t.valor && t.tipo === tipo) {
        categorias[t.categorias.nome] = (categorias[t.categorias.nome] || 0) + Math.abs(t.valor)
      }
    })

    return Object.entries(categorias)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6) // Limitar a 6 categorias para melhor visualização
  }

  const getCategoryTransactions = (categoryName: string, tipo: 'receita' | 'despesa') => {
    return transacoes
      .filter(t => t.categorias?.nome === categoryName && t.tipo === tipo)
      .sort((a, b) => {
        const dateA = parseDateUniversal(a.quando)
        const dateB = parseDateUniversal(b.quando)
        if (!dateA || !dateB) return 0
        return dateB.getTime() - dateA.getTime()
      })
  }

  const getReceitasDespesasData = () => {
    const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + (Number(t.valor) || 0), 0)
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
      const date = parseDateUniversal(t.quando || t.created_at)
      if (!date) return
      
      // Filtrar apenas transações do ano selecionado
      if (date.getUTCFullYear() !== currentYear) return

      const monthKey = String(date.getUTCMonth()).padStart(2, '0')
      if (monthlyData[monthKey]) {
        if (t.tipo === 'receita') {
          monthlyData[monthKey].receitas += Math.abs(Number(t.valor) || 0)
        } else if (t.tipo === 'despesa') {
          monthlyData[monthKey].despesas += Math.abs(Number(t.valor) || 0)
        }
      }
    })

    // Converter para array
    return Object.keys(monthlyData).map((key) => {
      const month = parseInt(key)
      const monthName = new Date(2000, month, 1).toLocaleDateString('pt-BR', { month: 'short' })
      return {
        monthKey: key,
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        receitas: Math.round(monthlyData[key].receitas),
        despesas: Math.round(monthlyData[key].despesas)
      }
    })
  }

  // Calcula stats usando TODAS as transações (global), não apenas filtradas
  const totalSaldoInicial = contas.reduce((acc, conta) => {
    const s = (typeof conta.saldo_inicial !== 'undefined' && conta.saldo_inicial !== null)
      ? Number(conta.saldo_inicial)
      : (typeof conta.saldoInicial !== 'undefined' && conta.saldoInicial !== null ? Number(conta.saldoInicial) : 0)
    return acc + Math.abs(isNaN(s) ? 0 : s)
  }, 0)
  
  const totalReceitas = allTransacoes.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + Math.abs(t.valor || 0), 0)
  const totalDespesas = allTransacoes.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + Math.abs(t.valor || 0), 0)
  const saldo = totalSaldoInicial + totalReceitas - totalDespesas

  const stats = {
    totalReceitas,
    totalDespesas,
    saldo,
    transacoesCount: allTransacoes.length,
    lembretesCount: 0
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

  return (
    <div className="space-y-6">
      {/* Linha 1: Evolução Mensal (2/3) + Gastos por Categoria (1/3) */}
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
                <LineChart data={monthlyBalanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis 
                    dataKey="month" 
                    tick={(props) => {
                      const { x, y, payload } = props
                      const dataPoint = monthlyBalanceData.find(d => d.month === payload.value)
                      const isSelected = dataPoint?.monthKey === selectedMonth
                      
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text 
                            x={0} 
                            y={0} 
                            dy={16} 
                            textAnchor="middle" 
                            fill={isSelected ? 'rgba(59, 130, 246, 0.85)' : 'rgba(148, 163, 184, 0.8)'}
                            fontSize={12}
                            fontWeight={isSelected ? 600 : 400}
                          >
                            {payload.value}
                          </text>
                          {isSelected && (
                            <circle cx={0} cy={-8} r={2.5} fill="rgba(59, 130, 246, 0.6)" />
                          )}
                        </g>
                      )
                    }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      const label = name === 'receitas' ? 'Receitas' : 'Despesas'
                      return [formatCurrency(value), label]
                    }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                    formatter={(value) => {
                      const labels: any = { receitas: 'Receitas', despesas: 'Despesas' }
                      return labels[value] || value
                    }}
                  />
                  {selectedMonth && (
                    <ReferenceLine 
                      x={monthlyBalanceData.find(d => d.monthKey === selectedMonth)?.month}
                      stroke="rgba(59, 130, 246, 0.5)"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      label={{ 
                        value: '●', 
                        position: 'top',
                        fill: 'rgba(59, 130, 246, 0.8)',
                        fontSize: 18,
                        offset: 10
                      }}
                    />
                  )}
                  <Line 
                    type="monotone" 
                    dataKey="receitas" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={(props: any) => {
                      const dataPoint = monthlyBalanceData.find(d => d.month === props.payload.month)
                      const isSelected = dataPoint?.monthKey === selectedMonth
                      return (
                        <circle 
                          cx={props.cx} 
                          cy={props.cy} 
                          r={isSelected ? 6.5 : 5} 
                          fill="#10b981"
                          stroke={isSelected ? 'rgba(59, 130, 246, 0.6)' : '#fff'}
                          strokeWidth={isSelected ? 2.5 : 2}
                        />
                      )
                    }}
                    activeDot={{ r: 7 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="despesas" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    dot={(props: any) => {
                      const dataPoint = monthlyBalanceData.find(d => d.month === props.payload.month)
                      const isSelected = dataPoint?.monthKey === selectedMonth
                      return (
                        <circle 
                          cx={props.cx} 
                          cy={props.cy} 
                          r={isSelected ? 6.5 : 5} 
                          fill="#ef4444"
                          stroke={isSelected ? 'rgba(59, 130, 246, 0.6)' : '#fff'}
                          strokeWidth={isSelected ? 2.5 : 2}
                        />
                      )
                    }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gastos por Categoria - 1/3 */}
        <Card className="overflow-hidden border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-500/10">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Gastos por Categoria</CardTitle>
                <CardDescription className="text-xs">Distribuição dos gastos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Legenda com checkboxes */}
              <div className="flex flex-wrap gap-2">
                {despesasDataAll.map((category, index) => {
                  const isHidden = hiddenCategories.has(category.name)
                  return (
                    <button
                      key={index}
                      onClick={() => toggleCategoryVisibility(category.name)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        isHidden 
                          ? 'bg-muted text-muted-foreground opacity-50' 
                          : 'bg-card border hover:shadow-md'
                      }`}
                    >
                      <div 
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: isHidden ? '#666' : COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate max-w-[80px]">{category.name}</span>
                    </button>
                  )
                })}
              </div>

              {/* Gráfico de Pizza */}
              <div className="h-[220px] relative">
                {despesasData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={despesasData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius="80%"
                        innerRadius="50%"
                        paddingAngle={2}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {despesasData.map((entry, index) => {
                          const originalIndex = despesasDataAll.findIndex(c => c.name === entry.name)
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[originalIndex % COLORS.length]}
                              stroke="rgba(255,255,255,0.2)"
                              strokeWidth={2}
                            />
                          )
                        })}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null
                          const data = payload[0]
                          const totalValue = despesasData.reduce((sum, item) => sum + item.value, 0)
                          const percentage = totalValue > 0 ? ((Number(data.value) / totalValue) * 100).toFixed(1) : 0
                          
                          return (
                            <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-3">
                              <p className="font-semibold text-sm mb-1">{data.name}</p>
                              <p className="text-xs">
                                <span className="font-bold">{formatCurrency(Number(data.value))}</span>
                                <span className="text-muted-foreground ml-1">({percentage}%)</span>
                              </p>
                            </div>
                          )
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-muted-foreground">Selecione ao menos uma categoria</p>
                  </div>
                )}
              </div>
            </div>
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

      {/* Linha 3: Resumo do Período - Full Width */}
      <Card className="overflow-hidden border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Resumo do Período</CardTitle>
              <CardDescription className="text-xs">Estatísticas detalhadas do período selecionado</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Receitas</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-500">
                {formatCurrency(stats.totalReceitas)}
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">💸</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Despesas</div>
              <div className="text-xl font-bold text-red-600 dark:text-red-500">
                {formatCurrency(Math.abs(stats.totalDespesas))}
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stats.saldo >= 0 ? '📊' : '⚠️'}</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {stats.saldo >= 0 ? 'Saldo' : 'Déficit'}
              </div>
              <div className={`text-xl font-bold ${stats.saldo >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-orange-600 dark:text-orange-500'}`}>
                {formatCurrency(stats.saldo)}
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🔄</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Transações</div>
              <div className="text-xl font-bold text-teal-600 dark:text-teal-500">
                {stats.transacoesCount}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linha 4: Últimos Lançamentos (2/3) + Lembretes (1/3) */}
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
              { (recentTransacoes ?? transacoes)
                .slice()
                .sort((a, b) => {
                  const aTime = parseDateUniversal(a.quando ?? a.created_at)?.getTime() || 0
                  const bTime = parseDateUniversal(b.quando ?? b.created_at)?.getTime() || 0
                  return bTime - aTime
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
                        {transacao.estabelecimento || 'Sem estabelecimento'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                          {transacao.categorias?.nome || 'Sem categoria'} • {
                            (() => {
                              const raw = transacao.quando ?? transacao.created_at
                              const parsed = parseDateUniversal(raw)
                              return parsed ? parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : String(raw || '')
                            })()
                          }
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
              {(recentTransacoes ?? transacoes).length === 0 && (
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
                    <p className="font-medium text-sm">{proximoLembrete.descricao}</p>
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
                            {transacao.estabelecimento || 'Sem estabelecimento'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const raw = transacao.quando ?? transacao.created_at
                            const parsed = parseDateUniversal(raw)
                            return parsed ? parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : String(raw || '')
                          })()}
                        </div>
                        {transacao.detalhes && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {transacao.detalhes}
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
