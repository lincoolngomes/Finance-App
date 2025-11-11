
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, BarChart } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'

interface ReportSummaryProps {
  receitas: number
  despesas: number
  saldo: number
  totalTransactions: number
}

export function ReportSummary({ receitas, despesas, saldo, totalTransactions }: ReportSummaryProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-sm font-medium">Total de Receitas</CardTitle>
          <TrendingUp className="h-4 w-4 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-xl sm:text-xl lg:text-2xl font-bold text-green-600">
            {formatCurrency(receitas)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-sm font-medium">Total de Despesas</CardTitle>
          <TrendingDown className="h-4 w-4 sm:h-4 sm:w-4 text-red-600 flex-shrink-0" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-xl sm:text-xl lg:text-2xl font-bold text-red-600">
            {formatCurrency(despesas)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-sm font-medium">Saldo</CardTitle>
          <DollarSign className={`h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0 ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`} />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className={`text-xl sm:text-xl lg:text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(saldo)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-sm font-medium">Total de Transações</CardTitle>
          <BarChart className="h-4 w-4 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-xl sm:text-xl lg:text-2xl font-bold text-blue-600">
            {totalTransactions}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
