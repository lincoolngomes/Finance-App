  // Função utilitária para pegar o valor correto do investimento
  function getValorInvestido(inv: any) {
    return inv.valorInvestido ?? inv.valor_investido ?? inv.valor_aplicado ?? inv.valorAplicado ?? 0;
  }
  function getValorBruto(inv: any) {
    return inv.valorBruto ?? inv.valor_bruto ?? inv.valorAtual ?? inv.valor_atual ?? inv.saldo_bruto ?? 0;
  }
  function getValorLiquido(inv: any) {
    return inv.valorLiquido ?? inv.valor_liquido ?? inv.saldo ?? inv.valorAtual ?? inv.valor_atual ?? inv.saldo_liquido ?? 0;
  }
  function getRentabilidade(inv: any) {
    return inv.rentabilidade ?? inv.rent ?? inv.rendimento ?? null;
  }
  // Função utilitária para identificar renda fixa
  function isRendaFixa(tipo: string) {
    return tipo === 'renda_fixa' || tipo === 'tesouro_direto' || tipo === 'cri' || tipo === 'cra' || tipo === 'debenture';
  }
  // Selecionar/desselecionar todos
  function toggleSelectAll() {
    if (selectedIds.size === investimentosFiltrados.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(investimentosFiltrados.map(inv => inv.id)));
    }
  }

import React, { useState, useMemo, useEffect } from 'react'
import '@/components/ui/table-responsive.css'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInvestments, Investimento } from '@/hooks/useInvestments'
import { formatCurrency } from '@/utils/currency'
import { AddTransactionDialog } from '@/components/investments/AddTransactionDialog'
import { EditInvestmentDialog } from '@/components/investments/EditInvestmentDialog'
import { ResgateDialog } from '@/components/investments/ResgateDialog'
import { ImportB3Dialog } from '@/components/investments/ImportB3Dialog'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Wallet, PlusCircle, Calendar, Building2, ChevronLeft, ChevronRight, Edit, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const COLORS = ['#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#f97316']


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
  previdencia: 'Previdência'
}

const formatarData = (dataString: string) => {
  const [ano, mes, dia] = dataString.split('T')[0].split('-')
  return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia)).toLocaleDateString('pt-BR')
}

