import { useState, useMemo } from 'react'
import { useInvestments, Investimento } from '@/hooks/useInvestments'
import { formatCurrency } from '@/utils/currency'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  Calendar, 
  Building2, 
  Plus, 
  Search,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  BarChart3,
  PieChart,
  Clock,
  Percent,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Receipt
} from 'lucide-react'
import { AddTransactionDialog } from '@/components/investments/AddTransactionDialog'
import { EditInvestmentDialog } from '@/components/investments/EditInvestmentDialog'
import { ResgateDialog } from '@/components/investments/ResgateDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { format, differenceInDays, addDays, isPast, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Cores para gráficos
const COLORS = [
  '#10B981', // emerald
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
]

// Labels amigáveis para tipos de investimento
const TIPO_LABELS: Record<string, string> = {
  acao: 'Ações',
  fii: 'FIIs',
  etf: 'ETFs',
  renda_fixa: 'Renda Fixa',
  tesouro_direto: 'Tesouro Direto',
  cri: 'CRI',
  cra: 'CRA',
  debenture: 'Debêntures',
  cripto: 'Criptomoedas',
  fundo: 'Fundos',
  previdencia: 'Previdência',
}

// Labels para liquidez
const LIQUIDEZ_LABELS: Record<string, string> = {
  diaria: 'Diária',
  no_vencimento: 'No vencimento',
  carencia_90: 'Carência 90 dias',
  carencia_180: 'Carência 180 dias',
  carencia_360: 'Carência 360 dias',
}

