import { useEffect, useMemo, useState } from 'react'
import { differenceInDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowDownRight,
  Building2,
  Calendar,
  Clock3,
  Download,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import { AddTransactionDialog } from '/src/components/investments/AddTransactionDialog'
import { EditInvestmentDialog } from '/src/components/investments/EditInvestmentDialog'
import { ImportB3Dialog } from '/src/components/investments/ImportB3Dialog'
import { ResgateDialog } from '/src/components/investments/ResgateDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '/src/components/ui/alert-dialog'
import { Badge } from '/src/components/ui/badge'
import { Button } from '/src/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '/src/components/ui/card'
import { Input } from '/src/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '/src/components/ui/select'
import { Skeleton } from '/src/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '/src/components/ui/table'
import { useInvestments, type Investimento } from '/src/hooks/useInvestments'
import { cn } from '/src/lib/utils'
import { formatCurrency } from '/src/utils/currency'

const TIPO_LABELS: Record<string, string> = {
  acao: 'Acoes',
  fii: 'FIIs',
  etf: 'ETFs',
  renda_fixa: 'Renda fixa',
  tesouro_direto: 'Tesouro Direto',
  cri: 'CRI',
  cra: 'CRA',
  debenture: 'Debentures',
  cripto: 'Cripto',
  fundo: 'Fundos',
  previdencia: 'Previdencia',
}

const LIQUIDEZ_LABELS: Record<string, string> = {
  diaria: 'Liquidez diaria',
  no_vencimento: 'No vencimento',
  carencia_90: 'Carencia 90 dias',
  carencia_180: 'Carencia 180 dias',
  carencia_360: 'Carencia 360 dias',
}

const RENTABILIDADE_LABELS: Record<string, string> = {
  pos: 'Pos-fixado',
  pre: 'Pre-fixado',
  ipca: 'IPCA+',
  hibrido: 'Hibrido',
}

const FIXED_INCOME_TYPES = ['renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture']
const QUOTED_TYPES = ['acao', 'fii', 'etf', 'cripto']
const DISTRIBUTION_COLORS = ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500']

type SortOption = 'maior_posicao' | 'maior_aporte' | 'melhor_resultado' | 'proximo_vencimento' | 'recentes'

interface GrupoInvestimento {
  id: string
  codigo: string
  nome: string
  tipo: string
  instituicao?: string
  aplicacoes: Investimento[]
  totalInvestido: number
  valorAtual: number
  resultado: number
  resultadoPercentual: number
  dataMaisRecente?: string
  proximoVencimento?: string
  temLiquidezDiaria: boolean
  quantidadeAplicacoes: number
}

function toDate(value?: string | null) {
  if (!value) return null

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISO(value) : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(value?: string | null) {
  const parsed = toDate(value)
  if (!parsed) return '-'
  return format(parsed, 'dd/MM/yyyy', { locale: ptBR })
}

function formatDateTime(value?: Date | null) {
  if (!value) return 'Sem atualizacao registrada'
  return format(value, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
}

function getTimestamp(value?: string | null, fallback = Number.POSITIVE_INFINITY) {
  return toDate(value)?.getTime() ?? fallback
}

function getTipoLabel(tipo?: string) {
  if (!tipo) return 'Investimento'
  return TIPO_LABELS[tipo] || tipo
}

function getTipoAgrupado(tipo?: string) {
  return tipo === 'tesouro_direto' ? 'renda_fixa' : tipo || 'outro'
}

function getQuantidadeLabel(value?: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(value || 0)
}

function getTaxaLabel(inv: Investimento) {
  if (!inv.taxa_percentual) return null

  if (inv.tipo_rentabilidade === 'pos') return `${inv.taxa_percentual}% do CDI`
  if (inv.tipo_rentabilidade === 'ipca') return `IPCA + ${inv.taxa_percentual}%`
  return `${inv.taxa_percentual}% a.a.`
}

function getDaysToDue(value?: string | null) {
  const parsed = toDate(value)
  if (!parsed) return null
  return differenceInDays(parsed, new Date())
}

function getDueBadge(value?: string | null) {
  const days = getDaysToDue(value)
  if (days === null) return null

  if (days < 0) {
    return {
      label: `Vencido ha ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`,
      className:
        'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300',
    }
  }

  if (days === 0) {
    return {
      label: 'Vence hoje',
      className:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300',
    }
  }

  if (days <= 30) {
    return {
      label: `Vence em ${days} dias`,
      className:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300',
    }
  }

  return null
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function getInvestmentIcon(tipo: string): LucideIcon {
  if (QUOTED_TYPES.includes(tipo)) return TrendingUp
  if (FIXED_INCOME_TYPES.includes(tipo)) return Landmark
  return PiggyBank
}

function getResultColor(value: number) {
  return value >= 0 ? 'text-emerald-600' : 'text-red-600'
}

function getDisplayInstitution(value?: string) {
  return value || 'Nao informado'
}

export default function Investimentos() {
  const { investimentos, loading, fetchInvestimentos, deletarInvestimento, lastUpdatedAt } = useInvestments()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [sortBy, setSortBy] = useState<SortOption>('maior_posicao')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [resgateDialogOpen, setResgateDialogOpen] = useState(false)
  const [importB3DialogOpen, setImportB3DialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [investimentoSelecionado, setInvestimentoSelecionado] = useState<Investimento | null>(null)

  const investimentosAtivos = useMemo(
    () => investimentos.filter((investimento) => investimento.ativo),
    [investimentos]
  )

  const grupos = useMemo(() => {
    const grouped = new Map<string, GrupoInvestimento>()

    investimentosAtivos.forEach((investimento) => {
      const id = `${investimento.tipo}-${investimento.codigo}`
      const valorAtual = Number(investimento.valor_atual ?? investimento.valor_total ?? 0)
      const valorInvestido = Number(investimento.valor_total || 0)

      if (!grouped.has(id)) {
        grouped.set(id, {
          id,
          codigo: investimento.codigo,
          nome: investimento.nome,
          tipo: investimento.tipo,
          instituicao: investimento.instituicao || undefined,
          aplicacoes: [],
          totalInvestido: 0,
          valorAtual: 0,
          resultado: 0,
          resultadoPercentual: 0,
          dataMaisRecente: investimento.data_aplicacao || investimento.data_primeira_compra || investimento.created_at,
          proximoVencimento: investimento.data_vencimento,
          temLiquidezDiaria: investimento.liquidez === 'diaria',
          quantidadeAplicacoes: 0,
        })
      }

      const grupo = grouped.get(id)!
      grupo.aplicacoes.push(investimento)
      grupo.totalInvestido += valorInvestido
      grupo.valorAtual += valorAtual
      grupo.quantidadeAplicacoes += 1
      grupo.temLiquidezDiaria = grupo.temLiquidezDiaria || investimento.liquidez === 'diaria'

      const dataAtual = toDate(grupo.dataMaisRecente)
      const dataInvestimento = toDate(
        investimento.data_aplicacao || investimento.data_primeira_compra || investimento.created_at
      )
      if (!dataAtual || (dataInvestimento && dataInvestimento > dataAtual)) {
        grupo.dataMaisRecente =
          investimento.data_aplicacao || investimento.data_primeira_compra || investimento.created_at
      }

      const vencimentoAtual = toDate(grupo.proximoVencimento)
      const vencimentoInvestimento = toDate(investimento.data_vencimento)
      if (!vencimentoAtual || (vencimentoInvestimento && vencimentoInvestimento < vencimentoAtual)) {
        grupo.proximoVencimento = investimento.data_vencimento
      }

      if (grupo.instituicao !== investimento.instituicao) {
        grupo.instituicao =
          grupo.instituicao && investimento.instituicao
            ? 'Diversas instituicoes'
            : grupo.instituicao || investimento.instituicao || undefined
      }
    })

    return Array.from(grouped.values()).map((grupo) => {
      const aplicacoes = [...grupo.aplicacoes].sort((a, b) => {
        const dateA = getTimestamp(a.data_aplicacao || a.data_primeira_compra || a.created_at, 0)
        const dateB = getTimestamp(b.data_aplicacao || b.data_primeira_compra || b.created_at, 0)
        return dateB - dateA
      })

      const resultado = grupo.valorAtual - grupo.totalInvestido
      const resultadoPercentual =
        grupo.totalInvestido > 0 ? (resultado / grupo.totalInvestido) * 100 : 0

      return {
        ...grupo,
        aplicacoes,
        resultado,
        resultadoPercentual,
      }
    })
  }, [investimentosAtivos])

  const totalInvestido = useMemo(
    () => investimentosAtivos.reduce((total, investimento) => total + Number(investimento.valor_total || 0), 0),
    [investimentosAtivos]
  )

  const valorAtualTotal = useMemo(
    () =>
      investimentosAtivos.reduce(
        (total, investimento) => total + Number(investimento.valor_atual ?? investimento.valor_total ?? 0),
        0
      ),
    [investimentosAtivos]
  )

  const resultadoTotal = valorAtualTotal - totalInvestido
  const resultadoPercentualTotal = totalInvestido > 0 ? (resultadoTotal / totalInvestido) * 100 : 0

  const liquidezDiaria = useMemo(
    () =>
      investimentosAtivos
        .filter((investimento) => investimento.liquidez === 'diaria')
        .reduce((total, investimento) => total + Number(investimento.valor_atual ?? investimento.valor_total ?? 0), 0),
    [investimentosAtivos]
  )

  const vencimentosProximos = useMemo(
    () =>
      investimentosAtivos
        .filter((investimento) => {
          const days = getDaysToDue(investimento.data_vencimento)
          return days !== null && days >= 0 && days <= 30
        })
        .sort((a, b) => getTimestamp(a.data_vencimento) - getTimestamp(b.data_vencimento)),
    [investimentosAtivos]
  )

  const vencidos = useMemo(
    () =>
      investimentosAtivos
        .filter((investimento) => {
          const days = getDaysToDue(investimento.data_vencimento)
          return days !== null && days < 0
        })
        .sort((a, b) => getTimestamp(a.data_vencimento) - getTimestamp(b.data_vencimento)),
    [investimentosAtivos]
  )

  const distribuicaoPorTipo = useMemo(() => {
    const totals = new Map<string, number>()

    investimentosAtivos.forEach((investimento) => {
      const tipo = getTipoAgrupado(investimento.tipo)
      const valor = Number(investimento.valor_atual ?? investimento.valor_total ?? 0)
      totals.set(tipo, (totals.get(tipo) || 0) + valor)
    })

    return Array.from(totals.entries())
      .map(([tipo, valor]) => ({
        tipo,
        valor,
        percentual: valorAtualTotal > 0 ? (valor / valorAtualTotal) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor)
  }, [investimentosAtivos, valorAtualTotal])

  const distribuicaoPorInstituicao = useMemo(() => {
    const totals = new Map<string, number>()

    investimentosAtivos.forEach((investimento) => {
      const instituicao = investimento.instituicao || 'Nao informado'
      const valor = Number(investimento.valor_atual ?? investimento.valor_total ?? 0)
      totals.set(instituicao, (totals.get(instituicao) || 0) + valor)
    })

    return Array.from(totals.entries())
      .map(([instituicao, valor]) => ({
        instituicao,
        valor,
        percentual: valorAtualTotal > 0 ? (valor / valorAtualTotal) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
  }, [investimentosAtivos, valorAtualTotal])

  const gruposFiltrados = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase()

    const filtered = grupos.filter((grupo) => {
      const matchesSearch =
        !termo ||
        grupo.codigo.toLowerCase().includes(termo) ||
        grupo.nome.toLowerCase().includes(termo) ||
        getDisplayInstitution(grupo.instituicao).toLowerCase().includes(termo)

      const matchesTipo = filterTipo === 'todos' || grupo.tipo === filterTipo

      return matchesSearch && matchesTipo
    })

    return filtered.sort((a, b) => {
      if (sortBy === 'maior_aporte') return b.totalInvestido - a.totalInvestido
      if (sortBy === 'melhor_resultado') return b.resultadoPercentual - a.resultadoPercentual
      if (sortBy === 'proximo_vencimento') {
        const dueA = getTimestamp(a.proximoVencimento)
        const dueB = getTimestamp(b.proximoVencimento)

        if (!Number.isFinite(dueA) && !Number.isFinite(dueB)) return b.valorAtual - a.valorAtual
        if (!Number.isFinite(dueA)) return 1
        if (!Number.isFinite(dueB)) return -1
        return dueA - dueB
      }
      if (sortBy === 'recentes') {
        return (
          getTimestamp(b.dataMaisRecente, 0) - getTimestamp(a.dataMaisRecente, 0)
        )
      }
      return b.valorAtual - a.valorAtual
    })
  }, [filterTipo, grupos, searchTerm, sortBy])

  useEffect(() => {
    if (gruposFiltrados.length === 0) {
      setSelectedGroupId(null)
      return
    }

    if (!selectedGroupId || !gruposFiltrados.some((grupo) => grupo.id === selectedGroupId)) {
      setSelectedGroupId(gruposFiltrados[0].id)
    }
  }, [gruposFiltrados, selectedGroupId])

  const selectedGroup = gruposFiltrados.find((grupo) => grupo.id === selectedGroupId) || null
  const maiorPosicao = grupos.length > 0 ? [...grupos].sort((a, b) => b.valorAtual - a.valorAtual)[0] : null
  const proximoVencimentoDestaque = [...vencimentosProximos, ...vencidos][0] || null

  const handleEdit = (investimento: Investimento) => {
    setInvestimentoSelecionado(investimento)
    setEditDialogOpen(true)
  }

  const handleDelete = (investimento: Investimento) => {
    setInvestimentoSelecionado(investimento)
    setDeleteDialogOpen(true)
  }

  const handleResgate = (investimento?: Investimento) => {
    setInvestimentoSelecionado(investimento || null)
    setResgateDialogOpen(true)
  }

  const handleRefresh = async () => {
    await fetchInvestimentos()
  }

  const limparFiltros = () => {
    setSearchTerm('')
    setFilterTipo('todos')
    setSortBy('maior_posicao')
  }

  const confirmDelete = async () => {
    if (!investimentoSelecionado) return
    await deletarInvestimento(investimentoSelecionado.id)
    setDeleteDialogOpen(false)
    setInvestimentoSelecionado(null)
  }

  if (loading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[420px] rounded-2xl" />
        <Skeleton className="h-[320px] rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Investimentos</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Veja rapidamente quanto foi aportado, quanto a carteira vale hoje e onde seu dinheiro esta concentrado.
          </p>
          <p className="text-xs text-muted-foreground">
            Ultima atualizacao: <span className="font-medium text-foreground">{formatDateTime(lastUpdatedAt)}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportB3DialogOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Importar B3
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleResgate()}>
            <ArrowDownRight className="mr-2 h-4 w-4" />
            Registrar resgate
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova aplicacao
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total investido</p>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{formatCurrency(totalInvestido)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {investimentosAtivos.length} aplicacao(oes) em aberto
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Valor atual</p>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{formatCurrency(valorAtualTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {grupos.length} posicao(oes) consolidadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Resultado total</p>
              {resultadoTotal >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <p className={cn('mt-3 text-2xl font-semibold', getResultColor(resultadoTotal))}>
              {formatCurrency(resultadoTotal)}
            </p>
            <p className={cn('mt-1 text-xs', getResultColor(resultadoTotal))}>
              {formatPercent(resultadoPercentualTotal)} sobre o valor investido
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Liquidez diaria</p>
              <Clock3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{formatCurrency(liquidezDiaria)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {vencidos.length > 0 ? `${vencidos.length} vencido(s) precisam revisao` : 'Sem alertas de vencimento atrasado'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{grupos.length} posicoes</Badge>
        {maiorPosicao && (
          <Badge variant="outline">
            Maior posicao: {maiorPosicao.codigo} ({formatCurrency(maiorPosicao.valorAtual)})
          </Badge>
        )}
        {proximoVencimentoDestaque ? (
          <Badge variant="outline" className={cn(getDueBadge(proximoVencimentoDestaque.data_vencimento)?.className)}>
            Proximo vencimento: {proximoVencimentoDestaque.codigo} em {formatDate(proximoVencimentoDestaque.data_vencimento)}
          </Badge>
        ) : (
          <Badge variant="outline">Nenhum vencimento proximo</Badge>
        )}
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-xl">Carteira consolidada</CardTitle>
              <CardDescription>
                Uma linha por ativo para facilitar a leitura do valor investido, saldo atual e resultado.
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {gruposFiltrados.length} posicao(oes) e {formatCurrency(gruposFiltrados.reduce((total, grupo) => total + grupo.valorAtual, 0))} filtrados
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_190px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por codigo, nome ou instituicao"
                className="pl-10"
              />
            </div>

            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {Object.entries(TIPO_LABELS).map(([tipo, label]) => (
                  <SelectItem key={tipo} value={tipo}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maior_posicao">Maior posicao</SelectItem>
                <SelectItem value="maior_aporte">Maior aporte</SelectItem>
                <SelectItem value="melhor_resultado">Melhor resultado</SelectItem>
                <SelectItem value="proximo_vencimento">Proximo vencimento</SelectItem>
                <SelectItem value="recentes">Aplicacoes recentes</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={limparFiltros}
              disabled={!searchTerm && filterTipo === 'todos' && sortBy === 'maior_posicao'}
            >
              Limpar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {gruposFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum investimento encontrado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Ajuste os filtros ou adicione uma nova aplicacao para montar sua carteira.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova aplicacao
                </Button>
                {(searchTerm || filterTipo !== 'todos') && (
                  <Button variant="outline" onClick={limparFiltros}>
                    Limpar filtros
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Instituicao</TableHead>
                      <TableHead className="text-right">Investido</TableHead>
                      <TableHead className="text-right">Atual</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                      <TableHead className="text-right">Rent.</TableHead>
                      <TableHead className="w-[160px] text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gruposFiltrados.map((grupo) => {
                      const Icon = getInvestmentIcon(grupo.tipo)
                      const badgeVencimento = getDueBadge(grupo.proximoVencimento)
                      const isSelected = selectedGroupId === grupo.id

                      return (
                        <TableRow
                          key={grupo.id}
                          onClick={() => setSelectedGroupId(grupo.id)}
                          className={cn('cursor-pointer', isSelected && 'bg-muted/50 hover:bg-muted/50')}
                        >
                          <TableCell>
                            <div className="flex items-start gap-3">
                              <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
                                <Icon className="h-4 w-4 text-foreground" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold">{grupo.codigo}</span>
                                  <Badge variant="outline">{getTipoLabel(grupo.tipo)}</Badge>
                                  {grupo.quantidadeAplicacoes > 1 && (
                                    <Badge variant="secondary">{grupo.quantidadeAplicacoes} aplicacoes</Badge>
                                  )}
                                  {badgeVencimento && (
                                    <Badge variant="outline" className={badgeVencimento.className}>
                                      {badgeVencimento.label}
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-1 max-w-[320px] truncate text-sm text-muted-foreground">
                                  {grupo.nome}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Ultimo aporte em {formatDate(grupo.dataMaisRecente)}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[180px] truncate text-sm">
                              {getDisplayInstitution(grupo.instituicao)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(grupo.totalInvestido)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(grupo.valorAtual)}
                          </TableCell>
                          <TableCell className={cn('text-right font-medium', getResultColor(grupo.resultado))}>
                            {formatCurrency(grupo.resultado)}
                          </TableCell>
                          <TableCell className={cn('text-right font-medium', getResultColor(grupo.resultadoPercentual))}>
                            {formatPercent(grupo.resultadoPercentual)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                              {grupo.aplicacoes.length === 1 && (
                                <Button variant="outline" size="sm" onClick={() => handleResgate(grupo.aplicacoes[0])}>
                                  <ArrowDownRight className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={() => setSelectedGroupId(grupo.id)}>
                                Ver
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {gruposFiltrados.map((grupo) => {
                  const Icon = getInvestmentIcon(grupo.tipo)
                  const badgeVencimento = getDueBadge(grupo.proximoVencimento)
                  const isSelected = selectedGroupId === grupo.id

                  return (
                    <button
                      key={grupo.id}
                      type="button"
                      onClick={() => setSelectedGroupId(grupo.id)}
                      className={cn(
                        'w-full rounded-2xl border p-4 text-left transition-colors',
                        isSelected ? 'border-primary bg-muted/40' : 'border-border/70 bg-card'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
                            <Icon className="h-4 w-4 text-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{grupo.codigo}</span>
                              <Badge variant="outline">{getTipoLabel(grupo.tipo)}</Badge>
                            </div>
                            <p className="mt-1 truncate text-sm text-muted-foreground">{grupo.nome}</p>
                          </div>
                        </div>

                        <span className={cn('text-sm font-semibold', getResultColor(grupo.resultadoPercentual))}>
                          {formatPercent(grupo.resultadoPercentual)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {grupo.quantidadeAplicacoes > 1 && (
                          <Badge variant="secondary">{grupo.quantidadeAplicacoes} aplicacoes</Badge>
                        )}
                        {badgeVencimento && (
                          <Badge variant="outline" className={badgeVencimento.className}>
                            {badgeVencimento.label}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border/60 bg-background p-3">
                          <p className="text-xs text-muted-foreground">Investido</p>
                          <p className="mt-1 font-semibold">{formatCurrency(grupo.totalInvestido)}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background p-3">
                          <p className="text-xs text-muted-foreground">Atual</p>
                          <p className="mt-1 font-semibold">{formatCurrency(grupo.valorAtual)}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedGroup && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl">{selectedGroup.codigo}</CardTitle>
                  <Badge variant="outline">{getTipoLabel(selectedGroup.tipo)}</Badge>
                  {selectedGroup.quantidadeAplicacoes > 1 && (
                    <Badge variant="secondary">{selectedGroup.quantidadeAplicacoes} aplicacoes</Badge>
                  )}
                </div>
                <CardDescription className="mt-1">
                  {selectedGroup.nome} - {getDisplayInstitution(selectedGroup.instituicao)}
                </CardDescription>
              </div>

              <div className="text-sm text-muted-foreground">
                Posicao selecionada para detalhes e operacoes
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Investido</p>
                <p className="mt-2 text-xl font-semibold">{formatCurrency(selectedGroup.totalInvestido)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Atual</p>
                <p className="mt-2 text-xl font-semibold">{formatCurrency(selectedGroup.valorAtual)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Resultado</p>
                <p className={cn('mt-2 text-xl font-semibold', getResultColor(selectedGroup.resultado))}>
                  {formatCurrency(selectedGroup.resultado)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Rentabilidade</p>
                <p className={cn('mt-2 text-xl font-semibold', getResultColor(selectedGroup.resultadoPercentual))}>
                  {formatPercent(selectedGroup.resultadoPercentual)}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {selectedGroup.aplicacoes.map((investimento, index) => {
              const resultado = Number(
                investimento.rentabilidade ??
                  (investimento.valor_atual ?? investimento.valor_total ?? 0) - (investimento.valor_total || 0)
              )
              const percentual =
                investimento.rentabilidade_percentual ??
                ((investimento.valor_total || 0) > 0
                  ? (resultado / Number(investimento.valor_total || 0)) * 100
                  : 0)
              const badgeVencimento = getDueBadge(investimento.data_vencimento)

              return (
                <div key={investimento.id} className="rounded-2xl border border-border/70 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {selectedGroup.quantidadeAplicacoes > 1 ? `Aplicacao ${index + 1}` : 'Aplicacao'}
                        </Badge>
                        {investimento.tipo_rentabilidade && (
                          <Badge variant="outline">{RENTABILIDADE_LABELS[investimento.tipo_rentabilidade]}</Badge>
                        )}
                        {investimento.liquidez && (
                          <Badge variant="outline">{LIQUIDEZ_LABELS[investimento.liquidez] || investimento.liquidez}</Badge>
                        )}
                        {badgeVencimento && (
                          <Badge variant="outline" className={badgeVencimento.className}>
                            {badgeVencimento.label}
                          </Badge>
                        )}
                        {investimento.isento_ir && <Badge variant="outline">Isento de IR</Badge>}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          {getDisplayInstitution(investimento.instituicao)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Aplicado em {formatDate(investimento.data_aplicacao || investimento.data_primeira_compra || investimento.created_at)}
                        </span>
                        {investimento.data_vencimento && (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            Vencimento em {formatDate(investimento.data_vencimento)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleResgate(investimento)}>
                        <ArrowDownRight className="mr-2 h-4 w-4" />
                        Resgatar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(investimento)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(investimento)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Investido</p>
                      <p className="mt-1 font-semibold">{formatCurrency(investimento.valor_total || 0)}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Atual</p>
                      <p className="mt-1 font-semibold">
                        {formatCurrency(investimento.valor_atual ?? investimento.valor_total ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Resultado</p>
                      <p className={cn('mt-1 font-semibold', getResultColor(resultado))}>
                        {formatCurrency(resultado)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Rentabilidade</p>
                      <p className={cn('mt-1 font-semibold', getResultColor(percentual))}>
                        {formatPercent(percentual)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Quantidade</p>
                      <p className="mt-1 font-semibold">{getQuantidadeLabel(investimento.quantidade)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {getTaxaLabel(investimento) && (
                      <Badge variant="outline">{getTaxaLabel(investimento)}</Badge>
                    )}
                    {QUOTED_TYPES.includes(investimento.tipo) && investimento.preco_medio > 0 && (
                      <Badge variant="outline">Preco medio: {formatCurrency(investimento.preco_medio)}</Badge>
                    )}
                    {QUOTED_TYPES.includes(investimento.tipo) && investimento.cotacao_atual ? (
                      <Badge variant="outline">Cotacao: {formatCurrency(investimento.cotacao_atual)}</Badge>
                    ) : null}
                  </div>

                  {investimento.observacoes && (
                    <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Observacoes</p>
                      <p className="mt-1 text-sm">{investimento.observacoes}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Alocacao por classe</CardTitle>
            <CardDescription>Distribuicao da carteira no valor atual.</CardDescription>
          </CardHeader>
          <CardContent>
            {distribuicaoPorTipo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma classe disponivel.</p>
            ) : (
              <div className="space-y-4">
                {distribuicaoPorTipo.map((item, index) => (
                  <div key={item.tipo} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length])} />
                        <p className="text-sm font-medium">{getTipoLabel(item.tipo)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(item.valor)}</p>
                        <p className="text-xs text-muted-foreground">{item.percentual.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={cn('h-2 rounded-full', DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length])}
                        style={{ width: `${item.percentual}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Instituicoes</CardTitle>
            <CardDescription>Onde a carteira esta mais concentrada.</CardDescription>
          </CardHeader>
          <CardContent>
            {distribuicaoPorInstituicao.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma instituicao com saldo.</p>
            ) : (
              <div className="space-y-3">
                {distribuicaoPorInstituicao.map((item) => (
                  <div key={item.instituicao} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.instituicao}</p>
                        <p className="text-xs text-muted-foreground">{item.percentual.toFixed(1)}% da carteira</p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(item.valor)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Vencimentos</CardTitle>
            <CardDescription>Os itens que merecem atencao agora.</CardDescription>
          </CardHeader>
          <CardContent>
            {vencidos.length === 0 && vencimentosProximos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center">
                <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">Nenhum vencimento proximo</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Seus titulos com data de vencimento aparecerao aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...vencidos, ...vencimentosProximos].slice(0, 5).map((investimento) => {
                  const badge = getDueBadge(investimento.data_vencimento)
                  return (
                    <div key={investimento.id} className="rounded-xl border border-border/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{investimento.codigo}</p>
                          <p className="truncate text-xs text-muted-foreground">{investimento.nome}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(investimento.data_vencimento)} - {getDisplayInstitution(investimento.instituicao)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {formatCurrency(investimento.valor_atual ?? investimento.valor_total ?? 0)}
                          </p>
                          {badge && (
                            <Badge variant="outline" className={cn('mt-2', badge.className)}>
                              {badge.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddTransactionDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} />

      <EditInvestmentDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false)
          setInvestimentoSelecionado(null)
        }}
        investimento={investimentoSelecionado}
      />

      <ResgateDialog
        open={resgateDialogOpen}
        onClose={() => {
          setResgateDialogOpen(false)
          setInvestimentoSelecionado(null)
        }}
        selectedIds={investimentoSelecionado ? new Set([investimentoSelecionado.id]) : undefined}
      />

      <ImportB3Dialog
        open={importB3DialogOpen}
        onOpenChange={setImportB3DialogOpen}
        onSuccess={async () => {
          await fetchInvestimentos()
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir investimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{' '}
              <strong>
                {investimentoSelecionado?.codigo} - {investimentoSelecionado?.nome}
              </strong>
              ? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
