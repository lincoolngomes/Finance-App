
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
                <div key={transaction.id} className="border rounded-lg p-4 space-y-3 bg-white shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {transaction.tipo === 'receita' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <p className="font-medium text-sm">
                          {transaction.estabelecimento || 'Sem estabelecimento'}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {transaction.categorias?.nome || 'Sem categoria'}
                      </p>
                    </div>
                    <Badge variant={transaction.tipo === 'receita' ? 'default' : 'destructive'} className="text-xs">
                      {transaction.tipo}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(transaction.quando || '')}
                    </span>
                    <span className={`font-medium text-sm ${
                      transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.tipo === 'receita' ? '+' : '-'}
                      {transaction.valor ? formatCurrency(Math.abs(transaction.valor)) : 'R$ 0,00'}
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
                        {transaction.valor ? formatCurrency(Math.abs(transaction.valor)) : 'R$ 0,00'}
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
