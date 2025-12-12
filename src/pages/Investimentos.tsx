import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInvestments } from '@/hooks/useInvestments'
import { formatCurrency } from '@/utils/currency'
import { AddTransactionDialog } from '@/components/investments/AddTransactionDialog'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Wallet, PlusCircle, Calendar, Building2 } from 'lucide-react'

const COLORS = ['#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']

const TIPO_LABELS: Record<string, string> = {
  acao: 'Ações',
  fii: 'FIIs',
  etf: 'ETFs',
  renda_fixa: 'Renda Fixa',
  cripto: 'Criptomoedas'
}

export default function Investimentos() {
  const { investimentos, loading, mesReferencia, setMesReferencia, getResumo } = useInvestments()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroInstituicao, setFiltroInstituicao] = useState<string>('todas')

  const resumo = getResumo()

  // Filtrar investimentos
  const investimentosFiltrados = investimentos.filter(inv => {
    if (filtroTipo !== 'todos' && inv.tipo !== filtroTipo) return false
    if (filtroInstituicao !== 'todas' && inv.instituicao !== filtroInstituicao) return false
    return inv.ativo && inv.quantidade > 0
  })

  // Instituições únicas
  const instituicoes = Array.from(new Set(investimentos.map(i => i.instituicao).filter(Boolean)))

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Carregando investimentos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Investimentos
            </h1>
            <p className="text-slate-600 mt-1">Controle e acompanhe seus investimentos</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Nova Transação
            </Button>
          </div>
        </div>

        {/* Navegação de Mês */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={mesAnterior}>
              ← Mês Anterior
            </Button>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              <span className="font-semibold text-lg">
                {mesReferencia.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              {!mesAtualSelecionado && (
                <Button variant="link" onClick={mesAtual} className="text-teal-600">
                  (Ir para mês atual)
                </Button>
              )}
            </div>

            <Button 
              variant="outline" 
              onClick={proximoMes}
              disabled={mesAtualSelecionado}
            >
              Próximo Mês →
            </Button>
          </div>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-teal-500 to-teal-600 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-teal-100 text-sm font-medium">Patrimônio Total</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(resumo.valorTotal)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-teal-200" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-cyan-100 text-sm font-medium">Rentabilidade</p>
                <p className="text-3xl font-bold mt-2">
                  {resumo.rentabilidadePercentual >= 0 ? '+' : ''}
                  {resumo.rentabilidadePercentual.toFixed(2)}%
                </p>
                <p className="text-cyan-100 text-sm mt-1">
                  {formatCurrency(resumo.rentabilidadeTotal)}
                </p>
              </div>
              {resumo.rentabilidadePercentual >= 0 ? (
                <TrendingUp className="w-10 h-10 text-cyan-200" />
              ) : (
                <TrendingDown className="w-10 h-10 text-cyan-200" />
              )}
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Ativos</p>
                <p className="text-3xl font-bold mt-2">{resumo.quantidadeAtivos}</p>
                <p className="text-blue-100 text-sm mt-1">
                  {resumo.porTipo.length} {resumo.porTipo.length === 1 ? 'tipo' : 'tipos'}
                </p>
              </div>
              <Wallet className="w-10 h-10 text-blue-200" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Instituições</p>
                <p className="text-3xl font-bold mt-2">{resumo.porInstituicao.length}</p>
                <p className="text-purple-100 text-sm mt-1">Corretoras</p>
              </div>
              <Building2 className="w-10 h-10 text-purple-200" />
            </div>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="acao">Ações</SelectItem>
                  <SelectItem value="fii">FIIs</SelectItem>
                  <SelectItem value="etf">ETFs</SelectItem>
                  <SelectItem value="renda_fixa">Renda Fixa</SelectItem>
                  <SelectItem value="cripto">Criptomoedas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select value={filtroInstituicao} onValueChange={setFiltroInstituicao}>
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
            <h3 className="text-lg font-semibold mb-4 text-teal-900">Diversificação por Tipo</h3>
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
                    label={(entry) => `${TIPO_LABELS[entry.tipo] || entry.tipo}: ${entry.percentual.toFixed(1)}%`}
                  >
                    {resumo.porTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                Nenhum investimento registrado
              </div>
            )}
          </Card>

          {/* Diversificação por Instituição */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-teal-900">Diversificação por Instituição</h3>
            {resumo.porInstituicao.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resumo.porInstituicao}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="instituicao" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="valor" fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                Nenhum investimento registrado
              </div>
            )}
          </Card>
        </div>

        {/* Tabela de Ativos */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-teal-900">Meus Ativos</h3>
          
          {investimentosFiltrados.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-teal-100">
                    <th className="text-left py-3 px-4 font-semibold text-teal-900">Código</th>
                    <th className="text-left py-3 px-4 font-semibold text-teal-900">Nome</th>
                    <th className="text-left py-3 px-4 font-semibold text-teal-900">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold text-teal-900">Instituição</th>
                    <th className="text-right py-3 px-4 font-semibold text-teal-900">Quantidade</th>
                    <th className="text-right py-3 px-4 font-semibold text-teal-900">Preço Médio</th>
                    <th className="text-right py-3 px-4 font-semibold text-teal-900">Cotação Atual</th>
                    <th className="text-right py-3 px-4 font-semibold text-teal-900">Valor Atual</th>
                    <th className="text-right py-3 px-4 font-semibold text-teal-900">Rentabilidade</th>
                  </tr>
                </thead>
                <tbody>
                  {investimentosFiltrados.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-teal-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-teal-600">{inv.codigo}</td>
                      <td className="py-3 px-4">{inv.nome}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                          {TIPO_LABELS[inv.tipo] || inv.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{inv.instituicao || '-'}</td>
                      <td className="py-3 px-4 text-right font-mono">{inv.quantidade.toFixed(8)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(inv.preco_medio)}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {inv.cotacao_atual ? formatCurrency(inv.cotacao_atual) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {formatCurrency(inv.valor_atual || 0)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-semibold ${inv.rentabilidade_percentual && inv.rentabilidade_percentual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {inv.rentabilidade_percentual !== undefined 
                            ? `${inv.rentabilidade_percentual >= 0 ? '+' : ''}${inv.rentabilidade_percentual.toFixed(2)}%`
                            : '-'
                          }
                        </span>
                        <div className="text-xs text-slate-500">
                          {inv.rentabilidade !== undefined ? formatCurrency(inv.rentabilidade) : '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Wallet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">Nenhum investimento encontrado</p>
              <p className="text-slate-400 text-sm mt-2">Clique em "Nova Transação" para começar</p>
            </div>
          )}
        </Card>
      </div>

      <AddTransactionDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
    </div>
  )
}
