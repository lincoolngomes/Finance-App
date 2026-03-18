import { useState, useEffect, useMemo } from 'react'
import { supabase } from '/src/lib/supabase'
import { useAuth } from '/src/hooks/useAuth'
import { toast } from '/src/hooks/use-toast'
import { useDashboardPreferences } from '/src/hooks/useDashboardPreferences'
import { DashboardStats } from '/src/components/dashboard/DashboardStats'
import { DashboardFilters } from '/src/components/dashboard/DashboardFilters'
import { DashboardCharts } from '/src/components/dashboard/DashboardCharts'
import { GerenciarFaturasModal } from '/src/components/faturas/GerenciarFaturasModal'
import { getTransactionMonth, enrichCardTransactions } from '/src/utils/dateParser'
import { calculateSaldoGlobalContas } from '/src/utils/account-balance'
import {
  getInvestmentImpact,
  isInvestmentTransaction,
  shouldIncludeTransactionByCardExpenseMode,
  shouldIncludeTransactionInDashboardView,
} from '/src/utils/dashboard-classification'

interface Transacao {
  id: number
  created_at: string
  data: string | null
  descricao: string | null
  valor: number | null
  observacao: string | null
  tipo: string | null
  categoria_id: string
  conta_id?: string | null
  cartao_id?: string | null
  user_id: string | null
  fatura_mes?: number | null
  fatura_ano?: number | null
  pago?: boolean | null
  categorias?: {
    id: string
    nome: string
  }
}

interface Lembrete {
  id: number
  created_at: string
  userid: string | null
  titulo: string | null
  descricao: string | null
  data: string | null
  valor: number | null
}

interface Conta {
  id: string
  name?: string | null
  saldo_inicial?: number | null
  saldoInicial?: number | null
  saldo?: number | null
}

interface Cartao {
  id: string
  nome?: string | null
  dia_fechamento?: string | number | null
  bandeira?: string | null
  cor?: string | null
  limite?: number | null
}

type DashboardMonthDetailFilter = 'receitas' | 'despesas' | 'investimentos'

