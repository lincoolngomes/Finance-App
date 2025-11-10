
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'

interface TransactionSummaryCardsProps {
  receitas: number
  despesas: number
  saldo: number
}

export function TransactionSummaryCards({ receitas, despesas, saldo }: TransactionSummaryCardsProps) {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-4 sm:mb-6">
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium line-clamp-1">Total Receitas</CardTitle>
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
            {formatCurrency(receitas)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium line-clamp-1">Total Despesas</CardTitle>
          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 flex-shrink-0" />
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
            {formatCurrency(despesas)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium line-clamp-1">Saldo</CardTitle>
          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(saldo)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
