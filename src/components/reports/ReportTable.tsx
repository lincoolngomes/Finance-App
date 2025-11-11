
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'
import { ReportTransaction } from '@/hooks/useReports'

interface ReportTableProps {
  transactions: ReportTransaction[]
}

export function ReportTable({ transactions }: ReportTableProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Detalhes das Transações</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma transação encontrada com os filtros aplicados.
          </div>
        ) : (
          <>
            {/* Visualização mobile - cards empilhados */}
            <div className="space-y-4 sm:hidden">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        {transaction.tipo === 'receita' ? (
                          <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                        <p className="font-semibold text-base text-gray-900 line-clamp-2">
                          {transaction.estabelecimento || 'Sem estabelecimento'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">
                          {transaction.categorias?.nome || 'Sem categoria'}
                        </p>
                        <span className="text-gray-400">•</span>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.quando || '')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge 
                      variant={transaction.tipo === 'receita' ? 'default' : 'destructive'} 
                      className="text-sm px-3 py-1">
                      {transaction.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </Badge>
                    <span className={`font-bold text-lg ${
                      transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.tipo === 'receita' ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.valor || 0))}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Visualização desktop - tabela original */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Estabelecimento</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.quando || '')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {transaction.tipo === 'receita' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          {transaction.estabelecimento || 'Sem estabelecimento'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.categorias?.nome || 'Sem categoria'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.tipo === 'receita' ? 'default' : 'destructive'}>
                          {transaction.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.tipo === 'receita' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.valor || 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