export default function Dashboard() {
  const isTransacaoPaga = (transacao: { pago?: boolean | null }) => transacao.pago === true
  const normalizeDashboardMonthIndex = (monthValue: string) => {
    const monthNumber = parseInt(monthValue)
    if (Number.isNaN(monthNumber)) return new Date().getMonth()
    return monthNumber > 11 ? monthNumber - 1 : monthNumber
  }
  
  // Usar hook para preferências persistentes
  const {
    preferences,
    setShowCardTransactions,
    setUseCardInvoicePayments,
    setShowPendingInMonthlyChart,
    setShowInvestmentsSeparately,
    setHideValues,
  } = useDashboardPreferences()

  const DASHBOARD_FILTERS_KEY = 'dashboard:filters:v1'
  const getInitialMonthYear = () => {
    const now = new Date()
    const fallback = {
      month: now.getMonth().toString(),
      year: now.getFullYear().toString(),
    }
    try {
      const raw = localStorage.getItem(DASHBOARD_FILTERS_KEY)
      if (!raw) return fallback
      const parsed = JSON.parse(raw)
      const monthNum = Number(parsed?.month)
      const yearNum = Number(parsed?.year)
      return {
        month: Number.isInteger(monthNum) && monthNum >= 0 && monthNum <= 11 ? String(monthNum) : fallback.month,
        year: Number.isInteger(yearNum) && yearNum >= 2000 && yearNum <= 2100 ? String(yearNum) : fallback.year,
      }
    } catch {
      return fallback
    }
  }

  const initialMonthYear = getInitialMonthYear()
  const { user } = useAuth()
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [lembretes, setLembretes] = useState<Lembrete[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [loading, setLoading] = useState(true)
  const [faturasOpen, setFaturasOpen] = useState(false)
  const [faturaInitialCardId, setFaturaInitialCardId] = useState<string | null>(null)
  const [faturaInitialMonth, setFaturaInitialMonth] = useState<string>('')
  const [faturaInitialYear, setFaturaInitialYear] = useState<string>('')
  const [monthDetailsRequest, setMonthDetailsRequest] = useState<{
    monthIndex: number
    year: number
    filter: DashboardMonthDetailFilter
    requestId: number
  } | null>(null)

  // Extrair valores das preferências
  const { showCardTransactions, useCardInvoicePayments, showPendingInMonthlyChart, showInvestmentsSeparately, hideValues } = preferences

  // DEBUG: Logar transacoes carregadas
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Transacoes carregadas:', transacoes)
      // Logar datas das transações para diagnóstico
      const datas = transacoes.slice(0, 20).map(t => ({
        id: t.id,
        data: t.data,
        created_at: t.created_at,
        tipo: t.tipo,
        valor: t.valor
      }))
      console.table(datas)
    }
  }, [transacoes])
  
  // Estados dos filtros de mês/ano
  const [filterMonth, setFilterMonth] = useState(initialMonthYear.month)
  const [filterYear, setFilterYear] = useState(initialMonthYear.year)

  // Salvar mês/ano no localStorage
  useEffect(() => {
    localStorage.setItem(DASHBOARD_FILTERS_KEY, JSON.stringify({
      month: filterMonth,
      year: filterYear,
    }))
  }, [filterMonth, filterYear])

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Buscar TODAS as queries em paralelo, não sequencialmente
        const [transResult, lemResult, contasResult, cartoesResult, categResult] = await Promise.all([
          supabase
            .from('transacoes')
            .select(`
              *,
              categorias (
                id,
                nome
              )
            `)
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('lembretes')
            .select('*')
            .eq('userid', user?.id)
            .order('data', { ascending: true }),
          supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user?.id),
          supabase
            .from('cartoes')
            .select('id, nome, dia_fechamento, bandeira, cor, limite')
            .eq('user_id', user?.id),
          supabase
            .from('categorias')
            .select('id, nome')
            .eq('user_id', user?.id)
        ])

        const { data: transacoesData, error: transacoesError } = transResult
        const { data: lembretesData, error: lembretesError } = lemResult
        const { data: contasData, error: contasError } = contasResult
        const { data: cartoesData } = cartoesResult
        const { data: categoriasData } = categResult

        if (import.meta.env.DEV) {
          console.log('Resultado bruto transacoes:', transacoesData?.length || 0)
          if (transacoesError) console.error('Erro ao buscar transacoes:', transacoesError)
        }

        if (transacoesError) throw transacoesError
        if (lembretesError) throw lembretesError

        // Aplicar categorização retroativa para transações sem categoria
        if (transacoesData) {
          const { categorizar, REGRAS_PADRAO } = await import('/src/utils/categorizacao');
          const regrasTexto = localStorage.getItem('regrasFatura') || REGRAS_PADRAO;
          
          const categoriasMap = new Map((categoriasData || []).map(c => [c.nome?.toLowerCase(), c]));
          
          for (const t of transacoesData) {
            if (!t.categoria_id && t.descricao) {
              const nomeCategoria = categorizar(t.descricao, regrasTexto);
              if (nomeCategoria) {
                let cat = categoriasMap.get(nomeCategoria.toLowerCase());
                if (!cat) {
                  const { data: newCat } = await supabase
                    .from('categorias')
                    .insert({ user_id: user?.id, nome: nomeCategoria })
                    .select('id, nome')
                    .maybeSingle();
                  if (newCat) {
                    cat = newCat;
                    categoriasMap.set(nomeCategoria.toLowerCase(), newCat);
                  }
                }
                if (cat) {
                  t.categoria_id = cat.id;
                  t.categorias = { id: cat.id, nome: cat.nome };
                  // Salvar no banco em background (não bloqueia)
                  supabase.from('transacoes').update({ categoria_id: cat.id }).eq('id', t.id).then();
                }
              }
            }
            // Corrigir status de cartão (apenas em memória, sem salvar no banco)
            if (t.cartao_id && t.pago !== undefined) {
              t.status = t.pago ? 'pago' : 'pendente_fatura';
            }
          }
        }

        // Enriquecer transações de cartão que não têm fatura_mes/fatura_ano
        if (transacoesData && cartoesData && cartoesData.length > 0) {
          enrichCardTransactions(transacoesData, cartoesData)
        }

        if (!contasError) setContas(contasData || [])
        if (cartoesData) setCartoes(cartoesData)
        setTransacoes(transacoesData || [])
        setLembretes(lembretesData || [])
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        toast({
          title: "Erro ao carregar dados",
          description: message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Filtrar transações por mês e ano
  const filteredTransacoes = useMemo(() => {
    // normalize filter month: accept either 0-11 or 1-12 from the select
    const filterMonthIndex = normalizeDashboardMonthIndex(filterMonth)
    const filterYearNum = parseInt(filterYear) || new Date().getFullYear()

    const resultado = transacoes.filter(transacao => {
      if (!shouldIncludeTransactionByCardExpenseMode(transacao, showCardTransactions, useCardInvoicePayments)) {
        return false
      }

      // Usar função centralizada para determinar mês/ano da transação
      const tm = getTransactionMonth(transacao)
      if (!tm) return false
      return tm.month === filterMonthIndex && tm.year === filterYearNum
    })

    if (import.meta.env.DEV) {
      console.log('📊 Dashboard Filter:', {
        filterMonthIndex,
        filterYearNum,
        totalTransacoes: transacoes.length,
        filteredCount: resultado.length,
        showCardTransactions,
        useCardInvoicePayments,
        cartaoCount: resultado.filter(t => t.cartao_id).length,
        contaCount: resultado.filter(t => !t.cartao_id).length,
      })
    }

    return resultado
  }, [transacoes, filterMonth, filterYear, showCardTransactions, useCardInvoicePayments])

  // DEBUG: Logar transacoes filtradas
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Transacoes filtradas:', filteredTransacoes)
    }
  }, [filteredTransacoes])

  const dashboardViewTransacoes = useMemo(() => {
    const resultado = filteredTransacoes.filter((transacao) =>
      shouldIncludeTransactionInDashboardView(transacao, showPendingInMonthlyChart)
    )

    if (import.meta.env.DEV) {
      console.log('📊 Dashboard View:', {
        filteredCount: filteredTransacoes.length,
        consideredCount: resultado.length,
        showPendingInMonthlyChart,
        receitas: resultado.filter(t => t.tipo === 'receita').length,
        despesas: resultado.filter(t => t.tipo === 'despesa').length,
      })
    }

    return resultado
  }, [filteredTransacoes, showPendingInMonthlyChart])

  // Calcular estatísticas
  // Saldo atual (global) — não deve depender do filtro de mês/ano
  const saldoAtual = useMemo(() => {
    return calculateSaldoGlobalContas(contas, transacoes)
  }, [transacoes, contas])

  const stats = useMemo(() => {
    // Usa transações consideradas na visão atual do dashboard
    const transacoesCartao = dashboardViewTransacoes.filter(t => t.cartao_id)
    const transacoesConta = dashboardViewTransacoes.filter(t => !t.cartao_id)
    const transacoesInvestimento = dashboardViewTransacoes.filter(isInvestmentTransaction)
    
    const totalReceitas = dashboardViewTransacoes
      .filter(t => t.tipo === 'receita' && (!showInvestmentsSeparately || !isInvestmentTransaction(t)))
      .reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)
    
    const totalInvestimentos = transacoesInvestimento
      .reduce((acc, t) => acc + getInvestmentImpact(t), 0)

    const totalDespesas = dashboardViewTransacoes
      .filter(t => t.tipo === 'despesa' && (!showInvestmentsSeparately || !isInvestmentTransaction(t)))
      .reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)
    
    if (import.meta.env.DEV) {
      console.log('📊 STATS DEBUG:', {
        filteredCount: dashboardViewTransacoes.length,
        cartaoCount: transacoesCartao.length,
        contaCount: transacoesConta.length,
        investimentoCount: transacoesInvestimento.length,
        despesasCartao: transacoesCartao.filter(t => t.tipo === 'despesa').reduce((a, t) => a + Math.abs(Number(t.valor) || 0), 0),
        despesasConta: transacoesConta.filter(t => t.tipo === 'despesa').reduce((a, t) => a + Math.abs(Number(t.valor) || 0), 0),
        totalReceitas,
        totalDespesas,
        totalInvestimentos,
      })
    }
    
    // Saldo atual (global, não dependente do filtro)
    const saldo = saldoAtual
    
    const lembretesCount = lembretes.filter(l => {
      if (!l.data) return false
      const lembreteDate = new Date(l.data)
      return lembreteDate.getMonth() === parseInt(filterMonth) && 
             lembreteDate.getFullYear() === parseInt(filterYear)
    }).length

    return {
      totalReceitas,
      totalDespesas,
      totalInvestimentos,
      saldo,
      transacoesCount: dashboardViewTransacoes.length,
      lembretesCount
    }
  }, [dashboardViewTransacoes, lembretes, filterMonth, filterYear, saldoAtual, showInvestmentsSeparately])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardFilters 
        filterMonth={filterMonth}
        filterYear={filterYear}
        setFilterMonth={setFilterMonth}
        setFilterYear={setFilterYear}
        hideValues={hideValues}
        setHideValues={setHideValues}
        showCardTransactions={showCardTransactions}
        setShowCardTransactions={setShowCardTransactions}
        useCardInvoicePayments={useCardInvoicePayments}
        setUseCardInvoicePayments={setUseCardInvoicePayments}
        showPendingInMonthlyChart={showPendingInMonthlyChart}
        setShowPendingInMonthlyChart={setShowPendingInMonthlyChart}
        showInvestmentsSeparately={showInvestmentsSeparately}
        setShowInvestmentsSeparately={setShowInvestmentsSeparately}
      />
      
      <DashboardStats
        stats={stats}
        hideValues={hideValues}
        showInvestmentsSeparately={showInvestmentsSeparately}
        onOpenMonthDetails={(detailFilter) => {
          setMonthDetailsRequest({
            monthIndex: normalizeDashboardMonthIndex(filterMonth),
            year: parseInt(filterYear) || new Date().getFullYear(),
            filter: detailFilter,
            requestId: Date.now(),
          })
        }}
      />

      <DashboardCharts 
        transacoes={dashboardViewTransacoes} 
        recentTransacoes={transacoes} 
        contas={contas}
        cartoes={cartoes}
        lembretes={lembretes}
        selectedMonth={String(parseInt(filterMonth)).padStart(2, '0')}
        selectedYear={filterYear}
        allTransactions={transacoes}
        showCardTransactions={showCardTransactions}
        useCardInvoicePayments={useCardInvoicePayments}
        showPendingInMonthlyChart={showPendingInMonthlyChart}
        showInvestmentsSeparately={showInvestmentsSeparately}
        hideValues={hideValues}
        monthDetailsRequest={monthDetailsRequest}
        onOpenFatura={(mes, ano) => {
          const mesNum = parseInt(mes)
          const anoNum = parseInt(ano)

          const transacaoDoPeriodo = transacoes.find(t =>
            t.cartao_id &&
            t.fatura_mes === mesNum &&
            t.fatura_ano === anoNum
          )

          setFaturaInitialCardId(transacaoDoPeriodo?.cartao_id || cartoes[0]?.id || null)
          setFaturaInitialMonth(mes)
          setFaturaInitialYear(ano)
          setFaturasOpen(true)
        }}
      />

      {/* Modal de Faturas */}
      <GerenciarFaturasModal
        key={faturasOpen ? `${faturaInitialMonth}-${faturaInitialYear}` : 'closed'}
        open={faturasOpen}
        onClose={() => {
          setFaturasOpen(false)
          setFaturaInitialCardId(null)
          setFaturaInitialMonth('')
          setFaturaInitialYear('')
        }}
        initialCardId={faturaInitialCardId || (cartoes.length > 0 ? cartoes[0].id : null)}
        initialMonth={faturaInitialMonth}
        initialYear={faturaInitialYear}
      />
    </div>
  )
}
