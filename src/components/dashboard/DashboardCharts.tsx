
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/utils/currency'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

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

interface DashboardChartsProps {
  transacoes: Transacao[]
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#84cc16']

export function DashboardCharts({ transacoes }: DashboardChartsProps) {
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
    const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + (t.valor || 0), 0)
    const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + Math.abs(t.valor || 0), 0)

    return [
      { name: 'Receitas', value: receitas },
      { name: 'Despesas', value: despesas }
    ]
  }

  const totalReceitas = transacoes.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + (t.valor || 0), 0)
  const totalDespesas = transacoes.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + (t.valor || 0), 0)
  const saldo = totalReceitas - totalDespesas

  const stats = {
    totalReceitas,
    totalDespesas,
    saldo,
    transacoesCount: transacoes.length,
    lembretesCount: 0
  }

  const categoriesData = getCategoriesData()
  const receitasDespesasData = getReceitasDespesasData()

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="shadow-lg border border-red-500/20 bg-gradient-to-br from-red-950/50 to-rose-950/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
            💰 Gastos por Categoria
          </CardTitle>
          <CardDescription className="text-sm text-red-300/70">
            Distribuição dos seus gastos no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoriesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={120}
                  innerRadius={60}
                  paddingAngle={2}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoriesData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Valor']}
                  labelStyle={{ color: '#e2e8f0' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(16px)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legenda personalizada */}
            <div className="absolute top-0 right-0 space-y-2 text-xs">
              {categoriesData.slice(0, 4).map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full shadow-lg" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-slate-300 font-medium truncate max-w-[100px]">
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border border-emerald-500/20 bg-gradient-to-br from-emerald-950/50 to-red-950/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-red-400 bg-clip-text text-transparent">
            📊 Receitas vs Despesas
          </CardTitle>
          <CardDescription className="text-sm text-emerald-300/70">
            Comparação entre receitas e despesas do período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={receitasDespesasData} 
                margin={{ top: 30, right: 30, left: 40, bottom: 20 }}
                barCategoryGap="30%"
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(34, 197, 94, 0.2)"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 14, fontWeight: 500, fill: '#e2e8f0' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value).replace('R$', 'R$')}
                  tick={{ fontSize: 12, fill: '#cbd5e1' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(Number(value)), name]}
                  labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(16px)'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[8, 8, 0, 0]}
                  fill="url(#colorGradient)"
                >
                  {receitasDespesasData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'Receitas' 
                        ? 'url(#receitas)' 
                        : 'url(#despesas)'
                      } 
                    />
                  ))}
                </Bar>
                
                {/* Gradientes */}
                <defs>
                  <linearGradient id="receitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="despesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 shadow-lg border border-blue-500/20 bg-gradient-to-br from-blue-950/50 to-slate-950/50 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            📈 Resumo do Período
          </CardTitle>
          <CardDescription className="text-sm text-blue-300/70">
            Estatísticas detalhadas do período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
              <div className="relative">
                <div className="text-green-100 text-sm font-medium mb-1">💰 Receitas</div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalReceitas)}
                </div>
              </div>
            </div>
            
            <div className="relative overflow-hidden bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-2xl shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
              <div className="relative">
                <div className="text-red-100 text-sm font-medium mb-1">💸 Despesas</div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(Math.abs(stats.totalDespesas))}
                </div>
              </div>
            </div>
            
            <div className={`relative overflow-hidden ${stats.saldo >= 0 
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
              : 'bg-gradient-to-br from-yellow-500 to-orange-600'} p-6 rounded-2xl shadow-lg`}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
              <div className="relative">
                <div className={`${stats.saldo >= 0 ? 'text-blue-100' : 'text-yellow-100'} text-sm font-medium mb-1`}>
                  {stats.saldo >= 0 ? '📊 Saldo' : '⚠️ Déficit'}
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(stats.saldo)}
                </div>
              </div>
            </div>
            
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-violet-600 p-6 rounded-2xl shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
              <div className="relative">
                <div className="text-purple-100 text-sm font-medium mb-1">🔄 Transações</div>
                <div className="text-2xl font-bold text-white">
                  {stats.transacoesCount}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