export default function Investimentos() {
  const { investimentos, loading, mesReferencia, setMesReferencia, getResumo, deletarInvestimento } = useInvestments()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showResgateDialog, setShowResgateDialog] = useState(false)
  const [showImportB3Dialog, setShowImportB3Dialog] = useState(false)
  const [selectedInvestimento, setSelectedInvestimento] = useState<Investimento | null>(null)
  
  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  
  // Modo manual de saldo
  const [modoManual, setModoManual] = useState(false)
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [showValorManualDialog, setShowValorManualDialog] = useState(false)
  const [valorManualTemp, setValorManualTemp] = useState('')
  

  // Modo de marcação (mercado vs curva)
  const [modoMarcacao, setModoMarcacao] = useState<'curva' | 'mercado'>(() => {
    return (localStorage.getItem('investimentos_modo_marcacao') as 'curva' | 'mercado') || 'curva'
  })

  // Agrupamento e expansão
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Persistir filtros no localStorage
  const [filtroTipo, setFiltroTipo] = useState<string>(() => 'todos');

  // Gerar dados reais para o gráfico de evolução
  const dadosEvolucao = useMemo(() => {
    // Gera os últimos 12 meses
    const meses = [];
    const hoje = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({
        mes: d.toLocaleString('pt-BR', { month: 'short' }),
        ano: d.getFullYear(),
        chave: `${d.getFullYear()}-${d.getMonth() + 1}`
      });
    }
    // Para cada mês, soma o valor dos investimentos ativos naquele mês
    return meses.map(({ mes, ano, chave }) => {
      let saldo = 0;
      investimentos.forEach(inv => {
        // Considera valor_atual, valor_total ou saldo
        // Se o investimento foi aplicado antes do fim do mês, soma
        const dataAplic = new Date(inv.data_aplicacao || inv.data_primeira_compra || inv.dataAplicacao || '1900-01-01');
        const dataVenc = inv.data_vencimento ? new Date(inv.data_vencimento) : null;
        const dataRef = new Date(ano, meses.findIndex(m => m.chave === chave), 28); // fim do mês
        if (dataAplic <= dataRef && (!dataVenc || dataVenc >= dataRef)) {
          saldo += inv.valor_atual || inv.valor_total || inv.saldo || 0;
        }
      });
      return { mes, saldo };
    });
  }, [investimentos]);

  // Filtragem dos investimentos conforme o filtroTipo
  const investimentosFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return investimentos;
    return investimentos.filter(inv => inv.tipo === filtroTipo);
  }, [investimentos, filtroTipo]);

  // Agrupamento dos investimentos filtrados por categoria
  const investimentosFiltradosPorCategoria = useMemo(() => {
    const categorias: Record<string, { categoriaIcon: React.ReactNode, categoriaLabel: string, grupos: any[], totalCategoria: number }> = {};
    investimentosFiltrados.forEach(inv => {
      // Use categoria, tipo ou 'Outros'
      const cat = inv.categoria || inv.tipo || 'Outros';
      if (!categorias[cat]) {
        categorias[cat] = {
          categoriaIcon: '', // Adapte para buscar o ícone correto se necessário
          categoriaLabel: cat,
          grupos: [],
          totalCategoria: 0
        };
      }
      // Agrupar por código (ou outro identificador de grupo)
      let grupo = categorias[cat].grupos.find(g => g.codigo === inv.codigo);
      if (!grupo) {
        grupo = {
          codigo: inv.codigo,
          tipo: inv.tipo,
          items: [],
        };
        categorias[cat].grupos.push(grupo);
      }
      grupo.items.push(inv);
      categorias[cat].totalCategoria += inv.saldo || inv.valorAtual || inv.valorInvestido || 0;
    });
    return Object.values(categorias);
  }, [investimentosFiltrados]);

  return (
    <>
      {/* Cabeçalho e filtros visuais */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 mt-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Meus Ativos</h2>
          <div className="flex gap-2 flex-wrap">
            <Button variant="default" onClick={() => setShowAddDialog(true)}>Nova Aplicação</Button>
            <Button variant="destructive" onClick={() => setShowResgateDialog(true)}>Resgatar</Button>
            <Button variant="secondary" onClick={() => setShowImportB3Dialog(true)}>Importar B3</Button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center justify-end">
          {/* Filtros e controles de visualização (exemplo, ajuste conforme necessário) */}
          <Button size="sm" variant="outline">Auto</Button>
          <Button size="sm" variant="outline">Manual</Button>
          <Button size="sm" variant="outline">Curva</Button>
          <Button size="sm" variant="outline">Mercado</Button>
        </div>
      </div>
      {/* Gráfico de Evolução */}
      <Card className="p-3 sm:p-4 md:p-6 w-full mb-6">
        <div className="mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
            Evolução do Patrimônio
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Últimos 12 meses (saldo no último dia útil)</p>
        </div>
        <div className="h-48 sm:h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dadosEvolucao}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
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
                domain={[
                  (dataMin: number) => Math.floor(dataMin * 0.95 / 1000) * 1000,
                  (dataMax: number) => Math.ceil(dataMax * 1.05 / 1000) * 1000
                ]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))'
                }}
              />
              <Area type="monotone" dataKey="saldo" stroke="#14b8a6" fillOpacity={1} fill="url(#colorSaldo)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      {/* Cards de grupo com badges, valores totais e visual moderno */}
      <div className="space-y-6 max-w-6xl mx-auto px-2 sm:px-4 md:px-0">
        {investimentosFiltradosPorCategoria.map(({ categoriaIcon, categoriaLabel, grupos, totalCategoria }) => (
          <div key={categoriaLabel} className="rounded-lg bg-teal-900/80 dark:bg-teal-950/80 border border-teal-700/60 dark:border-teal-800/60 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-6 py-4 border-b border-teal-700/40">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{categoriaIcon}</span>
                <span className="font-bold text-xl text-white tracking-wide">{categoriaLabel}</span>
                <span className="text-xs px-2 py-1 rounded bg-teal-700/80 text-white font-semibold ml-2">{grupos.length} {grupos.length === 1 ? 'ativo' : 'ativos'}</span>
              </div>
              <div className="font-mono font-bold text-lg text-white">
                <span className="text-lg sm:text-xl font-mono font-bold text-emerald-300">{formatCurrency(totalCategoria)}</span>
              </div>
            </div>
            {/* Grupos de investimentos */}
            <div className="divide-y divide-teal-800/40">
              {grupos.map((grupo) => {
                const isExpanded = expandedGroups.has(grupo.codigo)
                return (
                  <div key={grupo.codigo}>
                    <div
                      className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-teal-800/60 transition-colors"
                      onClick={() => {
                        const newSet = new Set(expandedGroups)
                        if (isExpanded) newSet.delete(grupo.codigo)
                        else newSet.add(grupo.codigo)
                        setExpandedGroups(newSet)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-white tracking-wide">{grupo.codigo}</span>
                        <span className="text-xs px-2 py-1 rounded bg-teal-600/80 text-white font-semibold ml-2">{grupo.items.length} {grupo.items.length === 1 ? 'ativo' : 'ativos'}</span>
                        <span className="text-xs px-2 py-1 rounded bg-teal-400/20 text-teal-100 border border-teal-500/40 ml-2">{TIPO_LABELS[grupo.tipo] || grupo.tipo}</span>
                      </div>
                      <div className="font-mono font-bold text-base text-white">
                        <span className="text-base sm:text-lg font-mono font-bold text-emerald-200">{formatCurrency(grupo.items.reduce((acc, inv) => acc + (inv.saldo || inv.valorAtual || inv.valorInvestido || 0), 0))}</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="bg-teal-950/60 overflow-x-auto">
                        <table className="w-full min-w-[900px] text-xs sm:text-sm">
                          <thead>
                            <tr className="border-b border-teal-800/40">
                              <th className="text-left py-2 px-2 text-teal-200">Código</th>
                              <th className="text-left py-2 px-2 text-teal-200">Nome</th>
                              <th className="text-left py-2 px-2 text-teal-200">Tipo</th>
                              <th className="text-left py-2 px-2 text-teal-200">Detalhes</th>
                              <th className="text-right py-2 px-2 text-teal-200">Investido</th>
                              <th className="text-right py-2 px-2 text-teal-200">Valor Bruto</th>
                              <th className="text-right py-2 px-2 text-teal-200">Valor Líquido</th>
                              <th className="text-right py-2 px-2 text-teal-200">Rentabilidade</th>
                              <th className="text-center py-2 px-2 text-teal-200">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.items.map((inv) => (
                              <tr key={inv.id} className="border-b border-teal-800/40 hover:bg-teal-900/40">
                                <td className="py-2 px-2 font-mono text-xs text-white">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span>{inv.codigo}</span>
                                    {/* Badge de lastros, se houver */}
                                    {inv.lastros && (
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-teal-700/80 text-white border border-teal-400/40 whitespace-nowrap">{inv.lastros} lastros</span>
                                    )}
                                    {/* Badge de curva/mercado */}
                                    {inv.marcacao && (
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-800/80 text-emerald-200 border border-emerald-400/40 whitespace-nowrap">{inv.marcacao === 'curva' ? 'Curva' : 'Mercado'}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-white">
                                  <div className="flex flex-col gap-1 min-w-[120px]">
                                    <span>{inv.nome}</span>
                                    {/* Sub-infos: banco/corretora, indexador, etc */}
                                    <span className="text-xs text-teal-300">{inv.instituicao || inv.banco || inv.corretora || ''}</span>
                                    {inv.indexador && (
                                      <span className="text-xs text-cyan-300">{inv.indexador}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-xs text-white">
                                  <div className="flex flex-col gap-1 min-w-[100px]">
                                    <span>{TIPO_LABELS[inv.tipo] || inv.tipo}</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {/* Badge de tipo de renda fixa */}
                                      {['renda_fixa', 'tesouro_direto', 'lci', 'lca', 'cdb', 'cri', 'cra', 'debenture'].includes(inv.tipo) && inv.tipo_renda_fixa && (
                                        inv.tipo_renda_fixa === 'pos' && <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/80 text-cyan-200 border border-cyan-400/40 whitespace-nowrap">RF Pós-fixada</span>
                                      )}
                                      {['renda_fixa', 'tesouro_direto', 'lci', 'lca', 'cdb', 'cri', 'cra', 'debenture'].includes(inv.tipo) && inv.tipo_renda_fixa && (
                                        inv.tipo_renda_fixa === 'pre' && <span className="text-[10px] px-2 py-0.5 rounded bg-pink-900/80 text-pink-200 border border-pink-400/40 whitespace-nowrap">RF Prefixada</span>
                                      )}
                                      {['renda_fixa', 'tesouro_direto', 'lci', 'lca', 'cdb', 'cri', 'cra', 'debenture'].includes(inv.tipo) && inv.tipo_renda_fixa && (
                                        inv.tipo_renda_fixa === 'inflacao' && <span className="text-[10px] px-2 py-0.5 rounded bg-orange-900/80 text-orange-200 border border-orange-400/40 whitespace-nowrap">Inflação</span>
                                      )}
                                      {/* Badges de tributação, isenção, etc */}
                                      {inv.tributavel && <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-800/80 text-yellow-200 border border-yellow-400/40 whitespace-nowrap">Tributável</span>}
                                      {inv.isento_ir && <span className="text-[10px] px-2 py-0.5 rounded bg-green-800/80 text-green-200 border border-green-400/40 whitespace-nowrap">Isento IR</span>}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-xs text-white">
                                  <div className="flex flex-col gap-1 min-w-[120px]">
                                    <span>{inv.detalhes || '-'}</span>
                                    {/* Detalhes extras: vencimento, liquidez, etc */}
                                    {inv.vencimento && <span className="text-[10px] text-cyan-200 whitespace-nowrap">Venc: {inv.vencimento}</span>}
                                    {inv.liquidez && <span className="text-[10px] text-cyan-200 whitespace-nowrap">Liquidez: {inv.liquidez}</span>}
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-right text-white min-w-[100px]">{formatCurrency(getValorInvestido(inv))}</td>
                                <td className="py-2 px-2 text-right text-white min-w-[100px]">{formatCurrency(getValorBruto(inv))}</td>
                                <td className="py-2 px-2 text-right text-white min-w-[100px]">{formatCurrency(getValorLiquido(inv))}</td>
                                <td className="py-2 px-2 text-right text-white min-w-[90px]">
                                  <div className="flex flex-col gap-1 items-end">
                                    <span>{getRentabilidade(inv) != null ? `${Number(getRentabilidade(inv)).toFixed(2)}%` : '-'}</span>
                                    {/* Rentabilidade extra, valor absoluto */}
                                    {inv.rentabilidade_valor && <span className="text-[10px] text-emerald-300">R$ {formatCurrency(inv.rentabilidade_valor)}</span>}
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-center min-w-[60px]">
                                  <div className="flex gap-1 justify-center">
                                    <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setSelectedInvestimento(inv); setShowEditDialog(true); }}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    {/* Outros botões de ação, se necessário */}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <AddTransactionDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
      <ResgateDialog open={showResgateDialog} onClose={() => setShowResgateDialog(false)} />
      <EditInvestmentDialog open={showEditDialog} investimento={selectedInvestimento} onClose={() => setShowEditDialog(false)} />
      <ImportB3Dialog open={showImportB3Dialog} onClose={() => setShowImportB3Dialog(false)} />
    </>
  );
}
