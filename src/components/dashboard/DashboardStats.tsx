
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'

interface DashboardStatsProps {
  stats: {
    totalReceitas: number
    totalDespesas: number
    saldo: number
    transacoesCount: number
    lembretesCount: number
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-all">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-green-500/20 to-green-500/5 p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total de Receitas</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalReceitas)}</p>
                <p className="text-xs text-muted-foreground mt-1">Mês atual</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-l-4 border-l-red-500 hover:shadow-lg transition-all">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-red-500/20 to-red-500/5 p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total de Despesas</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalDespesas)}</p>
                <p className="text-xs text-muted-foreground mt-1">Mês atual</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-l-4 border-l-primary hover:shadow-lg transition-all">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
                <p className={`text-2xl font-bold ${stats.saldo >= 0 ? 'text-primary' : 'text-red-600'}`}>
                  {formatCurrency(stats.saldo)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Receitas - Despesas</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-l-4 border-l-purple-500 hover:shadow-lg transition-all">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-purple-500/20 to-purple-500/5 p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Lembretes Ativos</p>
                <p className="text-2xl font-bold text-purple-600">{stats.lembretesCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Este mês</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
