import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInvestments, Investimento } from '@/hooks/useInvestments'
import { formatCurrency } from '@/utils/currency'
import { AddTransactionDialog } from '@/components/investments/AddTransactionDialog'
import { EditInvestmentDialog } from '@/components/investments/EditInvestmentDialog'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Wallet, PlusCircle, Calendar, Building2, ChevronLeft, ChevronRight, Edit } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const COLORS = ['#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#f97316']

const TIPO_LABELS: Record<string, string> = {
  acao: 'Ações',
  fii: 'FIIs',
  etf: 'ETFs',
  renda_fixa: 'Renda Fixa',
  cripto: 'Criptomoedas',
  fundo: 'Fundos',
  previdencia: 'Previdência'
}

const TIPO_EMOJIS: Record<string, string> = {
  acao: '📈',
  fii: '🏢',
  etf: '📊',
  renda_fixa: '💰',
  cripto: '₿',
  fundo: '🎯',
  previdencia: '🏦'
}

// Função helper para formatar datas corretamente (sem problemas de UTC)
const formatarData = (dataString: string) => {
  const [ano, mes, dia] = dataString.split('T')[0].split('-')
  return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia)).toLocaleDateString('pt-BR')
}

export default function Investimentos() {
  const { investimentos, loading, mesReferencia, setMesReferencia, getResumo, deletarInvestimento } = useInvestments()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedInvestimento, setSelectedInvestimento] = useState<Investimento | null>(null)
  
  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  
  // Modo manual de saldo
  const [modoManual, setModoManual] = useState(false)
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [showValorManualDialog, setShowValorManualDialog] = useState(false)
  const [valorManualTemp, setValorManualTemp] = useState('')
  
  // Agrupamento e expansão
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  // Persistir filtros no localStorage
  const [filtroTipo, setFiltroTipo] = useState<string>(() => {
    return localStorage.getItem('investimentos_filtro_tipo') || 'todos'
  })
  const [filtroInstituicao, setFiltroInstituicao] = useState<string>(() => {
    return localStorage.getItem('investimentos_filtro_instituicao') || 'todas'
  })

  // Salvar filtros quando mudarem
  const handleFiltroTipoChange = (value: string) => {
    setFiltroTipo(value)
    localStorage.setItem('investimentos_filtro_tipo', value)
  }

  const handleFiltroInstituicaoChange = (value: string) => {
    setFiltroInstituicao(value)
    localStorage.setItem('investimentos_filtro_instituicao', value)
  }

  // Memoizar cálculos para evitar recálculos em cada render
  const resumo = useMemo(() => getResumo(), [investimentos])

  // Filtrar investimentos
  const investimentosFiltrados = useMemo(() => {
    return investimentos.filter(inv => {
      if (filtroTipo !== 'todos' && inv.tipo !== filtroTipo) return false
      if (filtroInstituicao !== 'todas' && inv.instituicao !== filtroInstituicao) return false
      return inv.ativo && inv.quantidade > 0
    })
  }, [investimentos, filtroTipo, filtroInstituicao])
  
  // Agrupar investimentos por código
  const investimentosAgrupados = useMemo(() => {
    const grupos = new Map<string, Investimento[]>()
    
    investimentosFiltrados.forEach(inv => {
      const key = inv.codigo
      if (!grupos.has(key)) {
        grupos.set(key, [])
      }
      grupos.get(key)!.push(inv)
    })
    
    // Converter para array e ordenar por valor total
    return Array.from(grupos.entries())
      .map(([codigo, items]) => {
        const valorTotal = items.reduce((sum, inv) => sum + (inv.valor_atual || 0), 0)
        const valorBrutoTotal = items.reduce((sum, inv) => sum + (inv.valor_bruto || 0), 0)
        const valorInvestido = items.reduce((sum, inv) => sum + inv.valor_total, 0)
        return {
          codigo,
          items,
          valorTotal,
          valorBrutoTotal,
          valorInvestido,
          tipo: items[0].tipo,
          tipo_rentabilidade: items[0].tipo_rentabilidade,
          isento_ir: items[0].isento_ir,
          instituicao: items[0].instituicao,
          nome: items[0].nome,
          hasManual: items.some(inv => inv.valor_atual_manual && inv.valor_atual_manual > 0)
        }
      })
      .sort((a, b) => b.valorTotal - a.valorTotal)
  }, [investimentosFiltrados])
  
  // Agrupar por categorias (Tipo > Subtipo > Isenção)
  const investimentosPorCategoria = useMemo(() => {
    const categorias = new Map<string, typeof investimentosAgrupados>()
    
    investimentosAgrupados.forEach(grupo => {
      let categoriaKey = ''
      
      if (grupo.tipo === 'renda_fixa') {
        // Para renda fixa: Tipo > Subtipo (pós/pré/ipca) > Isenção
        const subtipo = grupo.tipo_rentabilidade || 'outros'
        const isencao = grupo.isento_ir ? 'isento' : 'tributado'
        categoriaKey = `renda_fixa_${subtipo}_${isencao}`
      } else {
        // Para outros tipos: apenas o tipo
        categoriaKey = grupo.tipo
      }
      
      if (!categorias.has(categoriaKey)) {
        categorias.set(categoriaKey, [])
      }
      categorias.get(categoriaKey)!.push(grupo)
    })
    
    return categorias
  }, [investimentosAgrupados])
  
  const toggleGroup = (codigo: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(codigo)) {
      newExpanded.delete(codigo)
    } else {
      newExpanded.add(codigo)
    }
    setExpandedGroups(newExpanded)
  }

  // Instituições únicas
  const instituicoes = useMemo(() => {
    return Array.from(new Set(investimentos.map(i => i.instituicao).filter(Boolean)))
  }, [investimentos])

  // Navegar meses
  const proximoMes = () => {
    const nova = new Date(mesReferencia)
    nova.setMonth(nova.getMonth() + 1)
    if (nova <= new Date()) {
      setMesReferencia(nova)
    }
  }

  const mesAnterior = () => {
    const nova = new Date(mesReferencia)
    nova.setMonth(nova.getMonth() - 1)
    setMesReferencia(nova)
  }

  const mesAtual = () => {
    setMesReferencia(new Date())
  }

  const mesAtualSelecionado = mesReferencia.getMonth() === new Date().getMonth() && 
                              mesReferencia.getFullYear() === new Date().getFullYear()
  
  // Funções de seleção
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }
  
  const toggleSelectAll = () => {
    const todosIds = investimentosFiltrados.map(inv => inv.id)
    if (selectedIds.size === todosIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(todosIds))
    }
  }
  
  const handleBulkDelete = async () => {
    if (confirm(`Deseja realmente excluir ${selectedIds.size} investimento(s)?`)) {
      for (const id of selectedIds) {
        await deletarInvestimento(id)
      }
      setSelectedIds(new Set())
    }
  }
  
  // Calcular evolução mensal (últimos 12 meses)
  const dadosEvolucao = useMemo(() => {
    const meses: { mes: string, saldo: number, aplicado: number }[] = []
    const hoje = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const mesReferencia = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const mesNome = mesReferencia.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      
      // Filtrar investimentos que existiam naquele mês
      const investimentosDoMes = investimentos.filter(inv => {
        if (!inv.data_aplicacao) return false
        const dataAplicacao = new Date(inv.data_aplicacao)
        return dataAplicacao <= mesReferencia && inv.ativo
      })
      
      const saldoTotal = investimentosDoMes.reduce((sum, inv) => sum + (inv.valor_atual || 0), 0)
      const aplicadoTotal = investimentosDoMes.reduce((sum, inv) => sum + inv.valor_total, 0)
      
      meses.push({
        mes: mesNome.replace('.', ''),
        saldo: saldoTotal,
        aplicado: aplicadoTotal
      })
    }
    
    return meses
  }, [investimentos])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando investimentos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Investimentos</h1>
          <p className="text-muted-foreground mt-1">Controle e acompanhe seus investimentos</p>
        </div>

        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Nova Aplicação
        </Button>
      </div>
      
      {/* Navegação de Mês */}
      <Card className="p-4 border-teal-200 dark:border-teal-900">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm"
            onClick={mesAnterior}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span className="font-semibold">
                {mesReferencia.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
              </span>
              {!mesAtualSelecionado && (
                <Button variant="link" size="sm" onClick={mesAtual} className="text-teal-600 h-auto p-0">
                  (Mês atual)
                </Button>
              )}
            </div>
            {!mesAtualSelecionado && (
              <p className="text-xs text-muted-foreground">
                📊 Valores calculados até o último dia útil do mês
              </p>
            )}
          </div>

          <Button 
            variant="outline"
            size="sm"
            onClick={proximoMes}
            disabled={mesAtualSelecionado}
            className="gap-1"
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 border-l-4 border-l-teal-600 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Patrimônio Total</p>
              <p className="text-2xl font-bold mt-2 text-teal-600">{formatCurrency(resumo.valorTotal)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-teal-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-cyan-600 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rentabilidade</p>
              <p className={`text-2xl font-bold mt-2 ${resumo.rentabilidadePercentual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {resumo.rentabilidadePercentual >= 0 ? '+' : ''}
                {resumo.rentabilidadePercentual.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(resumo.rentabilidadeTotal)}
              </p>
            </div>
            {resumo.rentabilidadePercentual >= 0 ? (
              <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-600 opacity-50" />
            )}
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold mt-2 text-blue-600">{resumo.quantidadeAtivos}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {resumo.porTipo.length} {resumo.porTipo.length === 1 ? 'tipo' : 'tipos'}
              </p>
            </div>
            <Wallet className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-600 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Instituições</p>
              <p className="text-2xl font-bold mt-2 text-purple-600">{resumo.porInstituicao.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Corretoras</p>
            </div>
            <Building2 className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select value={filtroTipo} onValueChange={handleFiltroTipoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="acao">📈 Ações</SelectItem>
                <SelectItem value="fii">🏢 FIIs</SelectItem>
                <SelectItem value="etf">📊 ETFs</SelectItem>
                <SelectItem value="renda_fixa">💰 Renda Fixa</SelectItem>
                <SelectItem value="cripto">₿ Criptomoedas</SelectItem>
                <SelectItem value="fundo">🎯 Fundos</SelectItem>
                <SelectItem value="previdencia">🏦 Previdência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={filtroInstituicao} onValueChange={handleFiltroInstituicaoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por instituição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as instituições</SelectItem>
                {instituicoes.map(inst => (
                  <SelectItem key={inst} value={inst!}>{inst}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Gráfico de Evolução */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            Evolução do Patrimônio
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Últimos 12 meses</p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosEvolucao}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="mes" 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="aplicado" 
                stroke="#94a3b8" 
                strokeWidth={2}
                name="Valor Aplicado"
                dot={{ fill: '#94a3b8', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="saldo" 
                stroke="#14b8a6" 
                strokeWidth={3}
                name="Saldo Atual"
                dot={{ fill: '#14b8a6', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diversificação por Tipo */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Diversificação por Tipo</h3>
          {resumo.porTipo.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={resumo.porTipo}
                  dataKey="valor"
                  nameKey="tipo"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${TIPO_EMOJIS[entry.tipo] || ''} ${entry.percentual.toFixed(1)}%`}
                >
                  {resumo.porTipo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => TIPO_LABELS[label] || label}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum investimento registrado
            </div>
          )}
        </Card>

        {/* Diversificação por Instituição */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Diversificação por Instituição</h3>
          {resumo.porInstituicao.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={resumo.porInstituicao}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="instituicao" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="valor" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum investimento registrado
            </div>
          )}
        </Card>
      </div>

      {/* Tabela de Ativos */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Meus Ativos</h3>
          
          {/* Toggle Modo Manual/Automático */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">🤖 Automático</span>
            <button
              onClick={() => setModoManual(!modoManual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                modoManual ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  modoManual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-muted-foreground">✏️ Manual</span>
          </div>
        </div>
        
        {/* Barra de ações em lote */}
        {selectedIds.size > 0 && (
          <div className="mb-4 p-3 bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium text-teal-900 dark:text-teal-100">
                {selectedIds.size} investimento(s) selecionado(s)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  🗑️ Excluir Selecionados
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {investimentosFiltrados.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === investimentosFiltrados.length && investimentosFiltrados.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-sm">Código</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-sm">Nome</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-sm">Tipo</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-sm">Detalhes</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-sm">Investido</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-sm">Valor Bruto</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-sm">Valor Líquido</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-sm">Rentabilidade</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground text-sm">Ações</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(investimentosPorCategoria.entries()).map(([categoriaKey, grupos]) => {
                  // Calcular totais da categoria
                  const totalCategoria = grupos.reduce((sum, g) => sum + g.valorTotal, 0)
                  
                  // Definir label da categoria
                  let categoriaLabel = ''
                  let categoriaIcon = ''
                  
                  if (categoriaKey.startsWith('renda_fixa_')) {
                    const parts = categoriaKey.split('_')
                    const subtipo = parts[2]
                    const isencao = parts[3]
                    
                    if (subtipo === 'pos') categoriaLabel = 'Renda Fixa Pós-Fixada'
                    else if (subtipo === 'pre') categoriaLabel = 'Renda Fixa Pré-Fixada'
                    else if (subtipo === 'ipca') categoriaLabel = 'Renda Fixa IPCA+'
                    else categoriaLabel = 'Renda Fixa'
                    
                    categoriaLabel += isencao === 'isento' ? ' (Isento IR)' : ' (Tributado)'
                    categoriaIcon = '💰'
                  } else {
                    categoriaLabel = TIPO_LABELS[categoriaKey] || categoriaKey
                    categoriaIcon = TIPO_EMOJIS[categoriaKey] || '📊'
                  }
                  
                  return (
                    <React.Fragment key={categoriaKey}>
                      {/* Cabeçalho da categoria */}
                      <tr className="bg-gradient-to-r from-teal-100 to-teal-50 dark:from-teal-900/30 dark:to-teal-950/30 border-y-2 border-teal-300 dark:border-teal-700">
                        <td colSpan={10} className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{categoriaIcon}</span>
                              <span className="font-bold text-lg text-teal-900 dark:text-teal-100">
                                {categoriaLabel}
                              </span>
                              <span className="text-sm text-teal-700 dark:text-teal-300">
                                {grupos.length} {grupos.length === 1 ? 'ativo' : 'ativos'}
                              </span>
                            </div>
                            <div className="font-mono font-bold text-lg text-teal-900 dark:text-teal-100">
                              {formatCurrency(totalCategoria)}
                            </div>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Investimentos da categoria */}
                      {grupos.map((grupo) => {
                        const isExpanded = expandedGroups.has(grupo.codigo)
                        const hasMultiple = grupo.items.length > 1
                        const primeiroItem = grupo.items[0]
                        const temCotacao = ['acao', 'fii', 'etf', 'cripto'].includes(grupo.tipo)
                        
                        return (
                          <React.Fragment key={grupo.codigo}>
                            {/* Linha do grupo (sempre visível) */}
                      <tr 
                        className={`border-b transition-colors ${hasMultiple ? 'cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-950' : 'hover:bg-muted/50'}`}
                        onClick={() => hasMultiple && toggleGroup(grupo.codigo)}
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={grupo.items.every(inv => selectedIds.has(inv.id))}
                            onChange={() => {
                              const allSelected = grupo.items.every(inv => selectedIds.has(inv.id))
                              const newSelected = new Set(selectedIds)
                              grupo.items.forEach(inv => {
                                if (allSelected) {
                                  newSelected.delete(inv.id)
                                } else {
                                  newSelected.add(inv.id)
                                }
                              })
                              setSelectedIds(newSelected)
                            }}
                            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {hasMultiple && (
                              <span className="text-teal-600">
                                {isExpanded ? '▼' : '▶'}
                              </span>
                            )}
                            <span className="text-lg">{TIPO_EMOJIS[grupo.tipo]}</span>
                            <span className="font-mono font-semibold text-teal-600">{grupo.codigo}</span>
                            {hasMultiple && (
                              <span className="text-xs bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded">
                                {grupo.items.length} lastros
                              </span>
                            )}
                            {grupo.hasManual && (
                              <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">✏️ Manual</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-foreground font-medium">{grupo.nome}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{grupo.instituicao || ''}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-100">
                            {TIPO_LABELS[grupo.tipo]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {primeiroItem.tipo === 'renda_fixa' && primeiroItem.data_vencimento ? (
                            <div className="text-sm">
                              <div className="flex items-center gap-1 text-foreground">
                                <span className="font-medium">
                                  {primeiroItem.tipo_rentabilidade === 'pos' && `${primeiroItem.taxa_percentual?.toFixed(2)}% CDI`}
                                  {primeiroItem.tipo_rentabilidade === 'pre' && `${primeiroItem.taxa_percentual?.toFixed(2)}% a.a.`}
                                  {primeiroItem.tipo_rentabilidade === 'ipca' && `IPCA + ${primeiroItem.taxa_percentual?.toFixed(2)}%`}
                                </span>
                              </div>
                              {hasMultiple ? (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Vários vencimentos
                                </div>
                              ) : (
                                <>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Venc: {formatarData(primeiroItem.data_vencimento)}
                                  </div>
                                  {primeiroItem.dias_ate_vencimento !== undefined && (
                                    <div className="text-xs text-muted-foreground">
                                      {primeiroItem.dias_ate_vencimento > 0 
                                        ? `${primeiroItem.dias_ate_vencimento} dias restantes` 
                                        : 'Vencido'}
                                    </div>
                                  )}
                                </>
                              )}
                              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                {primeiroItem.liquidez === 'diaria' && '💧 Liquidez diária'}
                                {primeiroItem.liquidez === 'no_vencimento' && '🔒 Sem liquidez'}
                                {primeiroItem.liquidez?.includes('carencia') && `⏱️ ${primeiroItem.liquidez.replace('_', ' ')}`}
                              </div>
                            </div>
                          ) : temCotacao && primeiroItem.cotacao_atual ? (
                            <div className="text-sm">
                              <div className="text-foreground">
                                {grupo.items.reduce((sum, inv) => sum + inv.quantidade, 0).toFixed(grupo.tipo === 'cripto' ? 8 : 0)} {grupo.tipo === 'cripto' ? 'un' : 'ações'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                @ {formatCurrency(primeiroItem.cotacao_atual)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono text-sm text-muted-foreground">
                            {formatCurrency(grupo.valorInvestido)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-semibold text-foreground">
                            {formatCurrency(grupo.valorBrutoTotal)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-semibold text-foreground">
                            {formatCurrency(grupo.valorTotal)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(() => {
                            const rentabilidade = grupo.valorTotal - grupo.valorInvestido
                            const rentabilidadePerc = grupo.valorInvestido > 0 ? (rentabilidade / grupo.valorInvestido) * 100 : 0
                            return (
                              <>
                                <div className={`font-semibold ${rentabilidadePerc >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {rentabilidadePerc >= 0 ? '+' : ''}{rentabilidadePerc.toFixed(2)}%
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {formatCurrency(rentabilidade)}
                                </div>
                              </>
                            )
                          })()}
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {hasMultiple && (
                              <span className="text-xs text-muted-foreground">
                                Clique para {isExpanded ? 'recolher' : 'expandir'}
                              </span>
                            )}
                            {!hasMultiple && (
                              <>
                                {modoManual && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInvestimento(primeiroItem)
                                      setValorManualTemp(primeiroItem.valor_atual_manual?.toString() || '')
                                      setShowValorManualDialog(true)
                                    }}
                                    className={`h-8 w-8 p-0 ${
                                      primeiroItem.valor_atual_manual && primeiroItem.valor_atual_manual > 0
                                        ? 'bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800'
                                        : 'hover:bg-purple-100 dark:hover:bg-purple-900'
                                    }`}
                                    title="Configurar valor manual"
                                  >
                                    ✏️
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInvestimento(primeiroItem)
                                    setShowEditDialog(true)
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                                  title="Editar investimento"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (confirm(`Deseja realmente excluir ${primeiroItem.codigo}?`)) {
                                      await deletarInvestimento(primeiroItem.id)
                                    }
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900 text-red-600"
                                  title="Excluir"
                                >
                                  🗑️
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Linhas expandidas (lastros individuais) */}
                      {isExpanded && grupo.items.map((inv, idx) => {
                        const temCotacaoItem = ['acao', 'fii', 'etf', 'cripto'].includes(inv.tipo)
                        
                        return (
                          <tr key={inv.id} className="border-b bg-teal-50/30 dark:bg-teal-950/30 hover:bg-teal-50/50 dark:hover:bg-teal-950/50">
                            <td className="py-2 px-4 pl-12" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(inv.id)}
                                onChange={() => toggleSelection(inv.id)}
                                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                              />
                            </td>
                            <td className="py-2 px-4 pl-12">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Lastro #{idx + 1}</span>
                                {inv.valor_atual_manual && inv.valor_atual_manual > 0 && (
                                  <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">✏️</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-4">
                              <div className="text-sm text-muted-foreground">
                                {inv.data_aplicacao ? formatarData(inv.data_aplicacao) : '-'}
                              </div>
                            </td>
                            <td className="py-2 px-4">
                              <span className="text-xs text-muted-foreground">-</span>
                            </td>
                            <td className="py-2 px-4">
                              {inv.tipo === 'renda_fixa' && inv.data_vencimento ? (
                                <div className="text-xs">
                                  <div className="text-muted-foreground">
                                    Venc: {formatarData(inv.data_vencimento)}
                                  </div>
                                  {inv.dias_ate_vencimento !== undefined && (
                                    <div className="text-muted-foreground">
                                      {inv.dias_ate_vencimento > 0 
                                        ? `${inv.dias_ate_vencimento} dias` 
                                        : 'Vencido'}
                                    </div>
                                  )}
                                </div>
                              ) : temCotacaoItem && inv.cotacao_atual ? (
                                <div className="text-xs text-muted-foreground">
                                  {inv.quantidade.toFixed(inv.tipo === 'cripto' ? 8 : 0)} un
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-2 px-4 text-right">
                              <div className="font-mono text-xs text-muted-foreground">
                                {formatCurrency(inv.valor_total)}
                              </div>
                            </td>
                            <td className="py-2 px-4 text-right">
                              <div className="font-mono text-sm text-foreground">
                                {formatCurrency(inv.valor_bruto || inv.valor_atual || 0)}
                              </div>
                            </td>
                            <td className="py-2 px-4 text-right">
                              <div className="font-mono text-sm text-foreground">
                                {formatCurrency(inv.valor_atual || 0)}
                              </div>
                              {inv.tipo === 'renda_fixa' && inv.ir_retido && inv.ir_retido > 0 && (
                                <div className="text-xs text-orange-600 dark:text-orange-400">
                                  IR ({inv.aliquota_ir ? (inv.aliquota_ir * 100).toFixed(1) : '0'}%): -{formatCurrency(inv.ir_retido)}
                                </div>
                              )}
                              {inv.tipo === 'renda_fixa' && inv.isento_ir && (
                                <div className="text-xs text-green-600 dark:text-green-400">
                                  ✓ Isento
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-4 text-right">
                              <div className={`text-sm font-semibold ${inv.rentabilidade_percentual && inv.rentabilidade_percentual >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {inv.rentabilidade_percentual !== undefined 
                                  ? `${inv.rentabilidade_percentual >= 0 ? '+' : ''}${inv.rentabilidade_percentual.toFixed(2)}%`
                                  : '-'
                                }
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {inv.rentabilidade !== undefined ? formatCurrency(inv.rentabilidade) : '-'}
                              </div>
                              {inv.tipo === 'renda_fixa' && inv.dias_aplicado && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {inv.dias_aplicado} dias
                                </div>
                              )}
                              {inv.tipo === 'renda_fixa' && inv.rentabilidade_percentual !== undefined && inv.dias_aplicado && inv.dias_aplicado > 0 && (
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                  {((Math.pow(1 + inv.rentabilidade_percentual / 100, 365 / inv.dias_aplicado) - 1) * 100).toFixed(2)}% a.a.
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                {modoManual && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInvestimento(inv)
                                      setValorManualTemp(inv.valor_atual_manual?.toString() || '')
                                      setShowValorManualDialog(true)
                                    }}
                                    className={`h-7 w-7 p-0 text-xs ${
                                      inv.valor_atual_manual && inv.valor_atual_manual > 0
                                        ? 'bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800'
                                        : 'hover:bg-purple-100 dark:hover:bg-purple-900'
                                    }`}
                                    title="Configurar valor manual"
                                  >
                                    ✏️
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInvestimento(inv)
                                    setShowEditDialog(true)
                                  }}
                                  className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                                  title="Editar"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (confirm(`Deseja realmente excluir este lastro?`)) {
                                      await deletarInvestimento(inv.id)
                                    }
                                  }}
                                  className="h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 text-xs"
                                  title="Excluir"
                                >
                                  🗑️
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">Nenhum investimento encontrado</p>
            <p className="text-muted-foreground/60 text-sm mt-2">Clique em "Nova Aplicação" para começar</p>
          </div>
        )}
      </Card>

      <AddTransactionDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
      <EditInvestmentDialog 
        open={showEditDialog} 
        onClose={() => {
          setShowEditDialog(false)
          setSelectedInvestimento(null)
        }} 
        investimento={selectedInvestimento}
      />
      
      {/* Mini-dialog para valor manual */}
      <Dialog open={showValorManualDialog} onOpenChange={setShowValorManualDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>✏️ Valor Manual - {selectedInvestimento?.codigo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Configure o saldo líquido manualmente. Deixe em branco para usar o cálculo automático.
              </p>
              <Label htmlFor="valorManual">Saldo Líquido (R$)</Label>
              <Input
                id="valorManual"
                type="number"
                step="0.01"
                placeholder="Ex: 1728.69"
                value={valorManualTemp}
                onChange={(e) => setValorManualTemp(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowValorManualDialog(false)
                  setValorManualTemp('')
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (selectedInvestimento) {
                    const { error } = await supabase
                      .from('investimentos')
                      .update({ valor_atual_manual: null })
                      .eq('id', selectedInvestimento.id)
                    
                    if (!error) {
                      setShowValorManualDialog(false)
                      setValorManualTemp('')
                      recarregar()
                    }
                  }
                }}
                className="text-gray-600"
              >
                Remover Valor
              </Button>
              <Button
                onClick={async () => {
                  if (selectedInvestimento) {
                    const valor = parseFloat(valorManualTemp)
                    if (isNaN(valor) || valor <= 0) {
                      alert('Digite um valor válido')
                      return
                    }
                    
                    const { error } = await supabase
                      .from('investimentos')
                      .update({ valor_atual_manual: valor })
                      .eq('id', selectedInvestimento.id)
                    
                    if (!error) {
                      setShowValorManualDialog(false)
                      setValorManualTemp('')
                      recarregar()
                    }
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Modo Manual */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>⚙️ Configurar Modo Manual</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Selecione quais investimentos terão valores inseridos manualmente. 
              Os não selecionados continuarão com cálculo automático.
            </p>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {investimentos.filter(inv => inv.ativo).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!inv.valor_atual_manual && inv.valor_atual_manual > 0}
                    onChange={(e) => {
                      // TODO: Implementar toggle de modo manual por investimento
                      console.log('Toggle manual:', inv.id, e.target.checked)
                    }}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{TIPO_EMOJIS[inv.tipo]}</span>
                      <span className="font-mono font-semibold">{inv.codigo}</span>
                      <span className="text-sm text-muted-foreground">- {inv.nome}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Valor atual (auto): {formatCurrency(inv.valor_atual || 0)}
                    </div>
                  </div>
                </div>
                
                {inv.valor_atual_manual && inv.valor_atual_manual > 0 && (
                  <div className="text-right">
                    <div className="text-sm font-medium text-purple-600">
                      Manual: {formatCurrency(inv.valor_atual_manual)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowManualDialog(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
