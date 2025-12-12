
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
        <Card className="lg:col-span-2 overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-all">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-blue-500/20 to-blue-500/5 p-4 border-b border-border/50">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                <span className="text-2xl">📈</span>
              </div>
              <CardTitle className="text-xl font-bold">Evolução Mensal</CardTitle>
              <CardDescription className="text-sm">Comparação entre receitas e despesas mês a mês</CardDescription>
            </div>
            <div className="h-[300px] md:h-[350px] p-6">
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
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
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
        <Card className="overflow-hidden border-l-4 border-l-red-500 hover:shadow-lg transition-all">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-red-500/20 to-red-500/5 p-4 border-b border-border/50">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-3">
                <span className="text-2xl">💰</span>
              </div>
              <CardTitle className="text-xl font-bold">Gastos por Categoria</CardTitle>
              <CardDescription className="text-sm">Distribuição dos seus gastos</CardDescription>
            </div>
            <div className="p-4">
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
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
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
      <Card className="overflow-hidden border-l-4 border-l-primary hover:shadow-lg transition-all">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-4 border-b border-border/50">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              <span className="text-2xl">📈</span>
            </div>
            <CardTitle className="text-xl font-bold">Resumo do Período</CardTitle>
            <CardDescription className="text-sm">Estatísticas detalhadas do período selecionado</CardDescription>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="text-sm text-muted-foreground mb-1">💰 Receitas</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-500">
                  {formatCurrency(stats.totalReceitas)}
                </div>
              </div>
              
              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="text-sm text-muted-foreground mb-1">💸 Despesas</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-500">
                  {formatCurrency(Math.abs(stats.totalDespesas))}
                </div>
              </div>
              
              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="text-sm text-muted-foreground mb-1">
                  {stats.saldo >= 0 ? '📊 Saldo' : '⚠️ Déficit'}
                </div>
                <div className={`text-lg font-bold ${stats.saldo >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-orange-600 dark:text-orange-500'}`}>
                  {formatCurrency(stats.saldo)}
                </div>
              </div>
              
              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="text-sm text-muted-foreground mb-1">🔄 Transações</div>
                <div className="text-lg font-bold">
                  {stats.transacoesCount}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linha 3: Últimos Lançamentos (2/3) + Lembretes (1/3) */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Últimos Lançamentos - 2/3 */}
        <Card className="lg:col-span-2 overflow-hidden border-l-4 border-l-slate-500 hover:shadow-lg transition-all">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-slate-500/20 to-slate-500/5 p-4 border-b border-border/50">
              <div className="w-12 h-12 rounded-full bg-slate-500/20 flex items-center justify-center mb-3">
                <span className="text-2xl">📋</span>
              </div>
              <CardTitle className="text-xl font-bold">Últimos Lançamentos</CardTitle>
              <CardDescription className="text-sm">Os 5 lançamentos mais recentes</CardDescription>
            </div>
            <div className="p-6 space-y-3">
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
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        transacao.tipo === 'receita' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    <div>
                      <div className="font-medium">
                        {transacao.estabelecimento || 'Sem estabelecimento'}
                      </div>
                      <div className="text-sm text-muted-foreground">
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
          <Card className="overflow-hidden border-l-4 border-l-purple-500 hover:shadow-lg transition-all">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-purple-500/20 to-purple-500/5 p-4 border-b border-border/50">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                </div>
                <CardTitle className="text-lg font-bold">Próximo Lembrete</CardTitle>
              </div>
              <div className="p-4">
              {(() => {
                const proximoLembrete = lembretes
                  .filter(l => l.data && new Date(l.data) >= new Date())
                  .sort((a, b) => new Date(a.data!).getTime() - new Date(b.data!).getTime())[0]
                
                return proximoLembrete ? (
                  <div className="space-y-2">
                    <p className="font-medium">{proximoLembrete.descricao}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(proximoLembrete.data!).toLocaleDateString('pt-BR')}
                    </p>
                    {proximoLembrete.valor && (
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-500">
                        {formatCurrency(proximoLembrete.valor)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-2">Nenhum lembrete próximo</p>
                )
              })()}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-amber-500 hover:shadow-lg transition-all">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 p-4 border-b border-border/50">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center mb-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                </div>
                <CardTitle className="text-lg font-bold">Dica do Dia</CardTitle>
              </div>
              <div className="p-4">
                <p className="text-sm">
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
