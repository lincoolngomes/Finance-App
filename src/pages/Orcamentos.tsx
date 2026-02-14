import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/utils/currency'
import { Plus, Trash2, TrendingUp, TrendingDown, Target, DollarSign, Copy, Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Progress } from '@/components/ui/progress'
import { calcularMesFatura, parseToDateUTC } from '@/utils/dateParser'

type OrdenacaoColuna = 'categoria' | 'tipo' | 'planejado' | 'realizado' | 'diferenca' | 'progresso' | 'status'
type OrdenacaoDirecao = 'asc' | 'desc'

interface OrdenacaoItem {
  coluna: OrdenacaoColuna
  direcao: OrdenacaoDirecao
}

interface Categoria {
  id: string
  nome: string
  tipo?: 'receita' | 'despesa'
}

interface OrcamentoCategoria {
  id: string
  user_id: string
  categoria_id: string
  valor: number
  mes: number
  ano: number
  categorias?: Categoria
}

interface TransacaoRealizada {
  categoria_id: string
  total: number
}

interface MesAnoRef {
  month: number
  year: number
}

export default function Orcamentos() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [orcamentos, setOrcamentos] = useState<OrcamentoCategoria[]>([])
  const [transacoesRealizadas, setTransacoesRealizadas] = useState<TransacaoRealizada[]>([])
  
  const currentDate = new Date()
  const [mesSelecionado, setMesSelecionado] = useState(currentDate.getMonth())
  const [anoSelecionado, setAnoSelecionado] = useState(currentDate.getFullYear())
  
  const [modalOpen, setModalOpen] = useState(false)
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('')
  const [valorPlanejado, setValorPlanejado] = useState('')
  const [orcamentoEditando, setOrcamentoEditando] = useState<string | null>(null)
  const [modalTransacoesOpen, setModalTransacoesOpen] = useState(false)
  const [transacoesCategoria, setTransacoesCategoria] = useState<any[]>([])
  const [categoriaNomeModal, setCategoriaNomeModal] = useState('')
  const [receitasCategoria, setReceitasCategoria] = useState<any[]>([])
  const [despesasCategoria, setDespesasCategoria] = useState<any[]>([])
  const [ordenacoes, setOrdenacoes] = useState<OrdenacaoItem[]>([])
  const [valoresEditandoTabela, setValoresEditandoTabela] = useState<{ [key: string]: string }>({})

  const getMesAnoReferenciaOrcamento = (t: any, cartaoFechamentoMap: Map<string, number>): MesAnoRef | null => {
    // Transações de cartão: priorizar mês/ano da fatura (vencimento)
    if (t.cartao_id) {
      const faturaMes = Number(t.fatura_mes)
      const faturaAno = Number(t.fatura_ano)
      if (!Number.isNaN(faturaMes) && !Number.isNaN(faturaAno) && faturaMes >= 1 && faturaMes <= 12) {
        return { month: faturaMes - 1, year: faturaAno }
      }

      // Fallback legado: observação "Fatura MM/YYYY"
      const obs = String(t.observacao || '')
      const obsMatch = obs.match(/Fatura\s+(\d{1,2})\/(\d{4})/i)
      if (obsMatch) {
        const m = Number(obsMatch[1])
        const y = Number(obsMatch[2])
        if (!Number.isNaN(m) && !Number.isNaN(y) && m >= 1 && m <= 12) {
          return { month: m - 1, year: y }
        }
      }

      // Último fallback: calcular por data da compra + dia de fechamento
      const dt = parseToDateUTC(t.data || t.created_at)
      if (!dt) return null
      const diaFechamento = cartaoFechamentoMap.get(t.cartao_id) ?? 1
      const { fatura_mes, fatura_ano } = calcularMesFatura(dt, diaFechamento)
      return { month: fatura_mes - 1, year: fatura_ano }
    }

    // Transações de conta: mês/ano da data da transação
    const dt = parseToDateUTC(t.data || t.created_at)
    if (!dt) return null
    return { month: dt.getUTCMonth(), year: dt.getUTCFullYear() }
  }

  const handleOrdenar = (coluna: OrdenacaoColuna) => {
    setOrdenacoes(prev => {
      const novasOrdenacoes = [...prev]
      const indexExistente = novasOrdenacoes.findIndex(o => o.coluna === coluna)
      
      if (indexExistente !== -1) {
        // Se já existe, inverte a direção ou remove se era desc
        if (novasOrdenacoes[indexExistente].direcao === 'asc') {
          novasOrdenacoes[indexExistente].direcao = 'desc'
        } else {
          novasOrdenacoes.splice(indexExistente, 1)
        }
      } else {
        // Se não existe, adiciona novo (máximo 3)
        if (novasOrdenacoes.length < 3) {
          novasOrdenacoes.push({ coluna, direcao: 'asc' })
        }
      }
      return novasOrdenacoes
    })
  }

  const resetarOrdenacao = () => {
    setOrdenacoes([])
  }

  useEffect(() => {
    if (user) {
      carregarDados()
    }
  }, [user, mesSelecionado, anoSelecionado])

  const carregarDados = async () => {
    setLoading(true)
    try {
      await Promise.all([
        carregarCategorias(),
        carregarOrcamentos(),
        carregarTransacoesRealizadas()
      ])
    } finally {
      setLoading(false)
    }
  }

  const carregarCategorias = async () => {
    const { data, error } = await supabase
      .from('categorias')
      .select('id, nome, tipo')
      .eq('user_id', user?.id)
      .order('nome')

    if (!error && data) {
      // Remover duplicatas (manter apenas a primeira ocorrência de cada nome)
      const categoriasUnicas = data.reduce((acc: any[], cat) => {
        if (!acc.find(c => c.nome === cat.nome)) {
          acc.push(cat)
        }
        return acc
      }, [])
      setCategorias(categoriasUnicas)
    }
  }

  const carregarOrcamentos = async () => {
    const { data, error } = await supabase
      .from('orcamentos')
      .select(`
        *,
        categorias (
          id,
          nome
        )
      `)
      .eq('user_id', user?.id)
      .eq('mes', mesSelecionado)
      .eq('ano', anoSelecionado)
    
    if (!error && data) {
      setOrcamentos(data)
    }
  }

  const carregarTransacoesRealizadas = async () => {
    // Buscar cartões para enriquecer transações sem fatura_mes/fatura_ano
    const { data: cartoesData } = await supabase
      .from('cartoes')
      .select('id, dia_fechamento')
      .eq('user_id', user?.id)

    const { data, error } = await supabase
      .from('transacoes')
      .select('categoria_id, valor, data, created_at, tipo, cartao_id, fatura_mes, fatura_ano, observacao')
      .eq('user_id', user?.id)

    console.log('🔍 DEBUG Orcamentos:', {
      user_id: user?.id,
      mes_selecionado: mesSelecionado,
      ano_selecionado: anoSelecionado,
      transacoes_count: data?.length,
      error: error?.message
    })

    if (!error && data) {
      const cartaoFechamentoMap = new Map<string, number>()
      ;(cartoesData || []).forEach((c: any) => {
        const dia = Number(c.dia_fechamento || 1)
        cartaoFechamentoMap.set(c.id, Number.isNaN(dia) ? 1 : dia)
      })

      // Filtrar transações do mês/ano selecionado.
      // Para cartão de crédito, sempre usa o mês/ano de vencimento da fatura.
      const transacoesFiltradas = data.filter(t => {
        const tm = getMesAnoReferenciaOrcamento(t as any, cartaoFechamentoMap)
        if (!tm) return false
        const dentroDoMes = tm.month === mesSelecionado && tm.year === anoSelecionado
        
        if (dentroDoMes) {
          console.log('✅ Transação dentro do mês:', {
            categoria: t.categoria_id,
            valor: t.valor,
            tipo: t.tipo,
            valorNumber: Number(t.valor),
            data: t.data || t.created_at,
            cartao_id: (t as any).cartao_id,
            fatura_mes: (t as any).fatura_mes,
            fatura_ano: (t as any).fatura_ano,
            mes: tm.month,
            ano: tm.year
          })
        }
        
        return dentroDoMes
      })

      console.log(`📊 ${transacoesFiltradas.length} transações filtradas para ${mesSelecionado}/${anoSelecionado}`)

      // Agrupar por categoria (inverter sinal se for despesa e valor positivo)
      const agrupado = transacoesFiltradas.reduce((acc: Record<string, TransacaoRealizada>, t) => {
        const catId = t.categoria_id
        if (!acc[catId]) {
          acc[catId] = { categoria_id: catId, total: 0 }
        }
        // Se for despesa e valor positivo, inverter sinal (tornar negativo)
        // Se já for negativo, manter como está
        const valorOriginal = Number(t.valor) || 0
        const valorComSinal = (t.tipo === 'despesa' && valorOriginal > 0) ? -valorOriginal : valorOriginal
        console.log(`➕ Somando categoria ${catId}: ${acc[catId].total} + ${valorComSinal} (tipo: ${t.tipo}, valor original: ${valorOriginal}) = ${acc[catId].total + valorComSinal}`)
        acc[catId].total += valorComSinal
        return acc
      }, {} as Record<string, TransacaoRealizada>)

      const resultado = Object.values(agrupado)
      console.log('💰 Totais por categoria:', resultado)
      
      setTransacoesRealizadas(resultado)
    } else {
      console.error('❌ Erro ao carregar transações:', error)
    }
  }

  const adicionarOrcamento = async () => {
    if (!categoriaSelecionada || !valorPlanejado) {
      toast({
        title: "Erro",
        description: "Selecione uma categoria e informe o valor planejado",
        variant: "destructive"
      })
      return
    }

    // Converter valor formatado (1.000,00) para número
    const valorNumerico = parseFloat(valorPlanejado.replace(/\./g, '').replace(',', '.'))
    
    console.log('📝 Dados para salvar:', {
      user_id: user?.id,
      categoria_id: categoriaSelecionada,
      valor: valorNumerico,
      mes: mesSelecionado,
      ano: anoSelecionado,
      orcamentoEditando
    })

    if (orcamentoEditando) {
      // Atualizar orçamento existente (todas as duplicatas da mesma categoria/mês/ano)
      const { error } = await supabase
        .from('orcamentos')
        .update({
          valor: valorNumerico
        })
        .eq('user_id', user?.id)
        .eq('mes', mesSelecionado)
        .eq('ano', anoSelecionado)
        .eq('categoria_id', categoriaSelecionada)

      console.log('❌ Erro ao atualizar:', error)

      if (error) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao atualizar orçamento",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Sucesso",
          description: "Orçamento atualizado com sucesso"
        })
        setModalOpen(false)
        setCategoriaSelecionada('')
        setValorPlanejado('')
        setOrcamentoEditando(null)
        carregarOrcamentos()
      }
    } else {
      // Verificar se já existe orçamento para esta categoria
      const existe = orcamentos.find(o => o.categoria_id === categoriaSelecionada)
      
      if (existe) {
        // Se já existe, atualizar em vez de inserir (todas as duplicatas da mesma categoria/mês/ano)
        const { error } = await supabase
          .from('orcamentos')
          .update({
            valor: valorNumerico
          })
          .eq('user_id', user?.id)
          .eq('mes', mesSelecionado)
          .eq('ano', anoSelecionado)
          .eq('categoria_id', categoriaSelecionada)

        console.log('❌ Erro ao atualizar existente:', error)

        if (error) {
          toast({
            title: "Erro",
            description: error.message || "Erro ao atualizar orçamento",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Sucesso",
            description: "Orçamento atualizado com sucesso"
          })
          setModalOpen(false)
          setCategoriaSelecionada('')
          setValorPlanejado('')
          carregarOrcamentos()
        }
        return
      }

      const { error } = await supabase
        .from('orcamentos')
        .insert({
          user_id: user?.id,
          categoria_id: categoriaSelecionada,
          valor: valorNumerico,
          mes: mesSelecionado,
          ano: anoSelecionado
        })

      console.log('❌ Erro ao inserir:', error)

      if (error) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao adicionar orçamento",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Sucesso",
          description: "Orçamento adicionado com sucesso"
        })
        setModalOpen(false)
        setCategoriaSelecionada('')
        setValorPlanejado('')
        carregarOrcamentos()
      }
    }
  }

  const atualizarOrcamento = async (categoriaId: string, valor: number) => {
    if (isNaN(valor) || valor < 0) return

    try {
      // SEMPRE deletar TODOS os registros existentes para esta categoria/mês/ano
      // Isso evita duplicatas quando há múltiplos registros ou quando apenas um existe
      const { error: errorDelete } = await supabase
        .from('orcamentos')
        .delete()
        .eq('user_id', user?.id)
        .eq('categoria_id', categoriaId)
        .eq('mes', mesSelecionado)
        .eq('ano', anoSelecionado)

      if (errorDelete) {
        console.error('❌ Erro ao deletar orçamentos antigos:', errorDelete)
        return
      }

      // Agora inserir um novo registro com o valor atualizado
      const { error: errorInsert } = await supabase
        .from('orcamentos')
        .insert({
          user_id: user?.id,
          categoria_id: categoriaId,
          valor: valor,
          mes: mesSelecionado,
          ano: anoSelecionado
        })

      if (errorInsert) {
        console.error('❌ Erro ao inserir novo orçamento:', errorInsert)
        toast({
          title: "Erro",
          description: "Erro ao atualizar orçamento",
          variant: "destructive"
        })
        return
      }

      // Sucesso - recarregar orçamentos
      carregarOrcamentos()
    } catch (error) {
      console.error('❌ Erro ao atualizar orçamento:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar orçamento",
        variant: "destructive"
      })
    }
  }

  const editarOrcamento = (orc: OrcamentoCategoria) => {
    setOrcamentoEditando(orc.id)
    setCategoriaSelecionada(orc.categoria_id)
    // Formatar valor para exibição (1.000,00)
    const valorFormatado = orc.valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    setValorPlanejado(valorFormatado)
    setModalOpen(true)
  }

  const removerOrcamento = async (categoriaId: string) => {
    const { error } = await supabase
      .from('orcamentos')
      .delete()
      .eq('user_id', user?.id)
      .eq('mes', mesSelecionado)
      .eq('ano', anoSelecionado)
      .eq('categoria_id', categoriaId)

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover orçamento",
        variant: "destructive"
      })
    } else {
      toast({
        title: "Sucesso",
        description: "Orçamento removido com sucesso"
      })
      carregarOrcamentos()
    }
  }

  const duplicarMesAnterior = async () => {
    // Calcular mês anterior
    let mesAnterior = mesSelecionado - 1
    let anoAnterior = anoSelecionado
    
    if (mesAnterior < 0) {
      mesAnterior = 11
      anoAnterior -= 1
    }

    // Buscar orçamentos do mês anterior
    const { data: orcamentosAnteriores, error: errorBusca } = await supabase
      .from('orcamentos')
      .select(`
        categoria_id,
        valor,
        categorias!inner(tipo)
      `)
      .eq('user_id', user?.id)
      .eq('mes', mesAnterior)
      .eq('ano', anoAnterior)

    if (errorBusca || !orcamentosAnteriores || orcamentosAnteriores.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há orçamentos no mês anterior para duplicar",
        variant: "destructive"
      })
      return
    }

    // Verificar se já existem orçamentos no mês atual
    if (orcamentos.length > 0) {
      const confirmar = confirm(`Já existem ${orcamentos.length} categoria(s) no orçamento atual. Deseja substituir?`)
      if (!confirmar) return

      // Remover orçamentos existentes
      const { error: errorDelete } = await supabase
        .from('orcamentos')
        .delete()
        .eq('user_id', user?.id)
        .eq('mes', mesSelecionado)
        .eq('ano', anoSelecionado)

      if (errorDelete) {
        toast({
          title: "Erro",
          description: "Erro ao remover orçamentos existentes",
          variant: "destructive"
        })
        return
      }
    }

    // Deduplicar por categoria antes de inserir
    const mapaPorCategoria = new Map<string, { categoria_id: string; valor: number }>()
    for (const orc of orcamentosAnteriores) {
      mapaPorCategoria.set(orc.categoria_id, {
        categoria_id: orc.categoria_id,
        valor: orc.valor
      })
    }

    const novosOrcamentos = Array.from(mapaPorCategoria.values()).map(orc => ({
      user_id: user?.id,
      categoria_id: orc.categoria_id,
      valor: orc.valor,
      mes: mesSelecionado,
      ano: anoSelecionado
    }))

    const { error: errorInsert } = await supabase
      .from('orcamentos')
      .insert(novosOrcamentos)

    if (errorInsert) {
      toast({
        title: "Erro",
        description: "Erro ao duplicar orçamentos",
        variant: "destructive"
      })
    } else {
      toast({
        title: "Sucesso",
        description: `${novosOrcamentos.length} categoria(s) duplicada(s) com sucesso`
      })
      carregarOrcamentos()
    }
  }

  const calculos = useMemo(() => {
    // Separar despesas e receitas do orçamento planejado
    const despesasOrçadas = orcamentos
      .filter(o => {
        const categoria = categorias.find(c => c.id === o.categoria_id)
        return categoria?.tipo === 'despesa'
      })
      .reduce((sum, o) => sum + (o.valor || 0), 0)

    const receitasOrçadas = orcamentos
      .filter(o => {
        const categoria = categorias.find(c => c.id === o.categoria_id)
        return categoria?.tipo === 'receita'
      })
      .reduce((sum, o) => sum + (o.valor || 0), 0)

    // Separar despesas e receitas realizadas
    const despesasRealizadas = transacoesRealizadas
      .filter(t => t.total < 0)
      .reduce((sum, t) => sum + Math.abs(t.total), 0)

    const receitasRealizadas = transacoesRealizadas
      .filter(t => t.total > 0)
      .reduce((sum, t) => sum + t.total, 0)

    return {
      despesasOrçadas,
      receitasOrçadas,
      despesasRealizadas,
      receitasRealizadas,
      percentualDespesas: despesasOrçadas > 0 ? (despesasRealizadas / despesasOrçadas) * 100 : 0,
      percentualReceitas: receitasOrçadas > 0 ? (receitasRealizadas / receitasOrçadas) * 100 : 0
    }
  }, [orcamentos, transacoesRealizadas, categorias])

  // Função auxiliar para obter valor realizado de uma categoria
  const getValorRealizado = (categoriaId: string) => {
    const transacao = transacoesRealizadas.find(t => t.categoria_id === categoriaId)
    return transacao?.total || 0
  }

  // Criar lista completa: orçamentos definidos + categorias com gastos
  const linhasTabela = useMemo(() => {
    const categoriasMap = new Map()

    // Adicionar todas as categorias do orçamento
    orcamentos.forEach(orc => {
      const categoria = categorias.find(c => c.id === orc.categoria_id)
      categoriasMap.set(orc.categoria_id, {
        id: orc.id,
        categoria_id: orc.categoria_id,
        categoria_nome: orc.categorias?.nome || 'Categoria',
        valor: orc.valor,
        tipo: categoria?.tipo || null,
        tem_orcamento: true
      })
    })

    // Adicionar categorias com gastos (mesmo sem orçamento)
    transacoesRealizadas.forEach(trans => {
      if (!categoriasMap.has(trans.categoria_id)) {
        // Buscar nome da categoria
        const categoria = categorias.find(c => c.id === trans.categoria_id)
        categoriasMap.set(trans.categoria_id, {
          id: null,
          categoria_id: trans.categoria_id,
          categoria_nome: categoria?.nome || 'Categoria',
          valor: 0,
          tipo: categoria?.tipo || null,
          tem_orcamento: false
        })
      }
    })

    const resultado = Array.from(categoriasMap.values())
    console.log('📋 Linhas da tabela:', resultado)
    
    // Função para extrair valor de ordenação
    const extrairValor = (linha: any, coluna: OrdenacaoColuna): any => {
      switch (coluna) {
        case 'categoria':
          return linha.categoria_nome.toLowerCase()
        case 'tipo':
          return linha.tipo || ''
        case 'planejado':
          return linha.valor
        case 'realizado':
          return Math.abs(getValorRealizado(linha.categoria_id))
        case 'diferenca':
          return linha.valor - Math.abs(getValorRealizado(linha.categoria_id))
        case 'progresso':
          return linha.valor > 0 ? (Math.abs(getValorRealizado(linha.categoria_id)) / linha.valor) * 100 : 0
        case 'status':
          const getStatus = (l: any) => {
            if (l.valor === 0) return 0
            const perc = (Math.abs(getValorRealizado(l.categoria_id)) / l.valor) * 100
            if (perc <= 80) return 1
            if (perc <= 100) return 2
            return 3
          }
          return getStatus(linha)
        default:
          return 0
      }
    }
    
    // Aplicar múltiplas ordenações
    if (ordenacoes.length > 0) {
      resultado.sort((a, b) => {
        for (const ord of ordenacoes) {
          const valorA = extrairValor(a, ord.coluna)
          const valorB = extrairValor(b, ord.coluna)
          
          if (valorA < valorB) return ord.direcao === 'asc' ? -1 : 1
          if (valorA > valorB) return ord.direcao === 'asc' ? 1 : -1
        }
        return 0
      })
    }
    
    return resultado
  }, [orcamentos, transacoesRealizadas, categorias, ordenacoes, getValorRealizado])

  const visualizarTransacoesCategoria = async (categoriaId: string, categoriaNome: string) => {
    console.log('👁️ Visualizar transações - Categoria:', categoriaNome, 'ID:', categoriaId)
    try {
      const [{ data: cartoesData }, { data: contasData }, { data, error }] = await Promise.all([
        supabase
          .from('cartoes')
          .select('id, nome, dia_fechamento')
          .eq('user_id', user?.id),
        supabase
          .from('accounts')
          .select('id, nome')
          .eq('user_id', user?.id),
        supabase
          .from('transacoes')
          .select('id, data, created_at, descricao, observacao, valor, pago, categoria_id, conta_id, cartao_id, fatura_mes, fatura_ano, tipo')
          .eq('user_id', user?.id)
          .eq('categoria_id', categoriaId)
          .order('data', { ascending: false })
      ])

      console.log('📦 Dados recebidos:', data?.length, 'transações')
      if (error) {
        console.error('❌ Erro na query:', error)
        throw error
      }

      const cartaoFechamentoMap = new Map<string, number>()
      ;(cartoesData || []).forEach((c: any) => {
        const dia = Number(c.dia_fechamento || 1)
        cartaoFechamentoMap.set(c.id, Number.isNaN(dia) ? 1 : dia)
      })

      // Filtrar pelo mês e ano selecionados
      const transacoesFiltradas = (data || []).filter(t => {
        const tm = getMesAnoReferenciaOrcamento(t as any, cartaoFechamentoMap)
        if (!tm) return false
        return tm.month === mesSelecionado && tm.year === anoSelecionado
      })

      const contasMap = new Map((contasData || []).map((c: any) => [c.id, c.nome || 'Conta']))
      const cartoesMap = new Map((cartoesData || []).map((c: any) => [c.id, c.nome || 'Cartão']))
      const transacoesComOrigem = transacoesFiltradas.map((t: any) => ({
        ...t,
        status: t.status || (t.pago === true ? 'pago' : (t.cartao_id ? 'pendente_fatura' : 'pendente')),
        origemTipo: t.cartao_id ? 'cartao' : 'conta',
        origemNome: t.cartao_id ? (cartoesMap.get(t.cartao_id) || 'Cartão') : (contasMap.get(t.conta_id) || 'Conta')
      }))

      // Separar receitas (valor > 0) e despesas (valor < 0)
      const receitas = transacoesComOrigem.filter(t => t.valor > 0)
      const despesas = transacoesComOrigem.filter(t => t.valor < 0)

      console.log('🔍 Total transações:', transacoesComOrigem.length)
      console.log('💰 Receitas:', receitas.length, receitas)
      console.log('💸 Despesas:', despesas.length, despesas)

      setTransacoesCategoria(transacoesComOrigem)
      setReceitasCategoria(receitas)
      setDespesasCategoria(despesas)
      setCategoriaNomeModal(categoriaNome)
      setModalTransacoesOpen(true)
    } catch (error) {
      console.error('Erro ao carregar transações:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as transações",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Função auxiliar para renderizar header de coluna com indicador de ordenação
  const renderHeaderColuna = (coluna: OrdenacaoColuna, label: string, className: string = '') => {
    const indexOrdenacao = ordenacoes.findIndex(o => o.coluna === coluna)
    const temOrdenacao = indexOrdenacao !== -1
    const direcaoOrdenacao = temOrdenacao ? ordenacoes[indexOrdenacao].direcao : null
    
    return (
      <Button 
        variant="ghost" 
        onClick={() => handleOrdenar(coluna)}
        className={`h-8 px-2 flex items-center gap-1 hover:bg-transparent ${className}`}
      >
        <span className="flex items-center gap-1">
          {label}
          {temOrdenacao && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-primary text-primary-foreground rounded-full">
              {indexOrdenacao + 1}
            </span>
          )}
        </span>
        {direcaoOrdenacao === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : direcaoOrdenacao === 'desc' ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </Button>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamento Mensal</h1>
          <p className="text-muted-foreground">
            Acompanhe seu planejamento financeiro e compare com a realização
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          <Select value={mesSelecionado.toString()} onValueChange={(v) => setMesSelecionado(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {new Date(0, i).toLocaleDateString('pt-BR', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={anoSelecionado.toString()} onValueChange={(v) => setAnoSelecionado(parseInt(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = currentDate.getFullYear() - 2 + i
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={duplicarMesAnterior}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar Mês Anterior
          </Button>

          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {orcamentoEditando ? 'Editar Orçamento' : 'Adicionar Categoria ao Orçamento'}
                </DialogTitle>
                <DialogDescription>
                  {orcamentoEditando 
                    ? 'Altere o valor planejado para esta categoria'
                    : 'Selecione uma categoria e defina o valor planejado para o mês'
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Selecione uma categoria</Label>
                  <Select 
                    value={categoriaSelecionada} 
                    onValueChange={setCategoriaSelecionada}
                    disabled={!!orcamentoEditando}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {orcamentoEditando ? (
                        categorias
                          .filter(c => c.id === categoriaSelecionada)
                          .map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome}
                              {c.tipo && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({c.tipo === 'receita' ? '💰 Receita' : '📊 Despesa'})
                                </span>
                              )}
                            </SelectItem>
                          ))
                      ) : (
                        categorias.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-2">
                              {c.nome}
                              {c.tipo && (
                                <span className="text-xs text-muted-foreground">
                                  ({c.tipo === 'receita' ? '💰 Receita' : '📊 Despesa'})
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Valor Planejado</Label>
                  <Input
                    type="text"
                    placeholder="1.000,00"
                    value={valorPlanejado}
                    onChange={(e) => {
                      let valor = e.target.value.replace(/\D/g, '') // Remove tudo que não é dígito
                      
                      if (valor === '') {
                        setValorPlanejado('')
                        return
                      }
                      
                      // Converte para número e formata
                      const numero = parseInt(valor) / 100
                      
                      // Formata com separador de milhares e decimais
                      const formatado = numero.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })
                      
                      setValorPlanejado(formatado)
                    }}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setModalOpen(false)
                      setOrcamentoEditando(null)
                      setCategoriaSelecionada('')
                      setValorPlanejado('')
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={adicionarOrcamento}>
                    {orcamentoEditando ? 'Atualizar' : 'Adicionar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-4 mb-8">
        {/* Despesa Planejada */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Despesa Planejada</p>
                <p className="text-2xl font-bold text-red-500 mt-2">{formatCurrency(calculos.despesasOrçadas)}</p>
              </div>
              <TrendingDown className="h-5 w-5 text-red-500/40" />
            </div>
          </CardContent>
        </Card>

        {/* Despesa Realizada */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Despesa Realizada</p>
                <p className="text-2xl font-bold text-red-400 mt-2">{formatCurrency(calculos.despesasRealizadas)}</p>
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">{calculos.percentualDespesas.toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(calculos.percentualDespesas, 100)} className="h-1.5" />
                </div>
              </div>
              <DollarSign className="h-5 w-5 text-red-400/40" />
            </div>
          </CardContent>
        </Card>

        {/* Receita Planejada */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Receita Planejada</p>
                <p className="text-2xl font-bold text-emerald-500 mt-2">{formatCurrency(calculos.receitasOrçadas)}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-emerald-500/40" />
            </div>
          </CardContent>
        </Card>

        {/* Receita Realizada */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Receita Realizada</p>
                <p className="text-2xl font-bold text-emerald-400 mt-2">{formatCurrency(calculos.receitasRealizadas)}</p>
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">{calculos.percentualReceitas.toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(calculos.percentualReceitas, 100)} className="h-1.5" />
                </div>
              </div>
              <DollarSign className="h-5 w-5 text-emerald-400/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Orçamento por Categoria */}
      <Card>
        <CardHeader>
          <CardTitle>Orçamento por Categoria</CardTitle>
          <CardDescription>
            Acompanhe o planejamento e a realização de cada categoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linhasTabela.length === 0 ? (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhuma movimentação encontrada para este mês
              </p>
              <p className="text-sm text-muted-foreground">
                Adicione transações ou defina orçamentos para começar
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {renderHeaderColuna('categoria', 'Categoria')}
                  </TableHead>
                  <TableHead className="text-center">
                    {renderHeaderColuna('tipo', 'Tipo', 'mx-auto')}
                  </TableHead>
                  <TableHead className="text-right">
                    {renderHeaderColuna('planejado', 'Planejado', 'ml-auto')}
                  </TableHead>
                  <TableHead className="text-right">
                    {renderHeaderColuna('realizado', 'Realizado', 'ml-auto')}
                  </TableHead>
                  <TableHead className="text-right">
                    {renderHeaderColuna('diferenca', 'Diferença', 'ml-auto')}
                  </TableHead>
                  <TableHead className="text-center">
                    {renderHeaderColuna('progresso', 'Progresso', 'mx-auto')}
                  </TableHead>
                  <TableHead className="text-center">
                    {renderHeaderColuna('status', 'Status', 'mx-auto')}
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      Ações
                      {ordenacoes.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetarOrdenacao}
                          className="h-6 px-1 text-xs"
                          title="Resetar ordenação"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasTabela.map((linha) => {
                  const realizado = getValorRealizado(linha.categoria_id)
                  const realizadoAbs = Math.abs(realizado)
                  const diferenca = linha.valor - realizadoAbs
                  const percentual = linha.valor > 0 ? (realizadoAbs / linha.valor) * 100 : 0
                  const isReceita = linha.tipo === 'receita'
                  const isDespesa = linha.tipo === 'despesa'

                  return (
                    <TableRow key={linha.categoria_id}>
                      <TableCell className="font-medium">
                        {linha.categoria_nome}
                        {!linha.tem_orcamento && (
                          <span className="ml-2 text-xs text-muted-foreground">(sem orçamento)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {linha.tipo === 'receita' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <TrendingUp className="h-3 w-3" />
                            Receita
                          </span>
                        ) : linha.tipo === 'despesa' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            <TrendingDown className="h-3 w-3" />
                            Despesa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted/40 text-muted-foreground border border-border">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="text"
                          placeholder="0,00"
                          value={
                            valoresEditandoTabela[linha.categoria_id] !== undefined
                              ? valoresEditandoTabela[linha.categoria_id]
                              : (linha.valor > 0 ? linha.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')
                          }
                          onChange={(e) => {
                            const novoValor = e.target.value
                            setValoresEditandoTabela(prev => ({
                              ...prev,
                              [linha.categoria_id]: novoValor
                            }))
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              
                              // Ao pressionar Enter, salvar o valor
                              const inputValue = (e.target as HTMLInputElement).value
                              
                              if (inputValue.trim() === '') {
                                return
                              }
                              
                              // Parse da string brasileira para número
                              const valorLimpo = inputValue.trim().replace(/\./g, '').replace(',', '.')
                              const valorNumerico = parseFloat(valorLimpo)
                              
                              if (!isNaN(valorNumerico) && valorNumerico >= 0) {
                                atualizarOrcamento(linha.categoria_id, valorNumerico)
                                // Limpar o estado imediatamente
                                setTimeout(() => {
                                  setValoresEditandoTabela(prev => {
                                    const novoState = { ...prev }
                                    delete novoState[linha.categoria_id]
                                    return novoState
                                  })
                                }, 100)
                              }
                            }
                          }}
                          onBlur={() => {
                            // Limpar estado ao sair do campo
                            setValoresEditandoTabela(prev => {
                              const novoState = { ...prev }
                              delete novoState[linha.categoria_id]
                              return novoState
                            })
                          }}
                          onFocus={(e) => {
                            e.target.select()
                          }}
                          className="w-32 ml-auto text-right border border-input rounded-md px-3 py-2 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                          style={{ cursor: 'text' }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${
                          realizadoAbs === 0
                            ? 'text-muted-foreground'
                            : isReceita
                              ? 'text-emerald-400'
                              : isDespesa
                                ? 'text-red-400'
                                : 'text-foreground'
                        }`}>
                          {formatCurrency(Math.abs(realizado))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {linha.valor > 0 ? (
                          <span className={`font-semibold ${
                            isReceita
                              ? (diferenca >= 0 ? 'text-emerald-400' : 'text-red-400')
                              : isDespesa
                                ? '!text-red-400'
                                : 'text-muted-foreground'
                          }`}>
                            {formatCurrency(Math.abs(diferenca))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {linha.valor > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2 w-full">
                              <Progress 
                                value={Math.min(percentual, 100)} 
                                className={`h-2 flex-1 ${percentual > 100 ? '[&>div]:bg-red-500' : percentual > 80 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
                              />
                              <span className="text-sm font-medium min-w-[45px] text-right">
                                {percentual.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground">-</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {linha.valor > 0 ? (
                          percentual <= 80 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Dentro
                            </span>
                          ) : percentual <= 100 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Atenção
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              Excedido
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/40 text-muted-foreground border border-border">
                            Sem meta
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => visualizarTransacoesCategoria(linha.categoria_id, linha.categoria_nome)}
                            className="h-8 w-8"
                            title="Ver lançamentos"
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          {linha.tem_orcamento && linha.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerOrcamento(linha.categoria_id)}
                              className="h-8 w-8"
                              title="Remover orçamento"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Transações da Categoria */}
      <Dialog open={modalTransacoesOpen} onOpenChange={setModalTransacoesOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançamentos - {categoriaNomeModal}</DialogTitle>
            <DialogDescription>
              {transacoesCategoria.length} transação(ões) em {new Date(0, mesSelecionado).toLocaleDateString('pt-BR', { month: 'long' })} de {anoSelecionado}
            </DialogDescription>
          </DialogHeader>
          
          {transacoesCategoria.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lançamento encontrado nesta categoria
            </div>
          ) : (
            <div className="space-y-6">
              {/* Receitas */}
              {receitasCategoria.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    <h3 className="text-lg font-semibold">Receitas ({receitasCategoria.length})</h3>
                    <span className="ml-auto text-sm font-medium text-emerald-400">
                      {formatCurrency(receitasCategoria.reduce((acc, t) => acc + t.valor, 0))}
                    </span>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Estabelecimento</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receitasCategoria.map((transacao) => (
                          <TableRow key={transacao.id}>
                            <TableCell>
                              {new Date(transacao.data || transacao.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="font-medium">
                              {transacao.descricao || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="inline-flex items-center gap-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                  transacao.origemTipo === 'cartao'
                                    ? 'bg-primary/10 text-primary border-primary/20'
                                    : 'bg-muted/40 text-muted-foreground border-border'
                                }`}>
                                  {transacao.origemTipo === 'cartao' ? 'Cartão' : 'Conta'}
                                </span>
                                <span className="text-xs text-muted-foreground">{transacao.origemNome}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-emerald-400">
                              {formatCurrency(transacao.valor)}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                transacao.status === 'pago' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : transacao.status === 'pendente' || transacao.status === 'pendente_fatura'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-muted/40 text-muted-foreground border border-border'
                              }`}>
                                {transacao.status === 'pago' ? 'Pago' : 
                                 transacao.status === 'pendente_fatura' ? 'Pendente (Fatura)' :
                                 transacao.status === 'pendente' ? 'Pendente' : 'Outros'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Despesas */}
              {despesasCategoria.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    <h3 className="text-lg font-semibold">Despesas ({despesasCategoria.length})</h3>
                    <span className="ml-auto text-sm font-medium text-red-400">
                      {formatCurrency(Math.abs(despesasCategoria.reduce((acc, t) => acc + t.valor, 0)))}
                    </span>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Estabelecimento</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {despesasCategoria.map((transacao) => (
                          <TableRow key={transacao.id}>
                            <TableCell>
                              {new Date(transacao.data || transacao.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="font-medium">
                              {transacao.descricao || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="inline-flex items-center gap-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                  transacao.origemTipo === 'cartao'
                                    ? 'bg-primary/10 text-primary border-primary/20'
                                    : 'bg-muted/40 text-muted-foreground border-border'
                                }`}>
                                  {transacao.origemTipo === 'cartao' ? 'Cartão' : 'Conta'}
                                </span>
                                <span className="text-xs text-muted-foreground">{transacao.origemNome}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-red-400">
                              {formatCurrency(Math.abs(transacao.valor))}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                transacao.status === 'pago' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : transacao.status === 'pendente' || transacao.status === 'pendente_fatura'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-muted/40 text-muted-foreground border border-border'
                              }`}>
                                {transacao.status === 'pago' ? 'Pago' : 
                                 transacao.status === 'pendente_fatura' ? 'Pendente (Fatura)' :
                                 transacao.status === 'pendente' ? 'Pendente' : 'Outros'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
