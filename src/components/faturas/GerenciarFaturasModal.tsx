import { useState, useEffect, useMemo, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '/src/components/ui/dialog'
import { Button } from '/src/components/ui/button'
import { Label } from '/src/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '/src/components/ui/select'
import { Card, CardContent } from '/src/components/ui/card'
import { Badge } from '/src/components/ui/badge'
import { supabase } from '/src/lib/supabase'
import { useAuth } from '/src/hooks/useAuth'
import { formatCurrency } from '/src/utils/currency'
import { Calendar, CreditCard, DollarSign, Clock, CheckCircle2, AlertCircle, Upload, Tags, ChevronDown, ChevronUp, Pencil, Trash2, Square, CheckSquare, X, Check } from 'lucide-react'
import { toast } from '/src/hooks/use-toast'
import { addMonths, format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { categorizar, normalizar, REGRAS_PADRAO } from '/src/utils/categorizacao'
import { Input } from '/src/components/ui/input'
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'

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
  pago?: boolean
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
  qtdComprasParceladas: number
  paga: boolean
  vencida: boolean
}

type DeleteInvoiceMode = 'current' | 'current_and_future'

const CATEGORY_PIE_COLORS = ['#34d399', '#38bdf8', '#f59e0b', '#a78bfa', '#fb7185', '#2dd4bf']

export function GerenciarFaturasModal({ 
  open, 
  onClose, 
  onDataChange,
  initialCardId,
  onImportClick,
  initialMonth,
  initialYear
}: { 
  open: boolean
  onClose: () => void
  onDataChange?: () => void | Promise<void>
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
  const [showDeleteInvoiceDialog, setShowDeleteInvoiceDialog] = useState(false)
  const [deleteInvoiceMode, setDeleteInvoiceMode] = useState<DeleteInvoiceMode>('current')
  const [categoriaEmFoco, setCategoriaEmFoco] = useState<string | null>(null)

  // Flag para forçar cálculo da fatura após setar estados
  const shouldForceCalcularFatura = useRef(false)
  const transactionRowRefs = useRef<Record<string, HTMLDivElement | null>>({})

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
      const saved = localStorage.getItem('regrasImportacaoCategorias') || localStorage.getItem('regrasFatura')
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

  // Recategorizar transações automaticamente quando as regras mudarem (igual ImportarExtrato)
  useEffect(() => {
    if (!fatura || !fatura.transacoes.length) return
    
    const transacoesRecategorizadas = fatura.transacoes.map(t => {
      // Se já tem categoria definida no banco, mantém
      if (t.categorias?.nome) return t
      
      // Aplica regra de categorização
      const categoriaRegra = categorizar(
        t.descricao || t.estabelecimento || '',
        regrasTexto,
        t.tipo === 'receita' ? 'receita' : 'despesa'
      )
      if (categoriaRegra) {
        return { ...t, categoria: categoriaRegra }
      }
      return t
    })
    
    // Só atualiza se houver mudança
    const mudou = transacoesRecategorizadas.some((t, i) => 
      t.categoria !== fatura.transacoes[i].categoria
    )
    
    if (mudou) {
      setFatura(prev => prev ? { ...prev, transacoes: transacoesRecategorizadas } : null)
    }
  }, [regrasTexto])

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
    setFiltroParceladas(false) // Reset filtro ao mudar de fatura
    setCategoriaEmFoco(null)
  }, [selectedCard, selectedMonth, selectedYear, open])

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

  function extrairReferenciaImportada(observacao?: string | null): { mes: number; ano: number } | null {
    const match = String(observacao || '').match(/^\s*Fatura\s+(\d{2})\/(\d{4})\s*$/i)
    if (!match) return null

    const mes = parseInt(match[1], 10)
    const ano = parseInt(match[2], 10)
    if (Number.isNaN(mes) || Number.isNaN(ano)) return null

    return { mes, ano }
  }

  async function notifyDataChange() {
    if (!onDataChange) return

    try {
      await onDataChange()
    } catch (error) {
      console.error('Erro ao atualizar dados do cartão após alteração na fatura:', error)
    }
  }

  async function refreshViews() {
    await Promise.all([calcularFatura(), notifyDataChange()])
  }

  const PARCELA_REGEX = /(?:\(|\b)?(?:parcela\s*)?(\d{1,2})\s*\/\s*(\d{1,2})(?:\))?\s*$/i

  function getDescricaoTransacao(transacao?: Partial<Transacao> | null) {
    return String(transacao?.descricao || transacao?.estabelecimento || '').trim()
  }

  function stripParcelaSuffix(descricao: string) {
    return descricao
      .replace(/\s*\(?parcela\s*\d{1,2}\s*\/\s*\d{1,2}\)?\s*$/i, '')
      .replace(/\s+\d{1,2}\s*\/\s*\d{1,2}\s*$/i, '')
      .trim()
  }

  function getParcelaInfo(transacao?: Partial<Transacao> | null): { atual: number; total: number } | null {
    const atualCampo = Number(transacao?.parcela_atual || 0)
    const totalCampo = Number(transacao?.total_parcelas || 0)

    if (totalCampo > 1 && atualCampo >= 1 && atualCampo <= totalCampo) {
      return { atual: atualCampo, total: totalCampo }
    }

    const match = getDescricaoTransacao(transacao).match(PARCELA_REGEX)
    if (!match) return null

    const atual = parseInt(match[1], 10)
    const total = parseInt(match[2], 10)
    if (Number.isNaN(atual) || Number.isNaN(total) || total <= 1 || atual < 1 || atual > total) {
      return null
    }

    return { atual, total }
  }

  function getTransacaoReference(transacao?: Partial<Transacao> | null): { mes: number; ano: number } | null {
    const mes = Number(transacao?.fatura_mes || 0)
    const ano = Number(transacao?.fatura_ano || 0)
    if (mes >= 1 && mes <= 12 && ano >= 1900) {
      return { mes, ano }
    }

    const referenciaImportada = extrairReferenciaImportada(transacao?.observacao)
    if (referenciaImportada) return referenciaImportada

    const rawDate = String(transacao?.data || transacao?.quando || '').trim()
    if (!rawDate) return null

    const parsed = new Date(rawDate)
    if (Number.isNaN(parsed.getTime())) return null

    return {
      mes: parsed.getUTCMonth() + 1,
      ano: parsed.getUTCFullYear(),
    }
  }

  function addMonthsToReference(reference: { mes: number; ano: number }, offset: number) {
    const next = new Date(Date.UTC(reference.ano, reference.mes - 1 + offset, 1))
    return {
      mes: next.getUTCMonth() + 1,
      ano: next.getUTCFullYear(),
    }
  }

  function compareFaturaReference(
    left?: { mes: number; ano: number } | null,
    right?: { mes: number; ano: number } | null
  ) {
    if (!left || !right) return Number.NaN
    if (left.ano !== right.ano) return left.ano - right.ano
    return left.mes - right.mes
  }

  function getParcelaSerieKey(transacao?: Partial<Transacao> | null) {
    const parcelaInfo = getParcelaInfo(transacao)
    if (!parcelaInfo) return null

    const descricaoBase = stripParcelaSuffix(getDescricaoTransacao(transacao))
    const valorCentavos = Math.round(Math.abs(Number(transacao?.valor || 0)) * 100)

    return [
      String(transacao?.cartao_id || ''),
      normalizar(descricaoBase),
      String(valorCentavos),
      String(parcelaInfo.total),
    ].join('::')
  }

  async function deleteTransactionIds(ids: Array<number | string>) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
    let deleted = 0
    const failed: Array<number | string> = []

    const chunkSize = 100
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize)
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .in('id', chunk as any[])

      if (!error) {
        deleted += chunk.length
        continue
      }

      for (const id of chunk) {
        const { error: singleError } = await supabase
          .from('transacoes')
          .delete()
          .eq('id', id)

        if (singleError) failed.push(id)
        else deleted += 1
      }
    }

    return { deleted, failed }
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
    const referenciaImportada = `Fatura ${month}/${year}`

    // Prioridade 1: importações com referência explícita escolhida pelo usuário.
    const { data: transacoesReferenciaImportada, error: errorReferenciaImportada } = await supabase
      .from('transacoes')
      .select(`
        *,
        categorias(id, nome)
      `)
      .eq('cartao_id', cardId)
      .eq('observacao', referenciaImportada)
      .order('data', { ascending: false })

    // Prioridade 2: transações já gravadas corretamente em fatura_mes/fatura_ano.
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

    // Fallback: buscar por data SOMENTE para transações que NÃO têm fatura_mes/fatura_ano
    // Isso evita trazer transações de outras faturas só pela data
    const { data: transacoesPeriodo, error: errorPeriodo } = await supabase
      .from('transacoes')
      .select(`
        *,
        categorias(id, nome)
      `)
      .eq('cartao_id', cardId)
      .gte('data', inicioISO)
      .lte('data', fimISO)
      .is('fatura_mes', null)
      .order('data', { ascending: false })

    const error = errorReferenciaImportada || errorFatura || errorPeriodo

    // Combinar e deduplicar respeitando a referência explícita da importação.
    const allTransacoes = [
      ...(transacoesReferenciaImportada || []),
      ...(transacoesFatura || []),
      ...(transacoesPeriodo || []),
    ]
    const seen = new Set<string>()
    const transacoes = allTransacoes.filter(t => {
      const id = String(t.id)
      if (seen.has(id)) return false

      const referenciaObservacao = extrairReferenciaImportada(t.observacao)
      const pertenceAFatura = referenciaObservacao
        ? referenciaObservacao.mes === mesNum && referenciaObservacao.ano === anoNum
        : t.fatura_mes != null && t.fatura_ano != null
          ? Number(t.fatura_mes) === mesNum && Number(t.fatura_ano) === anoNum
          : true

      if (!pertenceAFatura) return false

      seen.add(id)
      return true
    }).sort((a, b) => String(b.data || b.quando || '').localeCompare(String(a.data || a.quando || '')))

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

    const transacoesParceladas = (transacoes || []).filter(t => 
      t.tipo === 'despesa' && Boolean(getParcelaInfo(t))
    )
    const comprasParceladas = new Set(
      transacoesParceladas.map(t => getParcelaSerieKey(t) || `tx:${String(t.id)}`)
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
      mes: month,
      ano: year,
      dataFechamento: fechamento,
      dataVencimento: vencimento,
      transacoes: transacoes || [],
      total,
      totalEmAberto: Math.max(0, totalEmAberto),
      totalParceladas,
      qtdParceladas: transacoesParceladas.length,
      qtdComprasParceladas: comprasParceladas.size,
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
      const contaDebitoId = contaPagamentoId || null
      
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
      await refreshViews()
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

      await refreshViews()
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

  function getCategoriaTransacao(transacao?: Partial<Transacao> | null) {
    if (!transacao) return 'Sem categoria'
    if (transacao.categorias?.nome) return transacao.categorias.nome

    const categoriaRegra = categorizar(
      transacao.descricao || transacao.estabelecimento || '',
      regrasTexto,
      transacao.tipo === 'receita' ? 'receita' : 'despesa'
    )

    return categoriaRegra || transacao.categoria || 'Sem categoria'
  }

  function toggleCategoriaFoco(categoria: string) {
    setCategoriaEmFoco(prev => prev === categoria ? null : categoria)
  }

  const isTransacaoParcelada = (transacao: Transacao) => {
    return Boolean(getParcelaInfo(transacao))
  }

  const transacoesExibidas = fatura
    ? fatura.transacoes.filter(transacao => (filtroParceladas ? isTransacaoParcelada(transacao) : true))
    : []
  const despesasPorCategoria = useMemo(() => {
    const categoriasMap = new Map<string, number>()

    transacoesExibidas.forEach((transacao) => {
      if (transacao.tipo !== 'despesa') return

      const categoria = getCategoriaTransacao(transacao)
      categoriasMap.set(categoria, (categoriasMap.get(categoria) || 0) + Math.abs(Number(transacao.valor || 0)))
    })

    const categoriasOrdenadas = Array.from(categoriasMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const total = categoriasOrdenadas.reduce((acc, item) => acc + item.value, 0)

    return categoriasOrdenadas.map((item, index) => ({
      ...item,
      color: CATEGORY_PIE_COLORS[index % CATEGORY_PIE_COLORS.length],
      percentage: total > 0 ? (item.value / total) * 100 : 0,
    }))
  }, [transacoesExibidas, regrasTexto])
  const totalDespesasGrafico = despesasPorCategoria.reduce((acc, item) => acc + item.value, 0)
  const resumoCategoriaEmFoco = useMemo(() => {
    if (!categoriaEmFoco) return null

    const transacoes = transacoesExibidas.filter(
      transacao => transacao.tipo === 'despesa' && getCategoriaTransacao(transacao) === categoriaEmFoco
    )

    return {
      quantidade: transacoes.length,
      total: transacoes.reduce((acc, transacao) => acc + Math.abs(Number(transacao.valor || 0)), 0),
    }
  }, [categoriaEmFoco, transacoesExibidas, regrasTexto])
  const transacoesOrdenadas = categoriaEmFoco
    ? [...transacoesExibidas].sort((a, b) => {
        const aMatch = getCategoriaTransacao(a) === categoriaEmFoco ? 1 : 0
        const bMatch = getCategoriaTransacao(b) === categoriaEmFoco ? 1 : 0
        return bMatch - aMatch
      })
    : transacoesExibidas

  useEffect(() => {
    if (!categoriaEmFoco || typeof window === 'undefined') return

    const primeiraTransacao = transacoesOrdenadas.find(
      transacao => transacao.tipo === 'despesa' && getCategoriaTransacao(transacao) === categoriaEmFoco
    )

    if (!primeiraTransacao?.id) return

    const animationFrame = window.requestAnimationFrame(() => {
      transactionRowRefs.current[String(primeiraTransacao.id)]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [categoriaEmFoco, transacoesOrdenadas, regrasTexto])

  function toggleFiltroParceladas() {
    setSelectedIds(new Set())
    setFiltroParceladas(prev => !prev)
  }

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
      await refreshViews()
    } catch (err: any) {
      toast({ title: 'Erro ao editar', description: err.message, variant: 'destructive' })
    }
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Excluir ${selectedIds.size} transação(ões)?`)) return

    setDeleting(true)
    try {
      const { deleted, failed } = await deleteTransactionIds(Array.from(selectedIds))

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
      await refreshViews()
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

  async function deleteSingle(id: number | string) {
    if (!window.confirm('Excluir esta transação?')) return
    try {
      const { deleted } = await deleteTransactionIds([id])
      if (deleted === 0) throw new Error('Não foi possível excluir esta transação')

      toast({ title: 'Transação excluída ✅' })
      await refreshViews()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  function openDeleteInvoiceOptions() {
    if (!selectedCard || !fatura) {
      toast({ title: 'Selecione uma fatura válida', variant: 'destructive' })
      return
    }

    if (!fatura.transacoes.length) {
      toast({ title: 'Nenhum lançamento encontrado para esta fatura' })
      return
    }

    setDeleteInvoiceMode('current')
    setShowDeleteInvoiceDialog(true)
  }

  async function deleteAllFromCard(mode: DeleteInvoiceMode = deleteInvoiceMode) {
    if (!selectedCard || !fatura) {
      toast({ title: 'Selecione uma fatura válida', variant: 'destructive' })
      return
    }

    const cartao = cartoes.find(c => c.id === selectedCard)
    const cartaoNome = cartao?.nome || 'este cartão'
    const currentIds = fatura.transacoes.map(t => t.id).filter(Boolean)

    if (currentIds.length === 0) {
      toast({ title: 'Nenhum lançamento encontrado para esta fatura' })
      return
    }

    setDeleting(true)
    try {
      const idsToDelete = new Set<number | string>(currentIds)

      if (mode === 'current_and_future') {
        const currentReference = {
          mes: parseInt(fatura.mes, 10),
          ano: parseInt(fatura.ano, 10),
        }

        const seriesToExpand = fatura.transacoes
          .filter((transacao) => transacao.tipo === 'despesa')
          .map((transacao) => {
            const parcelaInfo = getParcelaInfo(transacao)
            const serieKey = getParcelaSerieKey(transacao)
            const reference = getTransacaoReference(transacao) || currentReference

            if (!parcelaInfo || !serieKey || parcelaInfo.atual >= parcelaInfo.total) {
              return null
            }

            return {
              transacaoId: transacao.id,
              serieKey,
              parcelaInfo,
              reference,
            }
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item))

        if (seriesToExpand.length > 0) {
          const { data: allCardTransactions, error: fetchError } = await supabase
            .from('transacoes')
            .select('id, data, descricao, valor, tipo, cartao_id, fatura_mes, fatura_ano, observacao')
            .eq('cartao_id', selectedCard)
            .eq('user_id', user?.id)

          if (fetchError) throw fetchError

          for (const serie of seriesToExpand) {
            for (let offset = 1; offset <= serie.parcelaInfo.total - serie.parcelaInfo.atual; offset += 1) {
              const expectedReference = addMonthsToReference(serie.reference, offset)
              const expectedParcela = serie.parcelaInfo.atual + offset

              const candidate = (allCardTransactions || []).find((transacao) => {
                if (!transacao?.id || idsToDelete.has(transacao.id) || transacao.id === serie.transacaoId) {
                  return false
                }

                if (transacao.tipo !== 'despesa') return false

                const parcelaInfo = getParcelaInfo(transacao)
                if (!parcelaInfo) return false
                if (parcelaInfo.total !== serie.parcelaInfo.total || parcelaInfo.atual !== expectedParcela) {
                  return false
                }

                if (getParcelaSerieKey(transacao) !== serie.serieKey) return false

                const reference = getTransacaoReference(transacao)
                return compareFaturaReference(reference, expectedReference) === 0
              })

              if (candidate?.id) {
                idsToDelete.add(candidate.id)
              }
            }
          }
        }
      }

      const { data: pagamentosRelacionados, error: paymentFetchError } = await supabase
        .from('transacoes')
        .select('id')
        .eq('user_id', user?.id)
        .eq('descricao', `Pagamento Fatura ${cartaoNome} - ${fatura.mes}/${fatura.ano}`)

      if (paymentFetchError) throw paymentFetchError

      for (const pagamento of pagamentosRelacionados || []) {
        if (pagamento?.id) idsToDelete.add(pagamento.id)
      }

      const { deleted, failed } = await deleteTransactionIds(Array.from(idsToDelete))

      if (deleted === 0) {
        throw new Error('Não foi possível excluir os lançamentos desta fatura')
      }

      if (failed.length > 0) {
        toast({
          title: 'Exclusão parcial',
          description: `${deleted} lançamento(s) excluído(s) e ${failed.length} com falha.`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: `${deleted} lançamento(s) excluído(s) ✅`,
          description:
            mode === 'current_and_future'
              ? `A fatura ${fatura.mes}/${fatura.ano} e as parcelas futuras relacionadas foram removidas.`
              : `Os lançamentos da fatura ${fatura.mes}/${fatura.ano} foram removidos.`,
        })
      }

      setShowDeleteInvoiceDialog(false)
      setSelectedIds(new Set())
      await refreshViews()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const hasParceladasFuturasNaFatura = Boolean(
    fatura?.transacoes.some((transacao) => {
      if (transacao.tipo !== 'despesa') return false
      const parcelaInfo = getParcelaInfo(transacao)
      return Boolean(parcelaInfo && parcelaInfo.total > parcelaInfo.atual)
    })
  )

  const mesSelecionadoLabel = meses.find((mes) => mes.value === (fatura?.mes || selectedMonth))?.label
  const periodoSelecionadoLabel = mesSelecionadoLabel && (fatura?.ano || selectedYear)
    ? `${mesSelecionadoLabel} ${fatura?.ano || selectedYear}`
    : null
  const valorPrincipalFatura = fatura
    ? (fatura.paga ? fatura.total : (fatura.totalEmAberto ?? fatura.total))
    : 0
  const limiteDisponivel = Math.max(
    0,
    (cartaoSelecionado?.limite || 0) - (fatura ? (fatura.totalEmAberto ?? fatura.total) : 0)
  )
  const allTransacoesSelecionadas = transacoesExibidas.length > 0 && selectedIds.size === transacoesExibidas.length
  const statusFaturaLabel = fatura ? (fatura.paga ? 'Paga' : fatura.vencida ? 'Vencida' : 'Em aberto') : null
  const statusFaturaClassName = !fatura
    ? ''
    : fatura.paga
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      : fatura.vencida
        ? 'border-red-500/30 bg-red-500/10 text-red-400'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  const descricaoParceladasResumo = !fatura || fatura.qtdParceladas === 0
    ? 'Nenhuma parcela neste período'
    : fatura.qtdComprasParceladas === fatura.qtdParceladas
      ? `${fatura.qtdParceladas} parcela${fatura.qtdParceladas > 1 ? 's' : ''} nesta fatura`
      : `${fatura.qtdParceladas} parcelas de ${fatura.qtdComprasParceladas} compra${fatura.qtdComprasParceladas > 1 ? 's' : ''}`
  const bancoResumo = nomeBancoVinculado || cartaoSelecionado?.banco || 'Não vinculado'
  const contextoSelecionado = cartaoSelecionado
    ? [cartaoSelecionado.nome, periodoSelecionadoLabel, bancoResumo].filter(Boolean).join(' • ')
    : 'Selecione o cartão e o período para visualizar a fatura'
  const labelValorResumo = fatura
    ? (fatura.paga ? 'Total liquidado' : 'Saldo atual da fatura')
    : ''
  const descricaoValorResumo = !fatura
    ? ''
    : fatura.paga
      ? 'Todos os lançamentos foram conciliados e o período foi encerrado.'
      : fatura.vencida
        ? 'A fatura venceu e ainda possui saldo pendente.'
        : 'Use a lista ao lado para ajustar os lançamentos e acompanhar o fechamento.'

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[min(96vw,1220px)] max-h-[94vh] max-w-none gap-0 overflow-hidden border border-slate-800 bg-[#06111f] p-0 text-slate-50 shadow-[0_32px_120px_rgba(2,6,23,0.78)]">
        <div className="flex h-[min(90vh,860px)] min-h-0 flex-col">
          <DialogHeader className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(8,47,73,0.92))] px-5 py-4 pr-12 text-left sm:pr-14">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                    <CreditCard className="h-[18px] w-[18px] text-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-[clamp(1.2rem,1.7vw,1.75rem)] font-semibold tracking-tight text-white">
                      Gerenciar Faturas dos Cartões
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-[13px] text-slate-300/80">
                      {contextoSelecionado}
                    </DialogDescription>
                  </div>
                  {statusFaturaLabel && (
                    <Badge variant="outline" className={`h-9 rounded-full px-3 text-xs ${statusFaturaClassName}`}>
                      {fatura?.paga ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <Clock className="mr-1 h-3.5 w-3.5" />}
                      {statusFaturaLabel}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedCard && onImportClick && (
                  <Button
                    onClick={() => onImportClick(selectedCard)}
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl border-white/10 bg-white/[0.04] px-4 text-slate-100 hover:bg-white/[0.08]"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Fatura
                  </Button>
                )}
                {fatura && fatura.transacoes.length > 0 && (
                  fatura.paga ? (
                    <Button
                      onClick={reverterPagamento}
                      variant="outline"
                      size="sm"
                      className="h-10 rounded-xl border-white/10 bg-white/[0.04] px-4 text-slate-100 hover:bg-white/[0.08]"
                    >
                      <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                      Reverter Pagamento
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setContaPagamentoId('')
                        setDataPagamento(format(new Date(), 'yyyy-MM-dd'))
                        setShowPagarDialog(true)
                      }}
                      size="sm"
                      className="h-10 rounded-xl bg-emerald-500 px-4 text-slate-950 hover:bg-emerald-400"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Pagar Fatura
                    </Button>
                  )
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="border-b border-white/8 bg-[#091827] px-5 py-3">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.45fr)_170px_130px]">
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-slate-200">Cartão de crédito *</Label>
                <Select value={selectedCard} onValueChange={setSelectedCard}>
                  <SelectTrigger className="h-10 rounded-xl border-white/10 bg-slate-950 text-slate-100">
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
                              className="h-3 w-3 rounded-full"
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
                <Label className="mb-1.5 block text-[13px] font-medium text-slate-200">Mês *</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-10 rounded-xl border-white/10 bg-slate-950 text-slate-100">
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
                <Label className="mb-1.5 block text-[13px] font-medium text-slate-200">Ano *</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-10 rounded-xl border-white/10 bg-slate-950 text-slate-100">
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
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-400"></div>
                <p className="mt-3 text-sm text-slate-400">Calculando fatura...</p>
              </div>
            </div>
          ) : fatura ? (
            <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[#081423]">
                <div className="border-b border-white/10 px-4 py-3.5">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[1.35rem] font-semibold tracking-tight text-white">Transações</h3>
                        <Badge variant="outline" className="rounded-full border-white/10 bg-white/[0.04] text-slate-300">
                          {transacoesExibidas.length} itens
                        </Badge>
                        {filtroParceladas && (
                          <Badge variant="outline" className="rounded-full border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                            Somente parceladas
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1.5 text-[13px] text-slate-400">
                        Operação rápida: selecione, categorize, edite ou exclua sem sair desta tela.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 xl:min-w-[370px]">
                      <p className="mb-2 hidden text-[10px] uppercase tracking-[0.22em] text-slate-500 xl:block">
                        Ações rápidas
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleSelectAll}
                          className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-slate-200 hover:bg-white/[0.08] hover:text-white"
                        >
                          {allTransacoesSelecionadas
                            ? <CheckSquare className="h-4 w-4 text-emerald-300" />
                            : <Square className="h-4 w-4" />
                          }
                          {selectedIds.size > 0 ? `${selectedIds.size} selecionada(s)` : 'Selecionar tudo'}
                        </Button>
                        <Button
                          variant={filtroParceladas ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={toggleFiltroParceladas}
                          className={`h-9 rounded-lg px-3 text-xs ${
                            filtroParceladas
                              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15'
                              : 'border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Parceladas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRegras(!showRegras)}
                          className="h-9 rounded-lg border-white/10 bg-white/[0.03] px-3 text-slate-200 hover:bg-white/[0.08] hover:text-white"
                        >
                          <Tags className="h-3.5 w-3.5" />
                          Regras
                          {showRegras ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {selectedIds.size > 0 && (
                    <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-2.5">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <p className="text-sm text-emerald-100">
                          {selectedIds.size} lançamento{selectedIds.size > 1 ? 's' : ''} selecionado{selectedIds.size > 1 ? 's' : ''}.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Select onValueChange={changeCategoriaSelected}>
                            <SelectTrigger className="h-10 w-full rounded-xl border-emerald-300/20 bg-slate-950 text-xs text-slate-100 sm:w-[220px]">
                              <Tags className="h-3.5 w-3.5" />
                              <SelectValue placeholder="Alterar categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem categoria</SelectItem>
                              {categorias.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <span className="flex items-center gap-2">
                                    <span className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
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
                            className="h-10 rounded-xl gap-1.5 text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir ({selectedIds.size})
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {categoriaEmFoco && resumoCategoriaEmFoco && (
                    <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-cyan-100">
                            Foco em {categoriaEmFoco}
                          </p>
                          <p className="text-[12px] text-cyan-100/75">
                            {resumoCategoriaEmFoco.quantidade} transação(ões) • {formatCurrency(resumoCategoriaEmFoco.total)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCategoriaEmFoco(null)}
                          className="h-8 rounded-lg border border-cyan-300/20 bg-slate-950/40 px-3 text-cyan-100 hover:bg-slate-950/70 hover:text-white"
                        >
                          Limpar foco
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {showRegras && (
                  <div className="border-b border-white/10 bg-[#0b1a2d] px-4 py-3.5">
                    <p className="mb-2 text-xs text-slate-400">
                      Formato: <code className="rounded bg-slate-950 px-1 py-0.5 text-slate-200">termo = Categoria</code>
                    </p>
                    <textarea
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-mono text-slate-100 transition focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/20"
                      style={{ minHeight: 96, maxHeight: 160, overflow: 'auto' }}
                      value={regrasTexto}
                      onChange={e => {
                        setRegrasTexto(e.target.value)
                        localStorage.setItem('regrasImportacaoCategorias', e.target.value)
                        localStorage.setItem('regrasFatura', e.target.value)
                      }}
                      placeholder="burger king = Alimentação&#10;netflix = Assinaturas"
                    />
                  </div>
                )}

                {transacoesExibidas.length === 0 ? (
                  <div className="flex min-h-[280px] items-center justify-center px-4 py-10 text-center">
                    <div>
                      <AlertCircle className="mx-auto mb-3 h-8 w-8 text-slate-500" />
                      <p className="text-sm text-slate-400">
                        {filtroParceladas ? 'Nenhuma transação parcelada nesta fatura.' : 'Nenhuma transação neste período.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="px-2.5 py-2.5 sm:px-3.5">
                    <div className="space-y-2">
                      {transacoesOrdenadas.map((transacao) => {
                        const categoriaRegra = categorizar(
                          transacao.descricao || transacao.estabelecimento || '',
                          regrasTexto,
                          transacao.tipo === 'receita' ? 'receita' : 'despesa'
                        )
                        const categoriaFinal = getCategoriaTransacao(transacao)
                        const categoriaVisivel = transacao.categorias?.nome || categoriaRegra || transacao.categoria
                        const isSelected = selectedIds.has(transacao.id)
                        const isEditing = editingId === transacao.id
                        const parcelaInfo = getParcelaInfo(transacao)
                        const isDespesa = transacao.tipo === 'despesa'
                        const isCategoriaFocada = categoriaEmFoco
                          ? categoriaFinal === categoriaEmFoco
                          : false

                        return (
                          <div
                            key={transacao.id}
                            ref={(element) => {
                              transactionRowRefs.current[String(transacao.id)] = element
                            }}
                            className={`rounded-[22px] border transition-all ${
                              categoriaEmFoco
                                ? isCategoriaFocada
                                  ? 'border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.1)]'
                                  : 'border-white/6 bg-slate-950/60 opacity-45'
                                : isSelected
                                ? 'border-emerald-400/30 bg-emerald-400/10'
                                : 'border-white/8 bg-slate-950 hover:border-white/15 hover:bg-[#0b1b2d]'
                            }`}
                          >
                            {isEditing ? (
                              <div className="space-y-3 p-3.5">
                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <Input
                                    value={editForm.descricao}
                                    onChange={e => setEditForm(f => ({ ...f, descricao: e.target.value }))}
                                    placeholder="Descrição"
                                    className="h-10 flex-1 rounded-xl border-white/10 bg-[#07111c] text-sm text-slate-100"
                                  />
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editForm.valor}
                                    onChange={e => setEditForm(f => ({ ...f, valor: e.target.value }))}
                                    placeholder="Valor"
                                    className="h-10 w-full rounded-xl border-white/10 bg-[#07111c] text-sm text-slate-100 sm:w-32"
                                  />
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <Input
                                    type="date"
                                    value={editForm.data?.split('T')[0] || ''}
                                    onChange={e => setEditForm(f => ({ ...f, data: e.target.value }))}
                                    className="h-10 w-full rounded-xl border-white/10 bg-[#07111c] text-sm text-slate-100 sm:w-40"
                                  />
                                  <Select
                                    value={editForm.categoria_id}
                                    onValueChange={v => setEditForm(f => ({ ...f, categoria_id: v }))}
                                  >
                                    <SelectTrigger className="h-10 flex-1 rounded-xl border-white/10 bg-[#07111c] text-sm text-slate-100">
                                      <SelectValue placeholder="Categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Sem categoria</SelectItem>
                                      {categorias.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                          <span className="flex items-center gap-2">
                                            <span className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
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
                                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-10 w-10 rounded-xl p-0 text-slate-300 hover:bg-white/[0.06] hover:text-white">
                                      <X className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" onClick={saveEdit} className="h-10 w-10 rounded-xl bg-emerald-500 p-0 text-slate-950 hover:bg-emerald-400">
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="px-3.5 py-3.5">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="flex min-w-0 items-start gap-3">
                                    <button
                                      onClick={() => toggleSelect(transacao.id)}
                                      className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] transition hover:bg-white/[0.08]"
                                    >
                                      {isSelected
                                        ? <CheckSquare className="h-4 w-4 text-emerald-300" />
                                        : <Square className="h-4 w-4 text-slate-500" />
                                      }
                                    </button>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-[15px] font-semibold text-white">
                                          {transacao.descricao || transacao.estabelecimento || 'Sem descrição'}
                                        </p>
                                        {isCategoriaFocada && (
                                          <Badge variant="outline" className="rounded-full border-cyan-400/25 bg-cyan-400/10 px-2 text-[10px] text-cyan-200">
                                            Em foco
                                          </Badge>
                                        )}
                                        <Badge
                                          variant="outline"
                                          className={`rounded-full px-2 text-[10px] ${
                                            isDespesa
                                              ? 'border-red-400/25 bg-red-400/10 text-red-300'
                                              : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                                          }`}
                                        >
                                          {isDespesa ? 'Despesa' : 'Crédito'}
                                        </Badge>
                                      </div>

                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-slate-400">
                                          {format(parseISO(transacao.data || transacao.quando), 'dd/MM/yyyy', { locale: ptBR })}
                                        </span>
                                        {categoriaVisivel ? (
                                          <Badge
                                            variant="secondary"
                                            className="cursor-pointer rounded-full bg-white/[0.08] px-2 py-1 text-[11px] text-slate-100 hover:bg-emerald-400/15"
                                            onClick={(e) => { e.stopPropagation(); startEdit(transacao) }}
                                            title="Clique para editar categoria"
                                          >
                                            {categoriaVisivel}
                                          </Badge>
                                        ) : (
                                          <Badge
                                            variant="outline"
                                            className="cursor-pointer rounded-full border-dashed border-white/15 px-2 py-1 text-[11px] text-slate-400 transition hover:border-emerald-400/30 hover:text-emerald-200"
                                            onClick={(e) => { e.stopPropagation(); startEdit(transacao) }}
                                            title="Clique para adicionar categoria"
                                          >
                                            + Categoria
                                          </Badge>
                                        )}
                                        {parcelaInfo && (
                                          <Badge variant="outline" className="rounded-full border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-300">
                                            {parcelaInfo.atual}/{parcelaInfo.total}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 lg:min-w-[200px] lg:justify-end">
                                    <p className={`text-[0.98rem] font-semibold tracking-tight tabular-nums whitespace-nowrap ${isDespesa ? 'text-red-400' : 'text-emerald-300'}`}>
                                      {isDespesa ? '-' : '+'}{formatCurrency(transacao.valor)}
                                    </p>
                                    <div className="h-5 w-px bg-white/10" />
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => startEdit(transacao)}
                                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.06] hover:text-emerald-200"
                                        title="Editar"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => deleteSingle(transacao.id)}
                                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.06] hover:text-red-300"
                                        title="Excluir"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </section>

              <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
                {cartaoSelecionado && (
                  <Card className="overflow-hidden rounded-[24px] border-white/10 bg-[linear-gradient(180deg,#0f1f30_0%,#0a1724_100%)] shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Resumo da Fatura</p>
                          <h3 className="mt-2 text-lg font-semibold text-white">{cartaoSelecionado.nome}</h3>
                          <p className="mt-1 text-[13px] text-slate-400">{periodoSelecionadoLabel || 'Período não definido'}</p>
                        </div>
                        {statusFaturaLabel && (
                          <Badge variant="outline" className={`rounded-full px-3 text-[11px] ${statusFaturaClassName}`}>
                            {statusFaturaLabel}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-4 rounded-[20px] border border-white/10 bg-[#081423] p-4">
                        <p className="text-[11px] text-slate-400">{labelValorResumo}</p>
                        <p className={`mt-2.5 text-[1.4rem] font-semibold leading-none tracking-tight tabular-nums ${
                          fatura.paga ? 'text-emerald-300' : fatura.vencida ? 'text-red-300' : 'text-white'
                        }`}>
                          {formatCurrency(valorPrincipalFatura)}
                        </p>
                        <p className="mt-2.5 text-[13px] leading-relaxed text-slate-400">
                          {descricaoValorResumo}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-300">
                          Banco: {bancoResumo}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-300">
                          Limite: {formatCurrency(cartaoSelecionado.limite || 0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {despesasPorCategoria.length > 0 && (
                  <Card className="rounded-[22px] border-white/10 bg-[#081423] shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                            {filtroParceladas ? 'Parceladas por categoria' : 'Despesas por categoria'}
                          </p>
                          <p className="mt-1 text-[12px] text-slate-400">
                            Clique para focar os lançamentos na lista
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Total</p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-white">
                            {formatCurrency(totalDespesasGrafico)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mx-auto h-[190px] w-full max-w-[220px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={despesasPorCategoria}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={46}
                                outerRadius={76}
                                paddingAngle={2}
                                stroke="none"
                                onClick={(data: any) => {
                                  if (data?.name) toggleCategoriaFoco(String(data.name))
                                }}
                              >
                                {despesasPorCategoria.map((entry) => (
                                  <Cell
                                    key={entry.name}
                                    fill={entry.color}
                                    cursor="pointer"
                                    opacity={categoriaEmFoco && categoriaEmFoco !== entry.name ? 0.45 : 1}
                                    stroke={categoriaEmFoco === entry.name ? '#e2e8f0' : 'transparent'}
                                    strokeWidth={categoriaEmFoco === entry.name ? 2 : 0}
                                  />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(value: number) => formatCurrency(Number(value))}
                                content={({ active, payload }) => {
                                  if (!active || !payload?.length) return null

                                  const item = payload[0]?.payload
                                  if (!item) return null

                                  return (
                                    <div className="rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-xl">
                                      <p className="font-medium text-white">{item.name}</p>
                                      <p className="mt-1 tabular-nums text-slate-200">{formatCurrency(item.value)}</p>
                                      <p className="text-slate-400">{item.percentage.toFixed(1)}% do total</p>
                                    </div>
                                  )
                                }}
                              />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto pr-1">
                          {despesasPorCategoria.map((item) => (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => toggleCategoriaFoco(item.name)}
                              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                                categoriaEmFoco === item.name
                                  ? 'border-cyan-400/30 bg-cyan-400/10'
                                  : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.05]'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span className="truncate text-[12px] font-medium text-slate-100">
                                    {item.name}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                  {item.percentage.toFixed(1)}% da lista atual
                                </p>
                              </div>
                              <span className="pl-3 text-[12px] font-semibold tabular-nums text-white">
                                {formatCurrency(item.value)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Card className="rounded-[20px] border-white/10 bg-[#081423] shadow-none">
                    <CardContent className="p-3.5">
                      <p className="text-[11px] text-slate-400">Fechamento</p>
                      <p className="mt-2 text-[0.95rem] font-semibold tabular-nums text-white">
                        {format(fatura.dataFechamento, 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[20px] border-white/10 bg-[#081423] shadow-none">
                    <CardContent className="p-3.5">
                      <p className="text-[11px] text-slate-400">Vencimento</p>
                      <p className={`mt-2 text-[0.95rem] font-semibold tabular-nums ${fatura.vencida ? 'text-red-300' : 'text-white'}`}>
                        {format(fatura.dataVencimento, 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </CardContent>
                  </Card>

                  <button
                    type="button"
                    onClick={toggleFiltroParceladas}
                    className={`rounded-[20px] border p-3.5 text-left transition ${
                      filtroParceladas
                        ? 'border-emerald-400/25 bg-emerald-400/10'
                        : 'border-white/10 bg-[#081423] hover:bg-[#0d2033]'
                    }`}
                  >
                    <p className="text-[11px] text-slate-400">Parceladas no período</p>
                    <p className="mt-2 text-[0.95rem] font-semibold tabular-nums text-white">
                      {formatCurrency(fatura.totalParceladas)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {descricaoParceladasResumo}
                    </p>
                  </button>

                  <Card className="rounded-[20px] border-white/10 bg-[#081423] shadow-none">
                    <CardContent className="p-3.5">
                      <p className="text-[11px] text-slate-400">Limite disponível</p>
                      <p className="mt-2 text-[0.95rem] font-semibold tabular-nums text-emerald-300">
                        {formatCurrency(limiteDisponivel)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-[22px] border-white/10 bg-[#081423] shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Ações desta Fatura</p>
                    <div className="mt-3 space-y-2.5">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={openDeleteInvoiceOptions}
                        disabled={deleting || !fatura || fatura.transacoes.length === 0}
                        className="h-10 w-full justify-center gap-1.5 rounded-xl"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deleting ? 'Excluindo...' : 'Excluir todos os lançamentos'}
                      </Button>
                      {!nomeBancoVinculado && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-10 w-full rounded-xl border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:text-white"
                          onClick={() => {
                            onClose()
                            window.location.href = '/cartoes'
                          }}
                        >
                          Vincular banco ao cartão
                        </Button>
                      )}
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                      Exclua a fatura inteira apenas quando quiser refazer a importação ou limpar completamente o período.
                    </p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <Card className="w-full max-w-xl rounded-[28px] border-dashed border-white/10 bg-[#081423] shadow-none">
                <CardContent className="p-10 text-center">
                  <CreditCard className="mx-auto mb-3 h-10 w-10 text-slate-500" />
                  <p className="text-sm text-slate-400">
                    Selecione um cartão e período para visualizar a fatura.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={showDeleteInvoiceDialog} onOpenChange={setShowDeleteInvoiceDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Excluir Lançamentos da Fatura
          </DialogTitle>
          <DialogDescription>
            {fatura
              ? `Escolha como excluir os lançamentos da fatura ${fatura.mes}/${fatura.ano}.`
              : 'Escolha como excluir os lançamentos desta fatura.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <button
            type="button"
            onClick={() => setDeleteInvoiceMode('current')}
            className={`w-full rounded-lg border p-3 text-left transition ${
              deleteInvoiceMode === 'current'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <p className="font-medium">Somente a fatura atual</p>
            <p className="text-sm text-muted-foreground">
              Remove apenas os lançamentos que aparecem na fatura aberta.
            </p>
          </button>

          <button
            type="button"
            onClick={() => hasParceladasFuturasNaFatura && setDeleteInvoiceMode('current_and_future')}
            disabled={!hasParceladasFuturasNaFatura}
            className={`w-full rounded-lg border p-3 text-left transition ${
              deleteInvoiceMode === 'current_and_future'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/40'
            } ${!hasParceladasFuturasNaFatura ? 'cursor-not-allowed opacity-50 hover:border-border' : ''}`}
          >
            <p className="font-medium">Fatura atual + parcelas futuras</p>
            <p className="text-sm text-muted-foreground">
              Remove a fatura aberta e também as próximas parcelas dos lançamentos parcelados dela.
            </p>
          </button>

          {!hasParceladasFuturasNaFatura && (
            <p className="text-xs text-muted-foreground">
              Esta fatura não possui parcelas futuras vinculadas.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteInvoiceDialog(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteAllFromCard(deleteInvoiceMode)}
            disabled={deleting}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
          </Button>
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
              Opcional. Se selecionar uma conta, o pagamento sera lancado como despesa nela.
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
