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
import { Calendar, CreditCard, DollarSign, Clock, CheckCircle2, AlertCircle, Upload, Tags, ChevronDown, ChevronUp, Pencil, Trash2, Square, CheckSquare, X, Check } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { addMonths, format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { categorizar, REGRAS_PADRAO } from '@/utils/categorizacao'
import { Input } from '@/components/ui/input'

interface Cartao {
  id: string
  nome: string
  banco?: string
  limite?: number
  dia_fechamento?: string | number
  dia_vencimento?: string | number
  cor?: string
  tipo?: string
  linked_account_id?: string | null
  saldo_inicial?: number
  user_id?: string
}

interface Transacao {
  id: number
  data?: string
  quando?: string
  estabelecimento?: string
  descricao?: string
  valor: number
  tipo: string
  categoria?: string
  categorias?: { id: string; nome: string }
  conta_id?: string
  cartao_id?: string
  parcela_atual?: number
  total_parcelas?: number
  fatura_mes?: number
  fatura_ano?: number
  observacao?: string
}

interface Fatura {
  mes: string
  ano: string
  dataFechamento: Date
  dataVencimento: Date
  transacoes: Transacao[]
  total: number
  totalParceladas: number
  qtdParceladas: number
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
  const [regrasTexto, setRegrasTexto] = useState(REGRAS_PADRAO)
  const [showRegras, setShowRegras] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ descricao: '', valor: '', data: '', categoria_id: '' })
  const [deleting, setDeleting] = useState(false)
  const [categorias, setCategorias] = useState<{id: string, nome: string, tipo?: string}[]>([])
  const [filtroParceladas, setFiltroParceladas] = useState(false)

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
  const anos = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - 2 + i),
    label: String(currentYear - 2 + i),
  }))

  useEffect(() => {
    if (open && user) {
      fetchCartoes()
      fetchCategorias()
      
      // Carregar regras salvas
      const saved = localStorage.getItem('regrasFatura')
      if (saved) setRegrasTexto(saved)
      
      // Se há um cartão pré-selecionado, definir
      if (initialCardId) {
        setSelectedCard(initialCardId)
      }
    }
  }, [open, user, initialCardId])

  // Quando o cartão é selecionado, buscar o mês mais recente com transações
  useEffect(() => {
    if (selectedCard && user) {
      buscarMesMaisRecente(selectedCard)
    }
  }, [selectedCard])

  useEffect(() => {
    if (selectedCard && selectedMonth && selectedYear) {
      calcularFatura()
    }
  }, [selectedCard, selectedMonth, selectedYear])

  async function buscarMesMaisRecente(cartaoId: string) {
    // Buscar fatura_mes/fatura_ano mais recente com transações
    const { data } = await supabase
      .from('transacoes')
      .select('fatura_mes, fatura_ano')
      .eq('cartao_id', cartaoId)
      .not('fatura_mes', 'is', null)
      .not('fatura_ano', 'is', null)
      .order('fatura_ano', { ascending: false })
      .order('fatura_mes', { ascending: false })
      .limit(1)

    if (data && data.length > 0 && data[0].fatura_mes && data[0].fatura_ano) {
      setSelectedMonth(String(data[0].fatura_mes).padStart(2, '0'))
      setSelectedYear(String(data[0].fatura_ano))
    } else {
      // Fallback: mês atual
      const now = new Date()
      setSelectedMonth(String(now.getMonth() + 1).padStart(2, '0'))
      setSelectedYear(String(now.getFullYear()))
    }
  }

  async function fetchCartoes() {
    if (!user?.id) {
      console.log('⚠️ User não carregado ainda em GerenciarFaturasModal')
      return
    }
    
    const { data, error } = await supabase
      .from('cartoes')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Erro ao buscar cartões:', error)
      return
    }

    console.log('📋 Cartões carregados:', data)
    setCartoes(data || [])
    
    // Auto-selecionar primeiro cartão se nenhum selecionado
    if (!selectedCard && data && data.length > 0 && !initialCardId) {
      setSelectedCard(data[0].id)
    }
  }

  async function fetchCategorias() {
    if (!user?.id) return
    const { data } = await supabase
      .from('categorias')
      .select('id, nome, tipo')
      .eq('user_id', user.id)
      .order('nome')
    setCategorias(data || [])
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

    const mesNum = parseInt(selectedMonth)
    const anoNum = parseInt(selectedYear)

    // Buscar transações por fatura_mes/fatura_ano (prioridade)
    // OU por período de data (fallback para transações antigas sem fatura_mes/fatura_ano)
    const { data: transacoesFatura, error: errorFatura } = await supabase
      .from('transacoes')
      .select(`
        *,
        categorias(id, nome)
      `)
      .eq('cartao_id', selectedCard)
      .eq('fatura_mes', mesNum)
      .eq('fatura_ano', anoNum)
      .order('data', { ascending: false })

    // Fallback: buscar por data para transações que não têm fatura_mes/fatura_ano
    const { data: transacoesPeriodo, error: errorPeriodo } = await supabase
      .from('transacoes')
      .select(`
        *,
        categorias(id, nome)
      `)
      .eq('cartao_id', selectedCard)
      .is('fatura_mes', null)
      .gte('data', inicioPeriodo.toISOString())
      .lte('data', fimPeriodo.toISOString())
      .order('data', { ascending: false })

    const error = errorFatura || errorPeriodo
    // Combinar e deduplicar
    const allTransacoes = [...(transacoesFatura || []), ...(transacoesPeriodo || [])]
    const seen = new Set<number>()
    const transacoes = allTransacoes.filter(t => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })

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

    // Calcular total da fatura
    // Despesas contam positivo, estornos (receita com valor pequeno) subtraem
    // Pagamentos de fatura anterior (PAGAMENTO EFETUADO) NÃO entram no cálculo
    const isPagamentoFatura = (t: any) => {
      const desc = (t.descricao || t.estabelecimento || '').toUpperCase()
      return t.tipo === 'receita' && (desc.includes('PAGAMENTO') || desc.includes('PAG FATURA') || desc.includes('PGTO'))
    }
    const total = (transacoes || [])
      .reduce((acc, t) => {
        if (isPagamentoFatura(t)) return acc // Não conta no total
        if (t.tipo === 'receita') return acc - (t.valor || 0) // Estornos subtraem
        return acc + (t.valor || 0) // Despesas somam
      }, 0)

    // Calcular total de compras parceladas nesta fatura
    // Detecta parcelas pelo campo total_parcelas OU pelo padrão XX/XX na descrição
    const extrairParcela = (t: any): { atual: number; total: number } | null => {
      if (t.total_parcelas && t.total_parcelas > 1) {
        return { atual: t.parcela_atual || 1, total: t.total_parcelas }
      }
      const desc = t.descricao || t.estabelecimento || ''
      const match = desc.match(/(\d{2})\/(\d{2})\s*$/)
      if (match) {
        const atual = parseInt(match[1])
        const total = parseInt(match[2])
        if (total > 1 && atual >= 1 && atual <= total) {
          return { atual, total }
        }
      }
      return null
    }
    const transacoesParceladas = (transacoes || []).filter(t => 
      t.tipo === 'despesa' && extrairParcela(t) !== null
    )
    const totalParceladas = transacoesParceladas.reduce((acc, t) => acc + (t.valor || 0), 0)

    const agora = new Date()
    const vencida = vencimento < agora

    setFatura({
      mes: selectedMonth,
      ano: selectedYear,
      dataFechamento: fechamento,
      dataVencimento: vencimento,
      transacoes: transacoes || [],
      total,
      totalParceladas,
      qtdParceladas: transacoesParceladas.length,
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
            user_id: user?.id,
            data: new Date().toISOString(),
            descricao: `Pagamento Fatura ${cartao.nome} - ${fatura.mes}/${fatura.ano}`,
            valor: fatura.total,
            tipo: 'despesa',
            conta_id: cartao.linked_account_id,
            pago: true,
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

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (!fatura) return
    if (selectedIds.size === fatura.transacoes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(fatura.transacoes.map(t => t.id)))
    }
  }

  function startEdit(transacao: Transacao) {
    setEditingId(transacao.id)
    setEditForm({
      descricao: transacao.descricao || transacao.estabelecimento || '',
      valor: String(transacao.valor || 0),
      data: transacao.data || transacao.quando || '',
      categoria_id: transacao.categorias?.id || '',
    })
  }

  async function saveEdit() {
    if (editingId === null) return
    try {
      const { error } = await supabase
        .from('transacoes')
        .update({
          descricao: editForm.descricao,
          valor: parseFloat(editForm.valor) || 0,
          data: editForm.data,
          categoria_id: editForm.categoria_id && editForm.categoria_id !== 'none' ? editForm.categoria_id : null,
        })
        .eq('id', editingId)

      if (error) throw error

      toast({ title: 'Transação atualizada ✅' })
      setEditingId(null)
      calcularFatura()
    } catch (err: any) {
      toast({ title: 'Erro ao editar', description: err.message, variant: 'destructive' })
    }
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Excluir ${selectedIds.size} transação(ões)?`)) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .in('id', Array.from(selectedIds))

      if (error) throw error

      toast({ title: `${selectedIds.size} transação(ões) excluída(s) ✅` })
      setSelectedIds(new Set())
      calcularFatura()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  async function changeCategoriaSelected(categoriaId: string) {
    if (selectedIds.size === 0) return
    try {
      const { error } = await supabase
        .from('transacoes')
        .update({
          categoria_id: categoriaId === 'none' ? null : categoriaId,
        })
        .in('id', Array.from(selectedIds))

      if (error) throw error

      const catNome = categoriaId === 'none' 
        ? 'Sem categoria' 
        : categorias.find(c => c.id === categoriaId)?.nome || 'categoria'
      toast({ title: `Categoria "${catNome}" aplicada a ${selectedIds.size} transação(ões) ✅` })
      setSelectedIds(new Set())
      calcularFatura()
    } catch (err: any) {
      toast({ title: 'Erro ao alterar categoria', description: err.message, variant: 'destructive' })
    }
  }

  async function deleteSingle(id: number) {
    if (!window.confirm('Excluir esta transação?')) return
    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({ title: 'Transação excluída ✅' })
      calcularFatura()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

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
                        {cartao.nome} - {cartao.banco || 'Sem banco'}
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Fechamento</p>
                    </div>
                    <p className="text-base font-bold">
                      {format(fatura.dataFechamento, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Vencimento</p>
                    </div>
                    <p className={`text-base font-bold ${fatura.vencida ? 'text-red-500' : 'text-foreground'}`}>
                      {format(fatura.dataVencimento, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    {fatura.vencida && (
                      <Badge variant="destructive" className="mt-1 text-[10px]">Vencida</Badge>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-red-500/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className="h-3.5 w-3.5 text-red-500" />
                      <p className="text-xs text-muted-foreground">Saldo em Aberto</p>
                    </div>
                    <p className="text-xl font-bold text-red-500">
                      {formatCurrency(fatura.total)}
                    </p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all hover:border-amber-500/50 ${filtroParceladas ? 'border-amber-500 bg-amber-500/5' : ''}`}
                  onClick={() => setFiltroParceladas(!filtroParceladas)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CreditCard className="h-3.5 w-3.5 text-amber-500" />
                      <p className="text-xs text-muted-foreground">Parceladas</p>
                      {filtroParceladas && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/40 text-amber-400 ml-auto">Filtro ativo</Badge>
                      )}
                    </div>
                    <p className="text-base font-bold text-amber-500">
                      {formatCurrency(fatura.totalParceladas)}
                    </p>
                    {fatura.qtdParceladas > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {fatura.qtdParceladas} compra{fatura.qtdParceladas > 1 ? 's' : ''} parcelada{fatura.qtdParceladas > 1 ? 's' : ''}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CreditCard className="h-3.5 w-3.5 text-green-500" />
                      <p className="text-xs text-muted-foreground">Limite Disponível</p>
                    </div>
                    <p className="text-base font-bold text-green-500">
                      {formatCurrency(Math.max(0, (cartaoSelecionado?.limite || 0) - fatura.total))}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de Transações */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      Transações ({fatura.transacoes.length})
                    </h3>
                    <Button
                      variant={filtroParceladas ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFiltroParceladas(!filtroParceladas)}
                      className={`gap-1.5 text-xs h-7 px-2.5 ${
                        filtroParceladas ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-amber-500 border-amber-500/40 hover:bg-amber-500/10'
                      }`}
                    >
                      <CreditCard className="h-3 w-3" />
                      Parceladas
                      {filtroParceladas && fatura.qtdParceladas > 0 && (
                        <span className="bg-white/20 rounded-full px-1.5 text-[10px]">{fatura.qtdParceladas}</span>
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRegras(!showRegras)}
                    className="gap-1.5 text-xs"
                  >
                    <Tags className="h-3.5 w-3.5" />
                    Regras de Categorização
                    {showRegras ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </div>

                {showRegras && (
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-2">
                        Defina regras no formato: <code className="bg-muted px-1 rounded">termo = Categoria</code> (uma por linha)
                      </p>
                      <textarea
                        className="w-full px-3 py-2 rounded-lg bg-background border text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition"
                        style={{ minHeight: 120, maxHeight: 200, overflow: 'auto' }}
                        value={regrasTexto}
                        onChange={e => {
                          setRegrasTexto(e.target.value)
                          localStorage.setItem('regrasFatura', e.target.value)
                        }}
                        placeholder="burger king = Alimentação&#10;netflix = Assinaturas&#10;uber = Transporte"
                      />
                    </CardContent>
                  </Card>
                )}

                {fatura.transacoes.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Nenhuma transação neste período</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Barra de ações em lote */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleSelectAll}
                          className="gap-1.5 text-xs h-8 px-2"
                        >
                          {selectedIds.size === fatura.transacoes.length && fatura.transacoes.length > 0
                            ? <CheckSquare className="h-4 w-4 text-blue-500" />
                            : <Square className="h-4 w-4" />
                          }
                          {selectedIds.size > 0 ? `${selectedIds.size} selecionada(s)` : 'Selecionar tudo'}
                        </Button>
                      </div>
                      {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2">
                          <Select onValueChange={changeCategoriaSelected}>
                            <SelectTrigger className="h-8 text-xs w-[180px] gap-1">
                              <Tags className="h-3.5 w-3.5" />
                              <SelectValue placeholder="Alterar categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem categoria</SelectItem>
                              {categorias.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <span className="flex items-center gap-2">
                                    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                                      cat.tipo === 'receita' ? 'bg-green-500' : cat.tipo === 'despesa' ? 'bg-red-500' : 'bg-gray-400'
                                    }`} />
                                    {cat.nome}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={deleteSelected}
                            disabled={deleting}
                            className="gap-1.5 text-xs h-8"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir ({selectedIds.size})
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {fatura.transacoes
                        .filter(transacao => {
                          if (!filtroParceladas) return true
                          // Filtrar só parceladas
                          if (transacao.total_parcelas && transacao.total_parcelas > 1) return true
                          const desc = transacao.descricao || transacao.estabelecimento || ''
                          const match = desc.match(/(\d{2})\/(\d{2})\s*$/)
                          if (match) {
                            const atual = parseInt(match[1])
                            const total = parseInt(match[2])
                            if (total > 1 && atual >= 1 && atual <= total) return true
                          }
                          return false
                        })
                        .map((transacao) => {
                        const categoriaRegra = categorizar(transacao.descricao || transacao.estabelecimento || '', regrasTexto)
                        const categoriaFinal = transacao.categorias?.nome || categoriaRegra || transacao.categoria
                        const isSelected = selectedIds.has(transacao.id)
                        const isEditing = editingId === transacao.id

                        return (
                          <Card key={transacao.id} className={`transition-colors ${isSelected ? 'border-blue-500 bg-blue-500/5' : ''}`}>
                            <CardContent className="p-3">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <Input
                                      value={editForm.descricao}
                                      onChange={e => setEditForm(f => ({ ...f, descricao: e.target.value }))}
                                      placeholder="Descrição"
                                      className="flex-1 h-8 text-sm"
                                    />
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editForm.valor}
                                      onChange={e => setEditForm(f => ({ ...f, valor: e.target.value }))}
                                      placeholder="Valor"
                                      className="w-28 h-8 text-sm"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="date"
                                      value={editForm.data?.split('T')[0] || ''}
                                      onChange={e => setEditForm(f => ({ ...f, data: e.target.value }))}
                                      className="w-36 h-8 text-sm"
                                    />
                                    <Select
                                      value={editForm.categoria_id}
                                      onValueChange={v => setEditForm(f => ({ ...f, categoria_id: v }))}
                                    >
                                      <SelectTrigger className="flex-1 h-8 text-sm">
                                        <SelectValue placeholder="Categoria" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Sem categoria</SelectItem>
                                        {categorias.map(cat => (
                                          <SelectItem key={cat.id} value={cat.id}>
                                            <span className="flex items-center gap-2">
                                              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                                                cat.tipo === 'receita' ? 'bg-green-500' : cat.tipo === 'despesa' ? 'bg-red-500' : 'bg-gray-400'
                                              }`} />
                                              {cat.nome}
                                              <span className={`text-[10px] ${
                                                cat.tipo === 'receita' ? 'text-green-400' : cat.tipo === 'despesa' ? 'text-red-400' : 'text-gray-400'
                                              }`}>
                                                {cat.tipo === 'receita' ? 'R' : cat.tipo === 'despesa' ? 'D' : '?'}
                                              </span>
                                            </span>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 p-0 flex-shrink-0">
                                      <X className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" onClick={saveEdit} className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 flex-shrink-0">
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {/* Checkbox */}
                                  <button
                                    onClick={() => toggleSelect(transacao.id)}
                                    className="flex-shrink-0 p-0.5 rounded hover:bg-muted transition"
                                  >
                                    {isSelected
                                      ? <CheckSquare className="h-4 w-4 text-blue-500" />
                                      : <Square className="h-4 w-4 text-muted-foreground" />
                                    }
                                  </button>

                                  {/* Conteúdo */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-medium text-sm truncate">{transacao.descricao || transacao.estabelecimento || 'Sem descrição'}</p>
                                      <Badge 
                                        variant="outline" 
                                        className={`text-[10px] px-1 py-0 flex-shrink-0 ${
                                          transacao.tipo === 'despesa' 
                                            ? 'border-red-500/40 text-red-400' 
                                            : 'border-green-500/40 text-green-400'
                                        }`}
                                      >
                                        {transacao.tipo === 'despesa' ? 'D' : 'C'}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="text-xs text-muted-foreground">
                                        {format(parseISO(transacao.data || transacao.quando), "dd/MM/yyyy", { locale: ptBR })}
                                      </p>
                                      {categoriaFinal ? (
                                        <Badge 
                                          variant="secondary" 
                                          className="text-xs cursor-pointer hover:bg-primary/20 transition"
                                          onClick={(e) => { e.stopPropagation(); startEdit(transacao); }}
                                          title="Clique para editar categoria"
                                        >
                                          {categoriaFinal}
                                        </Badge>
                                      ) : (
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs cursor-pointer opacity-50 hover:opacity-100 transition"
                                          onClick={(e) => { e.stopPropagation(); startEdit(transacao); }}
                                          title="Clique para adicionar categoria"
                                        >
                                          + Categoria
                                        </Badge>
                                      )}
                                      {(() => {
                                        // Detectar parcela pelo campo ou pela descrição
                                        if (transacao.total_parcelas && transacao.total_parcelas > 1) {
                                          return (
                                            <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/40">
                                              {transacao.parcela_atual}/{transacao.total_parcelas}
                                            </Badge>
                                          )
                                        }
                                        const desc = transacao.descricao || transacao.estabelecimento || ''
                                        const match = desc.match(/(\d{2})\/(\d{2})\s*$/)
                                        if (match) {
                                          const atual = parseInt(match[1])
                                          const total = parseInt(match[2])
                                          if (total > 1 && atual >= 1 && atual <= total) {
                                            return (
                                              <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/40">
                                                {atual}/{total}
                                              </Badge>
                                            )
                                          }
                                        }
                                        return null
                                      })()}
                                    </div>
                                  </div>

                                  {/* Valor */}
                                  <p className={`font-bold text-sm flex-shrink-0 ${transacao.tipo === 'despesa' ? 'text-red-500' : 'text-green-500'}`}>
                                    {transacao.tipo === 'despesa' ? '-' : '+'}{formatCurrency(transacao.valor)}
                                  </p>

                                  {/* Botões de ação */}
                                  <div className="flex gap-1 flex-shrink-0 ml-1">
                                    <button
                                      onClick={() => startEdit(transacao)}
                                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-blue-500 transition"
                                      title="Editar"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => deleteSingle(transacao.id)}
                                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-red-500 transition"
                                      title="Excluir"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </>
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
