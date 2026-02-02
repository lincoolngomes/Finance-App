import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/utils/currency'
import { Calendar, CreditCard, DollarSign, Clock, CheckCircle2, AlertCircle, Upload } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { addMonths, format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Cartao {
  id: string
  name: string
  banco: string
  limite: number
  dia_fechamento: string
  dia_vencimento: string
  cor: string
  tipo: string
  linked_account_id?: string | null
}

interface Transacao {
  id: number
  quando: string
  estabelecimento: string
  valor: number
  tipo: string
  categoria?: string
  categorias?: { id: string; nome: string }
  account_id: string
  parcela_atual?: number
  total_parcelas?: number
}

interface Fatura {
  mes: string
  ano: string
  dataFechamento: Date
  dataVencimento: Date
  transacoes: Transacao[]
  total: number
  paga: boolean
  vencida: boolean
}

export function GerenciarFaturasModal({ 
  open, 
  onClose, 
  initialCardId,
  onImportClick
}: { 
  open: boolean
  onClose: () => void
  initialCardId?: string | null
  onImportClick?: (cardId: string) => void
}) {
  const { user } = useAuth()
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [selectedCard, setSelectedCard] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [fatura, setFatura] = useState<Fatura | null>(null)
  const [loading, setLoading] = useState(false)

  const meses = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ]

  const currentYear = new Date().getFullYear()
  const anos = Array.from({ length: 3 }, (_, i) => ({
    value: String(currentYear + i),
    label: String(currentYear + i),
  }))

  useEffect(() => {
    if (open && user) {
      fetchCartoes()
      // Inicializar com mês/ano atual
      const now = new Date()
      setSelectedMonth(String(now.getMonth() + 1).padStart(2, '0'))
      setSelectedYear(String(now.getFullYear()))
      
      // Se há um cartão pré-selecionado, definir
      if (initialCardId) {
        setSelectedCard(initialCardId)
      }
    }
  }, [open, user, initialCardId])

  useEffect(() => {
    if (selectedCard && selectedMonth && selectedYear) {
      calcularFatura()
    }
  }, [selectedCard, selectedMonth, selectedYear])

  async function fetchCartoes() {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user?.id)
      .order('name')

    if (error) {
      console.error('Erro ao buscar cartões:', error)
      return
    }

    // Filtro: só tipos cartão/crédito/débito (mesma lógica da página Cartões)
    const normaliza = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const cartoesFiltrados = (data || []).filter(acc => {
      if (!acc.type) return false
      const tipo = normaliza(acc.type)
      return tipo.includes('cartao') || tipo.includes('cartão') || tipo.includes('credito') || tipo.includes('debito') || tipo.includes('débito')
    })

    setCartoes(cartoesFiltrados)
  }

  function calcularDatasFatura(cartao: Cartao, mes: string, ano: string): { fechamento: Date; vencimento: Date; inicioPeriodo: Date; fimPeriodo: Date } {
    const mesNum = parseInt(mes)
    const anoNum = parseInt(ano)
    const diaFechamento = parseInt(cartao.dia_fechamento || '1')
    const diaVencimento = parseInt(cartao.dia_vencimento || '10')

    // Data de fechamento do mês selecionado
    const dataFechamento = new Date(anoNum, mesNum - 1, diaFechamento)
    
    // Se vencimento é menor que fechamento, vencimento é no mês seguinte
    const dataVencimento = diaVencimento <= diaFechamento
      ? new Date(anoNum, mesNum, diaVencimento) // Mês seguinte
      : new Date(anoNum, mesNum - 1, diaVencimento) // Mesmo mês

    // Período da fatura: do fechamento anterior até o fechamento atual
    const dataFechamentoAnterior = new Date(anoNum, mesNum - 2, diaFechamento)
    
    return {
      fechamento: dataFechamento,
      vencimento: dataVencimento,
      inicioPeriodo: dataFechamentoAnterior,
      fimPeriodo: dataFechamento
    }
  }

  async function calcularFatura() {
    if (!selectedCard || !selectedMonth || !selectedYear) return

    setLoading(true)
    const cartao = cartoes.find(c => c.id === selectedCard)
    if (!cartao) {
      setLoading(false)
      return
    }

    const { fechamento, vencimento, inicioPeriodo, fimPeriodo } = calcularDatasFatura(
      cartao,
      selectedMonth,
      selectedYear
    )

    // Buscar transações do período
    const { data: transacoes, error } = await supabase
      .from('transacoes')
      .select(`
        *,
        categorias(id, nome)
      `)
      .eq('conta_id', selectedCard)
      .gte('data', inicioPeriodo.toISOString())
      .lte('data', fimPeriodo.toISOString())
      .order('data', { ascending: false })

    if (error) {
      console.error('Erro ao buscar transações:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as transações',
        variant: 'destructive'
      })
      setLoading(false)
      return
    }

    // Calcular total (apenas despesas)
    const total = (transacoes || [])
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + (t.valor || 0), 0)

    const agora = new Date()
    const vencida = vencimento < agora

    setFatura({
      mes: selectedMonth,
      ano: selectedYear,
      dataFechamento: fechamento,
      dataVencimento: vencimento,
      transacoes: transacoes || [],
      total,
      paga: false, // TODO: implementar controle de pagamento
      vencida
    })

    setLoading(false)
  }

  async function marcarComoPaga() {
    if (!fatura || !selectedCard) return

    try {
      const cartao = cartoes.find(c => c.id === selectedCard)
      
      // Marcar todas as transações da fatura como pagas
      const transactionIds = fatura.transacoes.map(t => t.id)
      const { error: updateError } = await supabase
        .from('transacoes')
        .update({ status: 'pago' })
        .in('id', transactionIds)

      if (updateError) throw updateError

      // Se houver conta vinculada, criar débito automático
      if (cartao?.linked_account_id) {
        const { error: debitoError } = await supabase
          .from('transacoes')
          .insert({
            userid: user?.id,
            quando: new Date().toISOString(),
            estabelecimento: `Pagamento Fatura ${cartao.name} - ${fatura.mes}/${fatura.ano}`,
            valor: fatura.total,
            tipo: 'despesa',
            metodo: 'debito',
            account_id: cartao.linked_account_id,
            status: 'pago',
            created_at: new Date().toISOString()
          })

        if (debitoError) throw debitoError

        toast({
          title: 'Fatura paga! ✅',
          description: `${formatCurrency(fatura.total)} debitado da conta vinculada`,
        })
      } else {
        toast({
          title: 'Fatura marcada como paga! ✅',
          description: 'As transações foram atualizadas',
        })
      }

      calcularFatura() // Recarrega a fatura
    } catch (error: any) {
      console.error('Erro ao pagar fatura:', error)
      toast({
        title: 'Erro ao pagar fatura',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const cartaoSelecionado = cartoes.find(c => c.id === selectedCard)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gerenciar Faturas dos Cartões
          </DialogTitle>
          <div className="flex items-center justify-between gap-2">
            <DialogDescription>
              Visualize e pague as faturas do seu cartão de crédito
            </DialogDescription>
            <div className="flex gap-2 flex-shrink-0">
              {selectedCard && onImportClick && (
                <Button
                  onClick={() => onImportClick(selectedCard)}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Fatura
                </Button>
              )}
              {fatura && fatura.transacoes.length > 0 && (
                <Button 
                  onClick={marcarComoPaga} 
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Pagar Fatura
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seleção de Cartão e Período */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Cartão de crédito *</Label>
              <Select value={selectedCard} onValueChange={setSelectedCard}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cartoes.map(cartao => (
                    <SelectItem key={cartao.id} value={cartao.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cartao.cor || '#3b82f6' }}
                        />
                        {cartao.name} - {cartao.banco || 'Sem banco'}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Mês *</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map(mes => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Ano *</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map(ano => (
                    <SelectItem key={ano.value} value={ano.value}>
                      {ano.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Informações do Cartão Selecionado */}
          {cartaoSelecionado && (
            <Card className="border-l-4" style={{ borderLeftColor: cartaoSelecionado.cor || '#3b82f6' }}>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Banco</p>
                    <p className="font-semibold">{cartaoSelecionado.banco || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Limite</p>
                    <p className="font-semibold">{formatCurrency(cartaoSelecionado.limite || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Fechamento</p>
                    <p className="font-semibold">Dia {cartaoSelecionado.dia_fechamento || '1'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Vencimento</p>
                    <p className="font-semibold">Dia {cartaoSelecionado.dia_vencimento || '10'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumo da Fatura */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Calculando fatura...</p>
            </div>
          ) : fatura ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Fechamento</p>
                    </div>
                    <p className="text-lg font-bold">
                      {format(fatura.dataFechamento, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Vencimento</p>
                    </div>
                    <p className={`text-lg font-bold ${fatura.vencida ? 'text-red-500' : 'text-foreground'}`}>
                      {format(fatura.dataVencimento, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    {fatura.vencida && (
                      <Badge variant="destructive" className="mt-1">Vencida</Badge>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <p className="text-2xl font-bold text-red-500">
                      {formatCurrency(fatura.total)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de Transações */}
              <div>
                <h3 className="font-semibold mb-3">
                  Transações ({fatura.transacoes.length})
                </h3>
                {fatura.transacoes.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Nenhuma transação neste período</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {fatura.transacoes.map((transacao) => (
                      <Card key={transacao.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{transacao.estabelecimento || 'Sem descrição'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {format(parseISO(transacao.quando), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                                {(transacao.categorias?.nome || transacao.categoria) && (
                                  <Badge variant="secondary" className="text-xs">
                                    {transacao.categorias?.nome || transacao.categoria}
                                  </Badge>
                                )}
                                {transacao.total_parcelas && transacao.total_parcelas > 1 && (
                                  <Badge variant="outline" className="text-xs">
                                    {transacao.parcela_atual}/{transacao.total_parcelas}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className={`font-bold ${transacao.tipo === 'despesa' ? 'text-red-500' : 'text-green-500'}`}>
                              {transacao.tipo === 'despesa' ? '-' : '+'}{formatCurrency(transacao.valor)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Selecione um cartão e período para visualizar a fatura
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
