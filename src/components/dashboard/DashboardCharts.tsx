
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/utils/currency'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import { Calendar, Lightbulb } from 'lucide-react'

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
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#84cc16']

const dicas = [
  "💡 Sempre registre suas despesas no mesmo dia para não esquecer",
  "💡 Defina metas mensais de economia e acompanhe seu progresso",
  "💡 Categorize suas despesas para identificar onde gasta mais",
  "💡 Configure lembretes para não perder datas de pagamento",
  "💡 Revise seus gastos semanalmente para manter o controle",
  "💡 Separe uma quantia fixa para emergências todo mês"
]

export function DashboardCharts({ transacoes, recentTransacoes, contas = [], lembretes = [] }: DashboardChartsProps) {
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
  const allTransacoes = recentTransacoes || transacoes

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

  const getCategoriesData = () => {
    const categorias: { [key: string]: number } = {}
    
    transacoes.forEach(t => {
      if (t.categorias?.nome && t.valor && t.tipo === 'despesa') {
        categorias[t.categorias.nome] = (categorias[t.categorias.nome] || 0) + Math.abs(t.valor)
      }
    })

    return Object.entries(categorias)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6) // Limitar a 6 categorias para melhor visualização
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
    const monthlyData: { [key: string]: { receitas: number; despesas: number } } = {}
    
    // Inicializar todos os 12 meses do ano
    for (let month = 0; month < 12; month++) {
      const monthKey = String(month).padStart(2, '0')
      const monthName = new Date(2000, month, 1).toLocaleDateString('pt-BR', { month: 'short' })
      monthlyData[monthKey] = { receitas: 0, despesas: 0 }
    }

    // Agrupar transações por mês (usando transações filtradas)
    transacoes.forEach(t => {
      const date = parseDateUniversal(t.quando || t.created_at)
      if (!date) return

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

  const categoriesData = getCategoriesData()
  const receitasDespesasData = getReceitasDespesasData()
  const monthlyBalanceData = getMonthlyBalanceData()

  return (
    <div className="space-y-6">
      {/* Linha 1: Evolução Mensal (2/3) + Gastos por Categoria (1/3) */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Evolução Mensal - 2/3 */}
        <Card className="lg:col-span-2 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="border-b bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Evolução Mensal</CardTitle>
                <CardDescription className="text-sm">Comparação entre receitas e despesas mês a mês</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] md:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyBalanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
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
                  <Line 
                    type="monotone" 
                    dataKey="receitas" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="despesas" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gastos por Categoria - 1/3 */}
        <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="border-b bg-gradient-to-r from-red-500/10 via-rose-500/10 to-red-500/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 shadow-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Gastos por Categoria</CardTitle>
                <CardDescription className="text-xs">Distribuição dos gastos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[250px] md:h-[300px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoriesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius="70%"
                    innerRadius="30%"
                    paddingAngle={2}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoriesData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const totalValue = categoriesData.reduce((sum, item) => sum + item.value, 0)
                      const percentage = totalValue > 0 ? ((Number(value) / totalValue) * 100).toFixed(1) : 0
                      return [
                        `${formatCurrency(Number(value))} (${percentage}%)`, 
                        props.payload.name
                      ]
                    }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Resumo do Período - Full Width */}
      <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Resumo do Período</CardTitle>
              <CardDescription className="text-sm">Estatísticas detalhadas do período selecionado</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="group relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Receitas</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                    {formatCurrency(stats.totalReceitas)}
                  </div>
                </div>
                <div className="text-3xl opacity-20 group-hover:opacity-30 transition-opacity">💰</div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-red-500/10 to-rose-500/5 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Despesas</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-500">
                    {formatCurrency(Math.abs(stats.totalDespesas))}
                  </div>
                </div>
                <div className="text-3xl opacity-20 group-hover:opacity-30 transition-opacity">💸</div>
              </div>
            </div>
            
            <div className={`group relative overflow-hidden p-5 rounded-xl ${stats.saldo >= 0 ? 'bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 hover:border-blue-500/40' : 'bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 hover:border-orange-500/40'} transition-all duration-300 hover:shadow-md`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {stats.saldo >= 0 ? 'Saldo' : 'Déficit'}
                  </div>
                  <div className={`text-2xl font-bold ${stats.saldo >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-orange-600 dark:text-orange-500'}`}>
                    {formatCurrency(stats.saldo)}
                  </div>
                </div>
                <div className="text-3xl opacity-20 group-hover:opacity-30 transition-opacity">{stats.saldo >= 0 ? '📊' : '⚠️'}</div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Transações</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-500">
                    {stats.transacoesCount}
                  </div>
                </div>
                <div className="text-3xl opacity-20 group-hover:opacity-30 transition-opacity">🔄</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linha 3: Últimos Lançamentos (2/3) + Lembretes (1/3) */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Últimos Lançamentos - 2/3 */}
        <Card className="lg:col-span-2 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="border-b bg-gradient-to-r from-slate-500/10 via-slate-400/10 to-slate-500/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-slate-600 to-slate-500 shadow-lg">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Últimos Lançamentos</CardTitle>
                <CardDescription className="text-sm">Os 5 lançamentos mais recentes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
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
                    className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-card to-card/50 border border-border/50 hover:border-border hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        transacao.tipo === 'receita' 
                          ? 'bg-green-500/10 border border-green-500/20' 
                          : 'bg-red-500/10 border border-red-500/20'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          transacao.tipo === 'receita' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                      </div>
                    <div>
                      <div className="font-semibold group-hover:text-primary transition-colors">
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
                    <div className={`font-bold ${
                      transacao.tipo === 'receita' ? 'text-green-400' : 'text-red-400'
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
          <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="border-b bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-purple-500/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 shadow-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-bold">Próximo Lembrete</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {(() => {
                const proximoLembrete = lembretes
                  .filter(l => l.data && new Date(l.data) >= new Date())
                  .sort((a, b) => new Date(a.data!).getTime() - new Date(b.data!).getTime())[0]
                
                return proximoLembrete ? (
                  <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-violet-500/5 border border-purple-500/20">
                    <p className="font-semibold text-base">{proximoLembrete.descricao}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(proximoLembrete.data!).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {proximoLembrete.valor && (
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-500">
                        {formatCurrency(proximoLembrete.valor)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2 opacity-20">📅</div>
                    <p className="text-sm text-muted-foreground">Nenhum lembrete próximo</p>
                  </div>
                )
              })()}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="border-b bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 shadow-lg">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-bold">Dica do Dia</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border border-amber-500/20">
                <p className="text-sm leading-relaxed">
                  {dicas[new Date().getDate() % dicas.length]}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
