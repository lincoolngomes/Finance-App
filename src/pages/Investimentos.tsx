import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInvestments, Investimento } from '@/hooks/useInvestments'
import { formatCurrency } from '@/utils/currency'
import { AddTransactionDialog } from '@/components/investments/AddTransactionDialog'
import { EditInvestmentDialog } from '@/components/investments/EditInvestmentDialog'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Wallet, PlusCircle, Calendar, Building2, ChevronLeft, ChevronRight, Edit } from 'lucide-react'

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

export default function Investimentos() {
  const { investimentos, loading, mesReferencia, setMesReferencia, getResumo } = useInvestments()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedInvestimento, setSelectedInvestimento] = useState<Investimento | null>(null)
  
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
        <h3 className="text-lg font-semibold mb-4 text-foreground">Meus Ativos</h3>
        
        {investimentosFiltrados.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
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
                {investimentosFiltrados.map((inv) => {
                  const temCotacao = ['acao', 'fii', 'etf', 'cripto'].includes(inv.tipo)
                  
                  return (
                    <tr key={inv.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{TIPO_EMOJIS[inv.tipo]}</span>
                          <span className="font-mono font-semibold text-teal-600">{inv.codigo}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-foreground font-medium">{inv.nome}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{inv.instituicao || ''}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-100">
                          {TIPO_LABELS[inv.tipo]}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {inv.tipo === 'renda_fixa' && inv.data_vencimento ? (
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-foreground">
                              <span className="font-medium">
                                {inv.tipo_rentabilidade === 'pos' && `${inv.taxa_percentual?.toFixed(2)}% CDI`}
                                {inv.tipo_rentabilidade === 'pre' && `${inv.taxa_percentual?.toFixed(2)}% a.a.`}
                                {inv.tipo_rentabilidade === 'ipca' && `IPCA + ${inv.taxa_percentual?.toFixed(2)}%`}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Venc: {new Date(inv.data_vencimento).toLocaleDateString('pt-BR')}
                            </div>
                            {inv.dias_ate_vencimento !== undefined && (
                              <div className="text-xs text-muted-foreground">
                                {inv.dias_ate_vencimento > 0 
                                  ? `${inv.dias_ate_vencimento} dias restantes` 
                                  : 'Vencido'}
                              </div>
                            )}
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              {inv.liquidez === 'diaria' && '💧 Liquidez diária'}
                              {inv.liquidez === 'no_vencimento' && '🔒 Sem liquidez'}
                              {inv.liquidez?.includes('carencia') && `⏱️ ${inv.liquidez.replace('_', ' ')}`}
                            </div>
                          </div>
                        ) : temCotacao && inv.cotacao_atual ? (
                          <div className="text-sm">
                            <div className="text-foreground">
                              {inv.quantidade.toFixed(inv.tipo === 'cripto' ? 8 : 0)} {inv.tipo === 'cripto' ? 'un' : 'ações'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              @ {formatCurrency(inv.cotacao_atual)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono text-sm text-muted-foreground">
                          {formatCurrency(inv.valor_total)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-semibold text-foreground">
                          {formatCurrency(inv.valor_bruto || inv.valor_atual || 0)}
                        </div>
                        {inv.tipo === 'renda_fixa' && inv.rentabilidade_projetada && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                            Proj: +{inv.rentabilidade_projetada.toFixed(2)}%
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-semibold text-foreground">
                          {formatCurrency(inv.valor_atual || 0)}
                        </div>
                        {inv.tipo === 'renda_fixa' && inv.ir_retido && inv.ir_retido > 0 && (
                          <div className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                            IR ({inv.aliquota_ir ? (inv.aliquota_ir * 100).toFixed(1) : '0'}%): -{formatCurrency(inv.ir_retido)}
                          </div>
                        )}
                        {inv.tipo === 'renda_fixa' && inv.isento_ir && (
                          <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                            ✓ Isento IR
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className={`font-semibold ${inv.rentabilidade_percentual && inv.rentabilidade_percentual >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {inv.rentabilidade_percentual !== undefined 
                            ? `${inv.rentabilidade_percentual >= 0 ? '+' : ''}${inv.rentabilidade_percentual.toFixed(2)}%`
                            : '-'
                          }
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {inv.rentabilidade !== undefined ? formatCurrency(inv.rentabilidade) : '-'}
                        </div>
                        {inv.tipo === 'renda_fixa' && inv.dias_aplicado && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {inv.dias_aplicado} dias
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedInvestimento(inv)
                            setShowEditDialog(true)
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
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
    </div>
  )
}
