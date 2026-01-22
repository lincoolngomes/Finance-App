
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'

interface TransactionSummaryCardsProps {
  receitas: number
  despesas: number
  saldo: number
  despesasPendentes?: number
}

export function TransactionSummaryCards({ receitas, despesas, saldo, despesasPendentes = 0 }: TransactionSummaryCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Card Saldo */}
      <Card className="border-0 bg-gradient-to-br from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo</CardTitle>
          <DollarSign className="h-4 w-4 opacity-70" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-white' : 'text-yellow-100'}`}>
            {formatCurrency(saldo)}
          </div>
        </CardContent>
      </Card>

      {/* Card Receitas */}
      <Card className="border-0 bg-gradient-to-br from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receitas</CardTitle>
          <TrendingUp className="h-4 w-4 opacity-70" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-white">
            {formatCurrency(receitas)}
          </div>
          <p className="text-xs text-green-100 mt-1">Mês atual</p>
        </CardContent>
      </Card>

      {/* Card Despesas */}
      <Card className="border-0 bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Despesas</CardTitle>
          <TrendingDown className="h-4 w-4 opacity-70" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-white">
            {formatCurrency(despesas)}
          </div>
          <p className="text-xs text-red-100 mt-1">Mês atual</p>
        </CardContent>
      </Card>

      {/* Card Despesas Pendentes */}
      <Card className="border-0 bg-gradient-to-br from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-800 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Despesas Pendentes</CardTitle>
          <Clock className="h-4 w-4 opacity-70" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-white">
            {formatCurrency(despesasPendentes)}
          </div>
          <p className="text-xs text-orange-100 mt-1">A pagar</p>
        </CardContent>
      </Card>
    </div>
  )
}
