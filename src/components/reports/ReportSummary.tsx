
import { Card, CardContent, CardHeader, CardTitle } from '/src/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, BarChart } from 'lucide-react'
import { formatCurrency } from '/src/utils/currency'

interface ReportSummaryProps {
  receitas: number
  despesas: number
  saldo: number
  totalTransactions: number
}

export function ReportSummary({ receitas, despesas, saldo, totalTransactions }: ReportSummaryProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-all">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-green-500/20 to-green-500/5 p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total de Receitas</p>
                <p className="text-xl lg:text-2xl font-bold text-green-600">{formatCurrency(receitas)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
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
                <p className="text-xl lg:text-2xl font-bold text-red-600">{formatCurrency(despesas)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={`overflow-hidden border-l-4 hover:shadow-lg transition-all ${saldo >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
        <CardContent className="p-0">
          <div className={`bg-gradient-to-r p-4 border-b border-border/50 ${saldo >= 0 ? 'from-green-500/20 to-green-500/5' : 'from-red-500/20 to-red-500/5'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Saldo</p>
                <p className={`text-xl lg:text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(saldo)}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${saldo >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                <DollarSign className={`h-5 w-5 ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-all">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-blue-500/20 to-blue-500/5 p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total de Transações</p>
                <p className="text-xl lg:text-2xl font-bold text-blue-600">{totalTransactions}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <BarChart className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