export default function Investimentos() {
  const { investimentos, loading, fetchInvestimentos, deletarInvestimento, getResumo } = useInvestments()
  
  // Estados de diálogos
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [resgateDialogOpen, setResgateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [investimentoSelecionado, setInvestimentoSelecionado] = useState<Investimento | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState<string>('todos')
  const [filterInstituicao, setFilterInstituicao] = useState<string>('todas')
  const [filterLiquidez, setFilterLiquidez] = useState<string>('todas')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedLastros, setExpandedLastros] = useState<Set<string>>(new Set())
  
  // Resumo calculado
  const resumo = useMemo(() => getResumo(), [investimentos])
  
  // Interface para grupo de investimentos
  interface GrupoInvestimento {
    codigo: string
    nome: string
    tipo: string
    tipo_rentabilidade?: string
    instituicao?: string
    lastros: Investimento[]
    valor_total_investido: number
    valor_atual_total: number
    rentabilidade_total: number
    rentabilidade_percentual: number
    quantidade_lastros: number
  }
  
  // Agrupar investimentos por código
  const investimentosAgrupados = useMemo(() => {
    const ativos = investimentos.filter(inv => inv.ativo && inv.quantidade > 0)
    
    // Criar mapa de grupos
    const grupos = new Map<string, GrupoInvestimento>()
    
    ativos.forEach(inv => {
      const key = `${inv.codigo}-${inv.tipo}`
      
      if (!grupos.has(key)) {
        grupos.set(key, {
          codigo: inv.codigo,
          nome: inv.nome,
          tipo: inv.tipo,
          tipo_rentabilidade: inv.tipo_rentabilidade,
          instituicao: inv.instituicao,
          lastros: [],
          valor_total_investido: 0,
          valor_atual_total: 0,
          rentabilidade_total: 0,
          rentabilidade_percentual: 0,
          quantidade_lastros: 0,
        })
      }
      
      const grupo = grupos.get(key)!
      grupo.lastros.push(inv)
      grupo.valor_total_investido += inv.valor_total
      grupo.valor_atual_total += (inv.valor_atual || 0)
      grupo.quantidade_lastros++
    })
    
    // Calcular rentabilidade de cada grupo
    grupos.forEach(grupo => {
      grupo.rentabilidade_total = grupo.valor_atual_total - grupo.valor_total_investido
      grupo.rentabilidade_percentual = grupo.valor_total_investido > 0
        ? (grupo.rentabilidade_total / grupo.valor_total_investido) * 100
        : 0
      
      // Ordenar lastros por data de aplicação (mais recente primeiro)
      grupo.lastros.sort((a, b) => {
        const dataA = a.data_aplicacao || a.created_at
        const dataB = b.data_aplicacao || b.created_at
        return new Date(dataB).getTime() - new Date(dataA).getTime()
      })
    })
    
    return Array.from(grupos.values())
  }, [investimentos])
  
  // Função de ordenação inteligente
  const ordenarGrupos = (grupos: GrupoInvestimento[]) => {
    // Ordem de prioridade dos tipos
    const ordemTipos: Record<string, number> = {
      'renda_fixa': 1,
      'tesouro_direto': 2,
      'cri': 3,
      'cra': 4,
      'debenture': 5,
      'acao': 6,
      'fii': 7,
      'etf': 8,
      'cripto': 9,
      'fundo': 10,
      'previdencia': 11,
    }
    
    // Ordem de rentabilidade dentro da renda fixa
    const ordemRentabilidade: Record<string, number> = {
      'pos': 1,
      'pre': 2,
      'ipca': 3,
      'hibrido': 4,
    }
    
    return grupos.sort((a, b) => {
      // 1. Ordenar por tipo de investimento
      const ordemA = ordemTipos[a.tipo] || 999
      const ordemB = ordemTipos[b.tipo] || 999
      
      if (ordemA !== ordemB) {
        return ordemA - ordemB
      }
      
      // 2. Se for renda fixa, ordenar por tipo de rentabilidade
      const isRendaFixa = ['renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture'].includes(a.tipo)
      
      if (isRendaFixa && a.tipo_rentabilidade && b.tipo_rentabilidade) {
        const rentA = ordemRentabilidade[a.tipo_rentabilidade] || 999
        const rentB = ordemRentabilidade[b.tipo_rentabilidade] || 999
        
        if (rentA !== rentB) {
          return rentA - rentB
        }
      }
      
      // 3. Por último, ordenar por valor (maior primeiro)
      return b.valor_atual_total - a.valor_atual_total
    })
  }
  
  // Investimentos agrupados e filtrados
  const gruposFiltrados = useMemo(() => {
    const filtrados = investimentosAgrupados.filter(grupo => {
      const matchSearch = searchTerm === '' || 
        grupo.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grupo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (grupo.instituicao || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchTipo = filterTipo === 'todos' || grupo.tipo === filterTipo
      const matchInstituicao = filterInstituicao === 'todas' || grupo.instituicao === filterInstituicao
      const matchLiquidez = filterLiquidez === 'todas' || grupo.lastros.some(l => l.liquidez === filterLiquidez)
      
      return matchSearch && matchTipo && matchInstituicao && matchLiquidez
    })
    
    return ordenarGrupos(filtrados)
  }, [investimentosAgrupados, searchTerm, filterTipo, filterInstituicao, filterLiquidez])
  
  // Lista de instituições únicas
  const instituicoesUnicas = useMemo(() => {
    const instituicoes = new Set<string>()
    investimentos.forEach(inv => {
      if (inv.instituicao) instituicoes.add(inv.instituicao)
    })
    return Array.from(instituicoes).sort()
  }, [investimentos])
  
  // Dados para gráfico de pizza (distribuição por tipo)
  const dadosGraficoPizza = useMemo(() => {
    return resumo.porTipo
      .filter(item => item.valor > 0)
      .map(item => ({
        name: TIPO_LABELS[item.tipo] || item.tipo,
        value: item.valor,
        percentual: item.percentual,
      }))
      .sort((a, b) => b.value - a.value)
  }, [resumo.porTipo])
  
  // Dados para gráfico de distribuição por instituição
  const dadosGraficoInstituicao = useMemo(() => {
    return resumo.porInstituicao
      .filter(item => item.valor > 0)
      .map(item => ({
        name: item.instituicao,
        valor: item.valor,
        percentual: item.percentual,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8) // Limitar a 8 instituições
  }, [resumo.porInstituicao])
  
  // Investimentos com liquidez diária
  const investimentosLiquidezDiaria = useMemo(() => {
    return investimentos
      .filter(inv => inv.ativo && inv.quantidade > 0 && inv.liquidez === 'diaria')
      .reduce((total, inv) => total + (inv.valor_atual || 0), 0)
  }, [investimentos])
  
  // Investimentos com vencimento próximo (30 dias)
  const investimentosVencimentoProximo = useMemo(() => {
    const hoje = new Date()
    const em30dias = addDays(hoje, 30)
    
    return investimentos
      .filter(inv => {
        if (!inv.data_vencimento || !inv.ativo) return false
        const vencimento = new Date(inv.data_vencimento)
        return isWithinInterval(vencimento, { start: hoje, end: em30dias })
      })
      .sort((a, b) => new Date(a.data_vencimento!).getTime() - new Date(b.data_vencimento!).getTime())
  }, [investimentos])
  
  // Investimentos vencidos
  const investimentosVencidos = useMemo(() => {
    return investimentos.filter(inv => {
      if (!inv.data_vencimento || !inv.ativo) return false
      return isPast(new Date(inv.data_vencimento))
    })
  }, [investimentos])
  
  // Handlers
  const handleEdit = (inv: Investimento) => {
    setInvestimentoSelecionado(inv)
    setEditDialogOpen(true)
  }
  
  const handleDelete = (inv: Investimento) => {
    setInvestimentoSelecionado(inv)
    setDeleteDialogOpen(true)
  }
  
  const handleResgate = (inv: Investimento) => {
    setSelectedIds(new Set([inv.id]))
    setResgateDialogOpen(true)
  }
  
  const confirmDelete = async () => {
    if (investimentoSelecionado) {
      await deletarInvestimento(investimentoSelecionado.id)
      setDeleteDialogOpen(false)
      setInvestimentoSelecionado(null)
    }
  }
  
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }
  
  const toggleLastros = (codigo: string) => {
    const newSet = new Set(expandedLastros)
    if (newSet.has(codigo)) {
      newSet.delete(codigo)
    } else {
      newSet.add(codigo)
    }
    setExpandedLastros(newSet)
  }
  
  // Formatador de data
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR })
  }
  
  // Calcular dias até vencimento
  const getDiasAteVencimento = (dataVencimento?: string) => {
    if (!dataVencimento) return null
    const dias = differenceInDays(new Date(dataVencimento), new Date())
    return dias
  }
  
  // Renderizar badge de status do vencimento
  const renderVencimentoBadge = (inv: Investimento) => {
    if (!inv.data_vencimento) return null
    
    const dias = getDiasAteVencimento(inv.data_vencimento)
    if (dias === null) return null
    
    if (dias < 0) {
      return <Badge variant="destructive" className="ml-2">Vencido</Badge>
    } else if (dias <= 30) {
      return <Badge variant="secondary" className="ml-2 bg-amber-500 text-white">Vence em {dias} dias</Badge>
    } else if (dias <= 90) {
      return <Badge variant="secondary" className="ml-2">Vence em {dias} dias</Badge>
    }
    return null
  }
  
  // Renderizar ícone do tipo
  const renderTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'acao':
      case 'fii':
      case 'etf':
        return <TrendingUp className="h-4 w-4" />
      case 'renda_fixa':
      case 'tesouro_direto':
      case 'cri':
      case 'cra':
      case 'debenture':
        return <Banknote className="h-4 w-4" />
      case 'cripto':
        return <DollarSign className="h-4 w-4" />
      case 'fundo':
      case 'previdencia':
        return <PiggyBank className="h-4 w-4" />
      default:
        return <Wallet className="h-4 w-4" />
    }
  }
  
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }
  
  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Investimentos</h1>
            <p className="text-muted-foreground">
              Acompanhe sua carteira e rentabilidade
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchInvestimentos()}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova aplicação
            </Button>
            <Button onClick={() => setResgateDialogOpen(true)} variant="outline">
              <ArrowDownRight className="h-4 w-4 mr-2" />
              Registrar resgate
            </Button>
          </div>
        </div>
        
        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Patrimônio Total */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-emerald-200 dark:border-emerald-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Patrimônio Total
              </CardTitle>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {formatCurrency(resumo.valorTotal)}
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                {resumo.quantidadeAtivos} ativos na carteira
              </p>
            </CardContent>
          </Card>
          
          {/* Rentabilidade */}
          <Card className={`bg-gradient-to-br ${resumo.rentabilidadeTotal >= 0 ? 'from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800' : 'from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 border-red-200 dark:border-red-800'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${resumo.rentabilidadeTotal >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                Rentabilidade
              </CardTitle>
              {resumo.rentabilidadeTotal >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${resumo.rentabilidadeTotal >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                {formatCurrency(resumo.rentabilidadeTotal)}
              </div>
              <p className={`text-xs mt-1 ${resumo.rentabilidadeTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {resumo.rentabilidadePercentual >= 0 ? '+' : ''}{resumo.rentabilidadePercentual.toFixed(2)}% total
              </p>
            </CardContent>
          </Card>
          
          {/* Liquidez Diária */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Liquidez Diária
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(investimentosLiquidezDiaria)}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Disponível para resgate imediato
              </p>
            </CardContent>
          </Card>
          
          {/* Vencimentos Próximos */}
          <Card className={`bg-gradient-to-br ${investimentosVencimentoProximo.length > 0 ? 'from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800' : 'from-gray-50 to-slate-50 dark:from-gray-950 dark:to-slate-950 border-gray-200 dark:border-gray-800'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${investimentosVencimentoProximo.length > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>
                Vencimentos Próximos
              </CardTitle>
              <Calendar className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${investimentosVencimentoProximo.length > 0 ? 'text-amber-900 dark:text-amber-100' : 'text-gray-900 dark:text-gray-100'}`}>
                {investimentosVencimentoProximo.length}
              </div>
              <p className={`text-xs mt-1 ${investimentosVencimentoProximo.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {investimentosVencimentoProximo.length > 0 
                  ? `Próximos 30 dias` 
                  : 'Nenhum vencimento próximo'}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Alertas de Vencimento */}
        {(investimentosVencidos.length > 0 || investimentosVencimentoProximo.length > 0) && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-5 w-5" />
                Atenção aos Vencimentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {investimentosVencidos.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="font-medium">{inv.codigo} - {inv.nome}</p>
                      <p className="text-sm text-muted-foreground">Vencido em {formatDate(inv.data_vencimento)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(inv.valor_atual || 0)}</p>
                    <Button variant="outline" size="sm" onClick={() => handleResgate(inv)}>
                      Resgatar
                    </Button>
                  </div>
                </div>
              ))}
              {investimentosVencimentoProximo.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <div>
                      <p className="font-medium">{inv.codigo} - {inv.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Vence em {getDiasAteVencimento(inv.data_vencimento)} dias ({formatDate(inv.data_vencimento)})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(inv.valor_atual || 0)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* Tabs de Visualização */}
        <Tabs defaultValue="lista" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="lista" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="distribuicao" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Distribuição
            </TabsTrigger>
            <TabsTrigger value="vencimentos" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Vencimentos
            </TabsTrigger>
            <TabsTrigger value="extrato" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Extrato
            </TabsTrigger>
          </TabsList>
          
          {/* Tab Lista */}
          <TabsContent value="lista" className="space-y-4">
            {/* Filtros */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por código, nome ou instituição..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filterTipo} onValueChange={setFilterTipo}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      {Object.entries(TIPO_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterInstituicao} onValueChange={setFilterInstituicao}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Instituição" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas instituições</SelectItem>
                      {instituicoesUnicas.map(inst => (
                        <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterLiquidez} onValueChange={setFilterLiquidez}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Liquidez" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas liquidez</SelectItem>
                      {Object.entries(LIQUIDEZ_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            {/* Lista de Investimentos */}
            <div className="space-y-3">
              {gruposFiltrados.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum investimento encontrado</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || filterTipo !== 'todos' || filterInstituicao !== 'todas'
                        ? 'Tente ajustar os filtros de busca'
                        : 'Comece adicionando seu primeiro investimento'}
                    </p>
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar investimento
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                gruposFiltrados.map((grupo) => {
                  const grupoKey = `${grupo.codigo}-${grupo.tipo}`
                  const mostrarLastros = expandedLastros.has(grupoKey)
                  const temMultiplosLastros = grupo.quantidade_lastros > 1
                  
                  return (
                    <Card 
                      key={grupoKey} 
                      className={`transition-all hover:shadow-md ${expandedId === grupoKey ? 'ring-2 ring-primary' : ''}`}
                    >
                      <CardContent className="p-4">
                        {/* Linha principal do grupo */}
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleExpand(grupoKey)}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {/* Ícone do tipo */}
                            <div className={`p-2 rounded-lg ${
                              ['acao', 'fii', 'etf'].includes(grupo.tipo) 
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' 
                                : grupo.tipo === 'cripto'
                                ? 'bg-amber-100 dark:bg-amber-900 text-amber-600'
                                : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600'
                            }`}>
                              {renderTipoIcon(grupo.tipo)}
                            </div>
                            
                            {/* Informações */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold truncate">{grupo.codigo}</h3>
                                <Badge variant="outline" className="text-xs">
                                  {TIPO_LABELS[grupo.tipo] || grupo.tipo}
                                </Badge>
                                {temMultiplosLastros && (
                                  <Badge variant="secondary" className="text-xs">
                                    {grupo.quantidade_lastros} aplicações
                                  </Badge>
                                )}
                                {grupo.lastros[0] && renderVencimentoBadge(grupo.lastros[0])}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {grupo.nome}
                                {grupo.instituicao && ` • ${grupo.instituicao}`}
                              </p>
                            </div>
                          </div>
                          
                          {/* Valores consolidados */}
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(grupo.valor_atual_total)}</p>
                              <p className={`text-sm ${grupo.rentabilidade_total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {grupo.rentabilidade_total >= 0 ? '+' : ''}{formatCurrency(grupo.rentabilidade_total)}
                                <span className="ml-1">
                                  ({grupo.rentabilidade_percentual >= 0 ? '+' : ''}{grupo.rentabilidade_percentual.toFixed(2)}%)
                                </span>
                              </p>
                            </div>
                            
                            {expandedId === grupoKey ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        
                        {/* Detalhes expandidos do grupo */}
                        {expandedId === grupoKey && (
                          <div className="mt-4 pt-4 border-t space-y-4">
                            {/* Totalizadores */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Total Investido</p>
                                <p className="font-medium">{formatCurrency(grupo.valor_total_investido)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Valor Atual</p>
                                <p className="font-medium">{formatCurrency(grupo.valor_atual_total)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Rentabilidade</p>
                                <p className={`font-medium ${grupo.rentabilidade_total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(grupo.rentabilidade_total)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Qtd. Aplicações</p>
                                <p className="font-medium">{grupo.quantidade_lastros}</p>
                              </div>
                            </div>
                            
                            {/* Botão para mostrar lastros (se tiver múltiplos) */}
                            {temMultiplosLastros && (
                              <div className="flex justify-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleLastros(grupoKey)
                                  }}
                                  className="gap-2"
                                >
                                  {mostrarLastros ? (
                                    <>
                                      <ChevronUp className="h-4 w-4" />
                                      Ocultar lastros
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4" />
                                      Ver {grupo.quantidade_lastros} lastros
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                            
                            {/* Lista de lastros individuais */}
                            {(mostrarLastros || !temMultiplosLastros) && (
                              <div className="space-y-3 bg-muted/20 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                                  {temMultiplosLastros ? 'Lastros individuais' : 'Detalhes da aplicação'}
                                </h4>
                                {grupo.lastros.map((inv, index) => (
                                  <div key={inv.id} className="bg-background rounded-lg p-3 space-y-3 border">
                                    {/* Cabeçalho do lastro */}
                                    {temMultiplosLastros && (
                                      <div className="flex items-center justify-between pb-2 border-b">
                                        <Badge variant="outline">Aplicação {index + 1}</Badge>
                                        {inv.data_aplicacao && (
                                          <span className="text-xs text-muted-foreground">
                                            Aplicado em {formatDate(inv.data_aplicacao)}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Informações do lastro */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Valor Investido</p>
                                        <p className="font-medium">{formatCurrency(inv.valor_total)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Valor Atual</p>
                                        <p className="font-medium">{formatCurrency(inv.valor_atual || 0)}</p>
                                      </div>
                                      {inv.data_aplicacao && (
                                        <div>
                                          <p className="text-xs text-muted-foreground">Data Aplicação</p>
                                          <p className="font-medium">{formatDate(inv.data_aplicacao)}</p>
                                        </div>
                                      )}
                                      {inv.data_vencimento && (
                                        <div>
                                          <p className="text-xs text-muted-foreground">Vencimento</p>
                                          <p className="font-medium">{formatDate(inv.data_vencimento)}</p>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Informações específicas de renda fixa */}
                                    {['renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture'].includes(inv.tipo) && (
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {inv.tipo_rentabilidade && (
                                          <div>
                                            <p className="text-xs text-muted-foreground">Rentabilidade</p>
                                            <p className="font-medium capitalize">
                                              {inv.tipo_rentabilidade === 'pos' ? 'Pós-fixado' : 
                                               inv.tipo_rentabilidade === 'pre' ? 'Pré-fixado' : 
                                               inv.tipo_rentabilidade === 'ipca' ? 'IPCA+' : 'Híbrido'}
                                            </p>
                                          </div>
                                        )}
                                        {inv.taxa_percentual && (
                                          <div>
                                            <p className="text-xs text-muted-foreground">Taxa</p>
                                            <p className="font-medium">
                                              {inv.tipo_rentabilidade === 'pos' 
                                                ? `${inv.taxa_percentual}% do CDI`
                                                : inv.tipo_rentabilidade === 'ipca'
                                                ? `IPCA + ${inv.taxa_percentual}%`
                                                : `${inv.taxa_percentual}% a.a.`}
                                            </p>
                                          </div>
                                        )}
                                        {inv.liquidez && (
                                          <div>
                                            <p className="text-xs text-muted-foreground">Liquidez</p>
                                            <p className="font-medium">{LIQUIDEZ_LABELS[inv.liquidez] || inv.liquidez}</p>
                                          </div>
                                        )}
                                        {inv.dias_aplicado !== undefined && (
                                          <div>
                                            <p className="text-xs text-muted-foreground">Dias Investido</p>
                                            <p className="font-medium">{inv.dias_aplicado} dias</p>
                                          </div>
                                        )}
                                        {inv.isento_ir !== undefined && (
                                          <div>
                                            <p className="text-xs text-muted-foreground">Isento de IR</p>
                                            <p className="font-medium flex items-center gap-1">
                                              {inv.isento_ir ? (
                                                <>
                                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                  Sim
                                                </>
                                              ) : (
                                                <>
                                                  <AlertCircle className="h-4 w-4 text-amber-600" />
                                                  Não
                                                </>
                                              )}
                                            </p>
                                          </div>
                                        )}
                                        {inv.ir_retido !== undefined && inv.ir_retido > 0 && (
                                          <div>
                                            <p className="text-xs text-muted-foreground">IR Provisionado</p>
                                            <p className="font-medium text-red-600">{formatCurrency(inv.ir_retido)}</p>
                                          </div>
                                        )}
                                        {inv.valor_bruto !== undefined && (
                                          <div>
                                            <p className="text-xs text-muted-foreground">Valor Bruto</p>
                                            <p className="font-medium">{formatCurrency(inv.valor_bruto)}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Informações de ações/FIIs */}
                                    {['acao', 'fii', 'etf', 'cripto'].includes(inv.tipo) && (
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                          <p className="text-xs text-muted-foreground">Quantidade</p>
                                          <p className="font-medium">{inv.quantidade.toLocaleString('pt-BR')}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Preço Médio</p>
                                          <p className="font-medium">{formatCurrency(inv.preco_medio)}</p>
                                        </div>
                                        {inv.cotacao_atual && (
                                          <div>
                                            <p className="text-xs text-muted-foreground">Cotação Atual</p>
                                            <p className="font-medium">{formatCurrency(inv.cotacao_atual)}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Barra de progresso de rentabilidade */}
                                    {inv.rentabilidade_percentual !== undefined && (
                                      <div>
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-muted-foreground">Rentabilidade</span>
                                          <span className={inv.rentabilidade_percentual >= 0 ? 'text-green-600' : 'text-red-600'}>
                                            {inv.rentabilidade_percentual >= 0 ? '+' : ''}{inv.rentabilidade_percentual.toFixed(2)}%
                                          </span>
                                        </div>
                                        <Progress 
                                          value={Math.min(Math.abs(inv.rentabilidade_percentual), 100)} 
                                          className={`h-2 ${inv.rentabilidade_percentual >= 0 ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                                        />
                                      </div>
                                    )}
                                    
                                    {/* Observações */}
                                    {inv.observacoes && (
                                      <div className="bg-muted/30 rounded-lg p-3">
                                        <p className="text-xs text-muted-foreground mb-1">Observações</p>
                                        <p className="text-sm">{inv.observacoes}</p>
                                      </div>
                                    )}
                                    
                                    {/* Ações do lastro individual */}
                                    <div className="flex justify-end gap-2 pt-2 border-t">
                                      <Button variant="outline" size="sm" onClick={(e) => {
                                        e.stopPropagation()
                                        handleResgate(inv)
                                      }}>
                                        <DollarSign className="h-4 w-4 mr-2" />
                                        Resgatar
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={(e) => {
                                        e.stopPropagation()
                                        handleEdit(inv)
                                      }}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar
                                      </Button>
                                      <Button variant="destructive" size="sm" onClick={(e) => {
                                        e.stopPropagation()
                                        handleDelete(inv)
                                      }}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </TabsContent>
          
          {/* Tab Distribuição */}
          <TabsContent value="distribuicao" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Gráfico de Pizza - Distribuição por Tipo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição por Classe</CardTitle>
                  <CardDescription>Alocação da carteira por tipo de ativo</CardDescription>
                </CardHeader>
                <CardContent>
                  {dadosGraficoPizza.length > 0 ? (
                    <div className="space-y-4">
                      {/* Grid de Cards ao invés de gráfico */}
                      <div className="grid grid-cols-2 gap-2">
                        {dadosGraficoPizza.map((item, index) => (
                          <div 
                            key={item.name} 
                            className="p-3 rounded-lg border-2 space-y-2"
                            style={{ borderColor: COLORS[index % COLORS.length] + '40', backgroundColor: COLORS[index % COLORS.length] + '10' }}
                          >
                            <div className="flex items-center gap-1">
                              <div 
                                className="w-2 h-2 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <p className="text-xs font-semibold text-muted-foreground truncate">{item.name}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-lg font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                                {item.percentual.toFixed(1)}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.value)}
                              </p>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                              <div 
                                className="h-full transition-all"
                                style={{ width: `${item.percentual}%`, backgroundColor: COLORS[index % COLORS.length] }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                      Sem dados para exibir
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Distribuição por Instituição */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Por Instituição</CardTitle>
                  <CardDescription>Distribuição por corretora/banco</CardDescription>
                </CardHeader>
                <CardContent>
                  {dadosGraficoInstituicao.length > 0 ? (
                    <div className="space-y-3">
                      {dadosGraficoInstituicao.map((item, index) => (
                        <div key={item.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <p className="text-sm font-medium truncate">{item.name}</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <p className="text-sm font-bold">{formatCurrency(item.valor)}</p>
                              <p className="text-xs text-muted-foreground">{item.percentual.toFixed(1)}%</p>
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full transition-all"
                              style={{ width: `${item.percentual}%`, backgroundColor: COLORS[index % COLORS.length] }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                      Sem dados para exibir
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Tabela detalhada de alocação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalhamento Completo da Alocação</CardTitle>
                <CardDescription>Valores e percentuais por classe de ativo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resumo.porTipo
                    .filter(item => item.valor > 0)
                    .sort((a, b) => b.valor - a.valor)
                    .map((item, index) => (
                      <div key={item.tipo} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div>
                              <p className="font-semibold text-sm">{TIPO_LABELS[item.tipo] || item.tipo}</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(item.valor)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">{item.percentual.toFixed(1)}%</p>
                          </div>
                        </div>
                        <Progress 
                          value={item.percentual} 
                          className="h-2.5"
                        />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab Vencimentos */}
          <TabsContent value="vencimentos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Calendário de Vencimentos</CardTitle>
                <CardDescription>Investimentos de renda fixa ordenados por data de vencimento</CardDescription>
              </CardHeader>
              <CardContent>
                {investimentos.filter(inv => inv.data_vencimento && inv.ativo && inv.quantidade > 0).length > 0 ? (
                  <div className="space-y-3">
                    {investimentos
                      .filter(inv => inv.data_vencimento && inv.ativo && inv.quantidade > 0)
                      .sort((a, b) => new Date(a.data_vencimento!).getTime() - new Date(b.data_vencimento!).getTime())
                      .map(inv => {
                        const dias = getDiasAteVencimento(inv.data_vencimento)
                        const isVencido = dias !== null && dias < 0
                        const isProximo = dias !== null && dias >= 0 && dias <= 30
                        
                        return (
                          <div 
                            key={inv.id} 
                            className={`flex items-center justify-between p-4 rounded-lg border ${
                              isVencido 
                                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                                : isProximo
                                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                                : 'bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg ${
                                isVencido 
                                  ? 'bg-red-100 dark:bg-red-900 text-red-600'
                                  : isProximo
                                  ? 'bg-amber-100 dark:bg-amber-900 text-amber-600'
                                  : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600'
                              }`}>
                                <Calendar className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{inv.codigo}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {TIPO_LABELS[inv.tipo] || inv.tipo}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{inv.nome}</p>
                                {inv.instituicao && (
                                  <p className="text-xs text-muted-foreground">{inv.instituicao}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(inv.valor_atual || 0)}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(inv.data_vencimento)}
                              </p>
                              <p className={`text-xs ${
                                isVencido 
                                  ? 'text-red-600 font-medium'
                                  : isProximo
                                  ? 'text-amber-600 font-medium'
                                  : 'text-muted-foreground'
                              }`}>
                                {isVencido 
                                  ? `Vencido há ${Math.abs(dias!)} dias`
                                  : `${dias} dias restantes`}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum vencimento cadastrado</h3>
                    <p className="text-muted-foreground">
                      Adicione investimentos de renda fixa com data de vencimento
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab Extrato */}
          <TabsContent value="extrato" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Extrato de Investimentos</CardTitle>
                <CardDescription>Todos os movimentos de aplicações e resgates</CardDescription>
              </CardHeader>
              <CardContent>
                {investimentos.length > 0 ? (
                  <div className="space-y-3">
                    {investimentos
                      .filter(inv => inv.ativo || inv.quantidade === 0) // Mostrar ativos e resgatados
                      .sort((a, b) => new Date(b.data_aplicacao || b.data_primeira_compra || b.created_at).getTime() - new Date(a.data_aplicacao || a.data_primeira_compra || a.created_at).getTime())
                      .map(inv => {
                        const isResgate = inv.quantidade === 0
                        const dataMovimento = inv.data_aplicacao || inv.data_primeira_compra || inv.created_at
                        
                        return (
                          <div 
                            key={inv.id} 
                            className="flex items-center justify-between p-4 rounded-lg border border-muted bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg ${
                                isResgate 
                                  ? 'bg-red-100 dark:bg-red-900 text-red-600'
                                  : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600'
                              }`}>
                                {isResgate ? (
                                  <ArrowDownRight className="h-4 w-4" />
                                ) : (
                                  <ArrowUpRight className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{inv.codigo}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {isResgate ? 'Resgate' : 'Aplicação'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {TIPO_LABELS[inv.tipo] || inv.tipo}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{inv.nome}</p>
                                {inv.instituicao && (
                                  <p className="text-xs text-muted-foreground">{inv.instituicao}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold text-lg ${
                                isResgate ? 'text-red-600' : 'text-emerald-600'
                              }`}>
                                {isResgate ? '-' : '+'}{formatCurrency(inv.valor_total)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(dataMovimento)}
                              </p>
                              {inv.quantidade > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Saldo: {inv.quantidade.toFixed(2)} unidades
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum movimento registrado</h3>
                    <p className="text-muted-foreground">
                      Adicione investimentos para visualizar o extrato
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Diálogos */}
        <AddTransactionDialog 
          open={addDialogOpen} 
          onClose={() => setAddDialogOpen(false)} 
        />
        
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
            setSelectedIds(new Set())
          }}
          selectedIds={selectedIds}
        />
        
        {/* Diálogo de confirmação de exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o investimento{' '}
                <strong>{investimentoSelecionado?.codigo} - {investimentoSelecionado?.nome}</strong>?
                Esta ação não pode ser desfeita.
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
    </TooltipProvider>
  )
}
