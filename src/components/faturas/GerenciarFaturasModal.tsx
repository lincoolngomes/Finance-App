import { useState, useEffect, useRef } from 'react'
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

interface Conta {
  id: string
  nome?: string | null
  banco?: string | null
}

interface Transacao {
  id: number | string
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
  totalEmAberto: number
  totalParceladas: number
  qtdParceladas: number
  paga: boolean
  vencida: boolean
}

export function GerenciarFaturasModal({ 
  open, 
  onClose, 
  initialCardId,
  onImportClick,
  initialMonth,
  initialYear
}: { 
  open: boolean
  onClose: () => void
  initialCardId?: string | null
  onImportClick?: (cardId: string) => void
  initialMonth?: string
  initialYear?: string
}) {
  const DRAFT_KEY = 'gerenciar-faturas-modal:draft:v1'
  const { user } = useAuth()
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [selectedCard, setSelectedCard] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [fatura, setFatura] = useState<Fatura | null>(null)
  const [loading, setLoading] = useState(false)
  const [regrasTexto, setRegrasTexto] = useState(REGRAS_PADRAO)
  const [showRegras, setShowRegras] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ descricao: '', valor: '', data: '', categoria_id: '' })
  const [deleting, setDeleting] = useState(false)
  const [categorias, setCategorias] = useState<{id: string, nome: string, tipo?: string}[]>([])
  const [filtroParceladas, setFiltroParceladas] = useState(false)
  const [showPagarDialog, setShowPagarDialog] = useState(false)
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [contaPagamentoId, setContaPagamentoId] = useState<string>('')

  // Flag para forçar cálculo da fatura após setar estados
  const shouldForceCalcularFatura = useRef(false)

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

  function getDefaultFaturaVencimento(cartao: Cartao, referencia = new Date()) {
    const diaFechamento = Math.max(1, Number(cartao?.dia_fechamento || 1))
    const diaVencimento = Math.max(1, Number(cartao?.dia_vencimento || 1))

    for (let offset = 0; offset <= 24; offset++) {
      const dueDate = new Date(referencia.getFullYear(), referencia.getMonth() + offset, diaVencimento)
      const fechamentoDate = diaFechamento >= diaVencimento
        ? new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, diaFechamento)
        : new Date(dueDate.getFullYear(), dueDate.getMonth(), diaFechamento)

      const hoje = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate())
      const fechamentoSemHora = new Date(fechamentoDate.getFullYear(), fechamentoDate.getMonth(), fechamentoDate.getDate())

      if (hoje <= fechamentoSemHora) {
        return {
          mes: String(dueDate.getMonth() + 1).padStart(2, '0'),
          ano: String(dueDate.getFullYear()),
        }
      }
    }

    return {
      mes: String(referencia.getMonth() + 1).padStart(2, '0'),
      ano: String(referencia.getFullYear()),
    }
  }

  useEffect(() => {
    if (open && user) {
      fetchCartoes()
      fetchContas()
      fetchCategorias()
      // Carregar regras salvas
      const saved = localStorage.getItem('regrasFatura')
      if (saved) setRegrasTexto(saved)

      // Restaurar rascunho para não perder contexto ao navegar
      let draft: any = null
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        draft = raw ? JSON.parse(raw) : null
      } catch {
        draft = null
      }

      // Prioridade: inicial explícito -> rascunho -> estado atual
      if (initialCardId) setSelectedCard(initialCardId)
      else if (draft?.selectedCard) setSelectedCard(draft.selectedCard)

      if (initialMonth) setSelectedMonth(initialMonth)
      else setSelectedMonth('')

      if (initialYear) setSelectedYear(initialYear)
      else setSelectedYear('')

      if (!initialMonth && !initialYear) {
        if (typeof draft?.showRegras === 'boolean') setShowRegras(draft.showRegras)
        if (typeof draft?.filtroParceladas === 'boolean') setFiltroParceladas(draft.filtroParceladas)
      }
      shouldForceCalcularFatura.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, initialCardId, initialMonth, initialYear])

  useEffect(() => {
    if (!open) return
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        selectedCard,
        selectedMonth,
        selectedYear,
        showRegras,
        filtroParceladas,
      })
    )
  }, [open, selectedCard, selectedMonth, selectedYear, showRegras, filtroParceladas])

  // Definir período padrão correto da fatura ao selecionar cartão (quando não vier mês/ano inicial explícito)
  useEffect(() => {
    if (!open || initialMonth || initialYear) return
    if (!selectedCard || !cartoes.length) return
    const cartao = cartoes.find(c => c.id === selectedCard)
    if (!cartao) return

    const ref = getDefaultFaturaVencimento(cartao, new Date())
    setSelectedMonth(ref.mes)
    setSelectedYear(ref.ano)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedCard, cartoes, initialMonth, initialYear])

  useEffect(() => {
    if (!open) return
    if (!selectedCard || !selectedMonth || !selectedYear) return

    // Aguarda cartões carregarem para evitar cálculo com estado parcial na abertura
    if (!cartoes.some(c => c.id === selectedCard)) return

    ;(async () => {
      const ok = await calcularFatura()
      if (ok) shouldForceCalcularFatura.current = false
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedCard, selectedMonth, selectedYear, cartoes])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [selectedCard, selectedMonth, selectedYear, filtroParceladas, open])

  async function fetchCartoes() {
    if (!user?.id) {
      console.log('⚠️ User não carregado ainda em GerenciarFaturasModal')
      return
    }
    
    // Buscar cartões E contas em paralelo para evitar sequential bottleneck
    const [cartResult, accResult] = await Promise.all([
      supabase.from('cartoes').select('*').eq('user_id', user.id),
      supabase.from('accounts').select('id, nome, banco').eq('user_id', user.id)
    ])
    
    const { data, error } = cartResult
    const { data: accounts } = accResult
    
    if (error) {
      console.error('Erro ao buscar cartões:', error)
      return
    }

    // Mapear accounts e enriquecer cartões em uma única passada
    const accMap = new Map((accounts || []).map((a: any) => [a.id, a]))
    const enriched = (data || []).map((c: any) => ({
      ...c,
      banco: c.banco || accMap.get(c.linked_account_id)?.nome || accMap.get(c.linked_account_id)?.banco
    }))

    setCartoes(enriched)
    // Não sobrescreve selectedCard se já foi setado pelo initialCardId
    if (!selectedCard && enriched && enriched.length > 0 && !initialCardId) {
      setSelectedCard(enriched[0].id)
    }

    // Se a abertura veio do dashboard (flag setada), forçar cálculo imediatamente usando os valores disponíveis
    if (shouldForceCalcularFatura.current && enriched.length > 0) {
      const cardToUse = selectedCard || initialCardId || enriched[0]?.id
      const monthToUse = selectedMonth || initialMonth
      const yearToUse = selectedYear || initialYear
      if (cardToUse && monthToUse && yearToUse) {
        try {
          const ok = await calcularFatura(cardToUse, monthToUse, yearToUse)
          if (ok) shouldForceCalcularFatura.current = false
        } catch (e) {
          console.debug('[Faturas] tentativa forçada de calcular fatura falhou', e)
        }
      }
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

  async function fetchContas() {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('accounts')
      .select('id, nome, banco')
      .eq('user_id', user.id)

    if (error) {
      console.error('Erro ao buscar contas vinculadas:', error)
      return
    }

    setContas(data || [])
  }

  function calcularDatasFatura(cartao: Cartao, mes: string, ano: string): { fechamento: Date; vencimento: Date; inicioPeriodo: Date; fimPeriodo: Date } {
    const mesNum = parseInt(mes)
    const anoNum = parseInt(ano)
    const diaFechamento = parseInt(cartao.dia_fechamento || '1')
    const diaVencimento = parseInt(cartao.dia_vencimento || '10')

    // O mês/ano selecionado representa o mês de vencimento da fatura.
    // Ex.: Fatura Mar/2026 com fechamento 25 e vencimento 1 => fecha 25/02/2026 e vence 01/03/2026.
    const dataVencimento = new Date(anoNum, mesNum - 1, diaVencimento)

    // Se o dia de fechamento for maior/igual ao dia de vencimento, o fechamento ocorre no mês anterior ao vencimento.
    // Caso contrário, ocorre no mesmo mês do vencimento.
    const dataFechamento = diaFechamento >= diaVencimento
      ? new Date(anoNum, mesNum - 2, diaFechamento)
      : new Date(anoNum, mesNum - 1, diaFechamento)

    // Período da fatura: do fechamento anterior até o fechamento atual
    const dataFechamentoAnterior = new Date(
      dataFechamento.getFullYear(),
      dataFechamento.getMonth() - 1,
      diaFechamento
    )
    
    return {
      fechamento: dataFechamento,
      vencimento: dataVencimento,
      inicioPeriodo: dataFechamentoAnterior,
      fimPeriodo: dataFechamento
    }
  }

  async function calcularFatura(overrideCardId?: string, overrideMonth?: string, overrideYear?: string) {
    const cardId = overrideCardId || selectedCard
    const month = overrideMonth || selectedMonth
    const year = overrideYear || selectedYear
    if (!cardId || !month || !year) return false

    setLoading(true)
    const cartao = cartoes.find(c => c.id === cardId) || (await (async () => {
      const { data } = await supabase.from('cartoes').select('*').eq('id', cardId).maybeSingle()
      return data
    })())
    if (!cartao) {
      setLoading(false)
      return false
    }

    // DEBUG: logar parâmetros de cálculo
    console.debug('[Faturas] calcularFatura start', { cardId, month, year, selectedCard, selectedMonth, selectedYear })

    const { fechamento, vencimento, inicioPeriodo, fimPeriodo } = calcularDatasFatura(
      cartao,
      month,
      year
    )

    const mesNum = parseInt(month)
    const anoNum = parseInt(year)

    // Buscar transações por fatura_mes/fatura_ano (prioridade)
    // OU por período de data (fallback para transações antigas sem fatura_mes/fatura_ano)
    const { data: transacoesFatura, error: errorFatura } = await supabase
      .from('transacoes')
      .select(`
        *,
        categorias(id, nome)
      `)
      .eq('cartao_id', cardId)
      .eq('fatura_mes', mesNum)
      .eq('fatura_ano', anoNum)
      .order('data', { ascending: false })

    // Prepare intervalo robusto (incluir dia inteiro para evitar issues de timezone)
    const inicioISO = new Date(new Date(inicioPeriodo).setHours(0,0,0,0)).toISOString()
    const fimISO = new Date(new Date(fimPeriodo).setHours(23,59,59,999)).toISOString()

    // Fallback: buscar por data para transações que não têm fatura_mes/fatura_ano
    const { data: transacoesPeriodo, error: errorPeriodo } = await supabase
      .from('transacoes')
      .select(`
        *,
        categorias(id, nome)
      `)
      .eq('cartao_id', cardId)
      .gte('data', inicioISO)
      .lte('data', fimISO)
      .order('data', { ascending: false })

    const error = errorFatura || errorPeriodo
    console.debug('[Faturas] query results', { transacoesFaturaCount: (transacoesFatura||[]).length, transacoesPeriodoCount: (transacoesPeriodo||[]).length, errorFatura, errorPeriodo, inicioISO, fimISO })
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

    // Calcular saldo em aberto (apenas transações NÃO pagas)
    const totalEmAberto = (transacoes || [])
      .reduce((acc, t) => {
        if (isPagamentoFatura(t)) return acc
        if (t.pago) return acc // Transações pagas não contam no saldo em aberto
        if (t.tipo === 'receita') return acc - (t.valor || 0)
        return acc + (t.valor || 0)
      }, 0)

    // Fatura está paga se todas as transações de despesa estão marcadas como pagas
    const transacoesDespesa = (transacoes || []).filter(t => t.tipo === 'despesa')
    const todasPagas = transacoesDespesa.length > 0 && transacoesDespesa.every(t => t.pago === true)

    setFatura({
      mes: selectedMonth,
      ano: selectedYear,
      dataFechamento: fechamento,
      dataVencimento: vencimento,
      transacoes: transacoes || [],
      total,
      totalEmAberto: Math.max(0, totalEmAberto),
      totalParceladas,
      qtdParceladas: transacoesParceladas.length,
      paga: todasPagas,
      vencida
    })
    setLoading(false)
    return true
  }

  async function marcarComoPaga() {
    if (!fatura || !selectedCard) return

    try {
      const cartao = cartoes.find(c => c.id === selectedCard)
      const contaDebitoId = contaPagamentoId || cartao?.linked_account_id || null
      
      // Marcar todas as transações da fatura como pagas
      const transactionIds = fatura.transacoes.map(t => t.id)
      const { error: updateError } = await supabase
        .from('transacoes')
        .update({ pago: true })
        .in('id', transactionIds)

      if (updateError) throw updateError

      // Se houver conta selecionada/vinculada, criar débito automático
      if (contaDebitoId) {
        const { error: debitoError } = await supabase
          .from('transacoes')
          .insert({
            user_id: user?.id,
            data: dataPagamento || new Date().toISOString().split('T')[0],
            descricao: `Pagamento Fatura ${cartao.nome} - ${fatura.mes}/${fatura.ano}`,
            valor: fatura.total,
            tipo: 'despesa',
            conta_id: contaDebitoId,
            pago: true,
          })

        if (debitoError) throw debitoError

        toast({
          title: 'Fatura paga! ✅',
          description: `${formatCurrency(fatura.total)} debitado da conta selecionada`,
        })
      } else {
        toast({
          title: 'Fatura marcada como paga! ✅',
          description: 'As transações foram atualizadas (sem débito em conta)',
        })
      }

      setShowPagarDialog(false)
      setContaPagamentoId('')
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

  async function reverterPagamento() {
    if (!fatura || !selectedCard) return

    try {
      const cartao = cartoes.find(c => c.id === selectedCard)

      // Reverter todas as transações da fatura para não pagas
      const transactionIds = fatura.transacoes.map(t => t.id)
      const { error: updateError } = await supabase
        .from('transacoes')
        .update({ pago: false })
        .in('id', transactionIds)

      if (updateError) throw updateError

      // Excluir a transação de pagamento da fatura (débito na conta vinculada)
      if (cartao) {
        const descricaoPagamento = `Pagamento Fatura ${cartao.nome} - ${fatura.mes}/${fatura.ano}`
        const { error: deleteError } = await supabase
          .from('transacoes')
          .delete()
          .eq('user_id', user?.id)
          .eq('descricao', descricaoPagamento)
          .eq('tipo', 'despesa')
          .eq('pago', true)

        if (deleteError) {
          console.error('Erro ao excluir transação de pagamento:', deleteError)
        }
      }

      toast({
        title: 'Pagamento revertido ↩️',
        description: 'As transações foram marcadas como pendentes e o débito foi removido',
      })

      calcularFatura()
    } catch (error: any) {
      console.error('Erro ao reverter pagamento:', error)
      toast({
        title: 'Erro ao reverter',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const cartaoSelecionado = cartoes.find(c => c.id === selectedCard)
  const contaVinculada = cartaoSelecionado?.linked_account_id
    ? contas.find(c => c.id === cartaoSelecionado.linked_account_id)
    : null
  const nomeBancoVinculado = contaVinculada?.banco || contaVinculada?.nome || null

  const isTransacaoParcelada = (transacao: Transacao) => {
    if (transacao.total_parcelas && transacao.total_parcelas > 1) return true
    const desc = transacao.descricao || transacao.estabelecimento || ''
    const match = desc.match(/(\d{2})\/(\d{2})\s*$/)
    if (match) {
      const atual = parseInt(match[1])
      const total = parseInt(match[2])
      if (total > 1 && atual >= 1 && atual <= total) return true
    }
    return false
  }

  const transacoesExibidas = fatura
    ? fatura.transacoes.filter(transacao => (filtroParceladas ? isTransacaoParcelada(transacao) : true))
    : []

  function toggleSelect(id: number | string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (!transacoesExibidas.length) return
    if (selectedIds.size === transacoesExibidas.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transacoesExibidas.map(t => t.id)))
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
      const ids = Array.from(selectedIds).filter(Boolean)
      let deleted = 0
      const failed: Array<number | string> = []

      const chunkSize = 100
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize)
        const { error } = await supabase
          .from('transacoes')
          .delete()
          .in('id', chunk as any[])

        if (!error) {
          deleted += chunk.length
          continue
        }

        // Fallback robusto: exclui item a item para evitar falha total do lote
        for (const id of chunk) {
          const { error: singleError } = await supabase
            .from('transacoes')
            .delete()
            .eq('id', id)

          if (singleError) failed.push(id)
          else deleted += 1
        }
      }

      if (deleted === 0) {
        throw new Error('Não foi possível excluir as transações selecionadas')
      }

      if (failed.length > 0) {
        toast({
          title: `Exclusão parcial`,
          description: `${deleted} excluída(s) e ${failed.length} com falha.`,
          variant: 'destructive'
        })
      } else {
        toast({ title: `${deleted} transação(ões) excluída(s) ✅` })
      }

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
    <>
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
              {fatura && (
                fatura.paga ? (
                  <Button
                    disabled
                    size="sm"
                    className="font-semibold gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Paga
                  </Button>
                ) : (
                  <Button
                    disabled
                    size="sm"
                    className={`font-semibold gap-1.5 ${
                      fatura.vencida 
                        ? 'bg-red-600 text-white border border-red-500/40' 
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    {fatura.vencida ? 'Vencida' : 'Em Aberto'}
                  </Button>
                )
              )}
              {selectedCard && onImportClick && (
                <Button
                  onClick={() => onImportClick(selectedCard)}
                  variant="outline"
                  className="text-muted-foreground hover:text-foreground"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Fatura
                </Button>
              )}
              {fatura && fatura.transacoes.length > 0 && (
                fatura.paga ? (
                  <Button 
                    onClick={reverterPagamento} 
                    variant="outline"
                    className="text-muted-foreground hover:text-foreground"
                    size="sm"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    Reverter Pagamento
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      const cartaoSelecionado = cartoes.find(c => c.id === selectedCard)
                      setContaPagamentoId(cartaoSelecionado?.linked_account_id || contas[0]?.id || '')
                      setDataPagamento(format(new Date(), 'yyyy-MM-dd'))
                      setShowPagarDialog(true)
                    }} 
                    className="bg-emerald-600 hover:bg-emerald-700"
                    size="sm"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Pagar Fatura
                  </Button>
                )
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
                  {cartoes.map(cartao => {
                    const linked = contas.find(c => c.id === cartao.linked_account_id)
                    const linkedName = linked?.nome || linked?.name || cartao.banco || ''
                    return (
                      <SelectItem key={cartao.id} value={cartao.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cartao.cor || '#3b82f6' }}
                          />
                          <div className="flex items-baseline gap-2">
                            <span>{cartao.nome}</span>
                            {linkedName && (
                              <span className="text-xs text-muted-foreground">• {linkedName}</span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
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
                    {nomeBancoVinculado ? (
                      <p className="font-semibold">{nomeBancoVinculado}</p>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          onClose()
                          window.location.href = '/cartoes'
                        }}
                      >
                        Vincular banco
                      </Button>
                    )}
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

                <Card className={fatura.paga ? 'border-green-500/30' : 'border-red-500/30'}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className={`h-3.5 w-3.5 ${fatura.paga ? 'text-green-500' : 'text-red-500'}`} />
                      <p className="text-xs text-muted-foreground">{fatura.paga ? 'Total da Fatura' : 'Saldo em Aberto'}</p>
                    </div>
                    <p className={`text-xl font-bold ${fatura.paga ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(fatura.paga ? fatura.total : (fatura.totalEmAberto ?? fatura.total))}
                    </p>
                    {fatura.paga && (
                      <Badge className="mt-1 text-[10px] bg-green-500/10 text-green-500 border-green-500/30">✅ Paga</Badge>
                    )}
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all hover:border-border ${filtroParceladas ? 'border-primary/40 bg-primary/5' : ''}`}
                  onClick={() => setFiltroParceladas(!filtroParceladas)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CreditCard className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs text-muted-foreground">Parceladas</p>
                      {filtroParceladas && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary ml-auto">Filtro ativo</Badge>
                      )}
                    </div>
                    <p className="text-base font-bold text-primary">
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
                      {formatCurrency(Math.max(0, (cartaoSelecionado?.limite || 0) - (fatura.totalEmAberto ?? fatura.total)))}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de Transações */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      Transações ({transacoesExibidas.length})
                    </h3>
                    <Button
                      variant={filtroParceladas ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setFiltroParceladas(!filtroParceladas)}
                      className={`gap-1.5 text-xs h-7 px-2.5 ${
                        filtroParceladas ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <CreditCard className="h-3 w-3" />
                      Parceladas
                      {filtroParceladas && fatura.qtdParceladas > 0 && (
                        <span className="bg-foreground/10 rounded-full px-1.5 text-[10px]">{fatura.qtdParceladas}</span>
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
                          {selectedIds.size === transacoesExibidas.length && transacoesExibidas.length > 0
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
                      {transacoesExibidas.map((transacao) => {
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

    {/* Dialog de Confirmação de Pagamento com Data */}
    <Dialog open={showPagarDialog} onOpenChange={setShowPagarDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Pagar Fatura
          </DialogTitle>
          <DialogDescription>
            {fatura && `Valor: ${formatCurrency(fatura.total)}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium mb-2 block">Data do pagamento</Label>
            <Input
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Conta de débito</Label>
            <Select value={contaPagamentoId || '__none__'} onValueChange={(value) => setContaPagamentoId(value === '__none__' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta para débito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Não debitar em conta</SelectItem>
                {contas.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.nome || conta.banco || 'Conta'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              O pagamento da fatura será lançado como despesa na conta escolhida.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowPagarDialog(false)}>
            Cancelar
          </Button>
          <Button 
            className="bg-green-600 hover:bg-green-700" 
            size="sm"
            onClick={marcarComoPaga}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Confirmar Pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
