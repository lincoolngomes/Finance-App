import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { History, FileText, FileSpreadsheet, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ImportHistory {
  id: string
  account_id: string
  file_name: string
  file_type: 'csv' | 'pdf'
  transactions_count: number
  imported_at: string
  accounts?: {
    name: string
    banco: string
    cor: string
  }
}

interface HistoricoImportacoesModalProps {
  open: boolean
  onClose: () => void
}

export function HistoricoImportacoesModal({ open, onClose }: HistoricoImportacoesModalProps) {
  const { user } = useAuth()
  const [historico, setHistorico] = useState<ImportHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && user) {
      fetchHistorico()
    }
  }, [open, user])

  const fetchHistorico = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('import_history')
      .select(`
        *,
        accounts:account_id (
          name,
          banco,
          cor
        )
      `)
      .eq('userid', user?.id)
      .order('imported_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setHistorico(data as any)
    }
    
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const confirmacao = confirm('Deseja realmente excluir este registro do histórico?\n\nNOTA: Isso não removerá as transações importadas, apenas o registro do histórico.')
    
    if (!confirmacao) return

    const { error } = await supabase
      .from('import_history')
      .delete()
      .eq('id', id)

    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      })
    } else {
      toast({
        title: 'Registro excluído',
        description: 'Registro removido do histórico'
      })
      fetchHistorico()
    }
  }

  const totalImportacoes = historico.length
  const totalTransacoes = historico.reduce((sum, h) => sum + h.transactions_count, 0)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Importações
          </DialogTitle>
          <DialogDescription>
            Acompanhe todas as importações de faturas realizadas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total de Importações</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalImportacoes}</p>
            </Card>
            <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Total de Transações</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">{totalTransacoes}</p>
            </Card>
          </div>

          {/* Lista de importações */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhuma importação realizada ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Importe faturas de cartão para visualizar o histórico aqui
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historico.map((item) => (
                <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Ícone do tipo de arquivo */}
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        item.file_type === 'csv' 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {item.file_type === 'csv' ? (
                          <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
                        ) : (
                          <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
                        )}
                      </div>

                      {/* Informações */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm truncate">{item.file_name}</p>
                          <Badge variant="secondary" className="text-xs">
                            {item.file_type.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Cartão */}
                        {item.accounts && (
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.accounts.cor || '#3b82f6' }}
                            />
                            <p className="text-sm text-muted-foreground">
                              {item.accounts.name} - {item.accounts.banco}
                            </p>
                          </div>
                        )}

                        {/* Data e quantidade */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            📅 {format(new Date(item.imported_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {item.transactions_count} transação{item.transactions_count !== 1 ? 'ões' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botão de deletar */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
