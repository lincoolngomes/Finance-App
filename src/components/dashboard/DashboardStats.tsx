import type { KeyboardEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '/src/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Calendar, Landmark } from 'lucide-react'
import { formatCurrency } from '/src/utils/currency'

interface DashboardStatsProps {
  stats: {
    totalReceitas: number
    totalDespesas: number
    totalInvestimentos?: number
    saldo: number
    transacoesCount: number
    lembretesCount: number
  }
  hideValues?: boolean
  showInvestmentsSeparately?: boolean
  onOpenMonthDetails?: (filter: 'receitas' | 'despesas' | 'investimentos') => void
}

export function DashboardStats({
  stats,
  hideValues = false,
  showInvestmentsSeparately = false,
  onOpenMonthDetails,
}: DashboardStatsProps) {
  const getInteractiveCardProps = (filter: 'receitas' | 'despesas' | 'investimentos') => ({
    role: 'button' as const,
    tabIndex: 0,
    onClick: () => onOpenMonthDetails?.(filter),
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onOpenMonthDetails?.(filter)
      }
    },
  })

  return (
    <div className={`grid gap-4 md:grid-cols-2 ${showInvestmentsSeparately ? 'xl:grid-cols-5' : 'lg:grid-cols-4'}`}>
      <Card className={`relative overflow-hidden ${stats.saldo >= 0 ? 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20' : 'bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20'} hover:shadow-lg transition-all`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${stats.saldo >= 0 ? 'bg-blue-500/20' : 'bg-orange-500/20'}`}>
              <DollarSign className={`h-5 w-5 ${stats.saldo >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-orange-600 dark:text-orange-500'}`} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Saldo Atual</p>
            <p className={`text-2xl font-bold mb-0.5 ${stats.saldo >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-orange-600 dark:text-orange-500'}`}>
              {hideValues ? '••••••' : formatCurrency(stats.saldo)}
            </p>
            <p className="text-xs text-muted-foreground">Saldo atualizado</p>
          </div>
        </CardContent>
      </Card>

      <Card
        className="relative overflow-hidden bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:shadow-lg transition-all cursor-pointer"
        {...getInteractiveCardProps('receitas')}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-500" />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Total de Receitas</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-500 mb-0.5">
              {hideValues ? '••••••' : formatCurrency(stats.totalReceitas)}
            </p>
            <p className="text-xs text-muted-foreground">No período</p>
          </div>
        </CardContent>
      </Card>

      <Card
        className="relative overflow-hidden bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 hover:shadow-lg transition-all cursor-pointer"
        {...getInteractiveCardProps('despesas')}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Total de Despesas</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-500 mb-0.5">
              {hideValues ? '••••••' : formatCurrency(stats.totalDespesas)}
            </p>
            <p className="text-xs text-muted-foreground">No período</p>
          </div>
        </CardContent>
      </Card>

      {showInvestmentsSeparately && (
        <Card
          className="relative overflow-hidden bg-gradient-to-br from-sky-500/10 to-indigo-500/5 border-sky-500/20 hover:shadow-lg transition-all cursor-pointer"
          {...getInteractiveCardProps('investimentos')}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-sky-500/20">
                <Landmark className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Investimentos</p>
              <p className="text-2xl font-bold text-sky-600 dark:text-sky-400 mb-0.5">
                {hideValues ? '••••••' : formatCurrency(stats.totalInvestimentos || 0)}
              </p>
              <p className="text-xs text-muted-foreground">Fluxo líquido</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="relative overflow-hidden bg-gradient-to-br from-teal-500/10 to-teal-600/5 border-teal-500/20 hover:shadow-lg transition-all">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-teal-500/20">
              <Calendar className="h-5 w-5 text-teal-600 dark:text-teal-500" />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Lembretes Ativos</p>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-500 mb-0.5">{stats.lembretesCount}</p>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
