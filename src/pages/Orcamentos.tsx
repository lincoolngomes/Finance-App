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

type OrdenacaoColuna = 'categoria' | 'tipo' | 'planejado' | 'realizado' | 'diferenca' | 'progresso' | 'status'
type OrdenacaoDirecao = 'asc' | 'desc' | null

interface Categoria {
  id: string
  nome: string
}

interface OrcamentoCategoria {
  id: string
  user_id: string
  categoria_id: string
  valor_planejado: number
  mes: number
  ano: number
  categorias?: Categoria
}

interface TransacaoRealizada {
  categoria_id: string
  total: number
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
  const [ordenacaoColuna, setOrdenacaoColuna] = useState<OrdenacaoColuna | null>(null)
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState<OrdenacaoDirecao>(null)

  const handleOrdenar = (coluna: OrdenacaoColuna) => {
    if (ordenacaoColuna === coluna) {
      // Ciclo: asc -> desc -> null
      if (ordenacaoDirecao === 'asc') {
        setOrdenacaoDirecao('desc')
      } else if (ordenacaoDirecao === 'desc') {
        setOrdenacaoDirecao(null)
        setOrdenacaoColuna(null)
      }
    } else {
      setOrdenacaoColuna(coluna)
      setOrdenacaoDirecao('asc')
    }
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
      .select('id, nome')
      .eq('userid', user?.id)
      .order('nome')

    if (!error && data) {
      setCategorias(data)
    }
  }

  const carregarOrcamentos = async () => {
    const { data, error } = await supabase
      .from('orcamento_categorias')
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
    const { data, error } = await supabase
      .from('transacoes')
      .select('category_id, valor, quando, created_at, status, tipo')
      .eq('userid', user?.id)

    console.log('📊 Todas transações:', data)

    if (!error && data) {
      // Filtrar transações do mês/ano selecionado (INCLUINDO PENDENTES)
      const transacoesFiltradas = data.filter(t => {
        const dataTransacao = t.quando || t.created_at
        if (!dataTransacao) return false
        
        // Parse da data
        let date: Date
        if (typeof dataTransacao === 'string') {
          // Se for string dd/MM/yyyy
          if (dataTransacao.includes('/')) {
            const [dia, mes, ano] = dataTransacao.split('/')
            date = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
          } else {
            // Se for ISO
            date = new Date(dataTransacao)
          }
        } else {
          date = new Date(dataTransacao)
        }
        
        const mesTransacao = date.getMonth()
        const anoTransacao = date.getFullYear()
        
        const dentroDoMes = mesTransacao === mesSelecionado && anoTransacao === anoSelecionado
        
        if (dentroDoMes) {
          console.log('✅ Transação dentro do mês:', {
            categoria: t.category_id,
            valor: t.valor,
            tipo: t.tipo,
            valorNumber: Number(t.valor),
            data: dataTransacao,
            parsed: date,
            mes: mesTransacao,
            ano: anoTransacao
          })
        }
        
        return dentroDoMes
      })

      console.log(`📊 ${transacoesFiltradas.length} transações filtradas para ${mesSelecionado}/${anoSelecionado}`)

      // Agrupar por categoria (inverter sinal se for despesa e valor positivo)
      const agrupado = transacoesFiltradas.reduce((acc: Record<string, TransacaoRealizada>, t) => {
        const catId = t.category_id
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
      valor_planejado: valorNumerico,
      mes: mesSelecionado,
      ano: anoSelecionado,
      orcamentoEditando
    })

    if (orcamentoEditando) {
      // Atualizar orçamento existente
      const { error } = await supabase
        .from('orcamento_categorias')
        .update({
          valor_planejado: valorNumerico
        })
        .eq('id', orcamentoEditando)

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
        // Se já existe, atualizar em vez de inserir
        const { error } = await supabase
          .from('orcamento_categorias')
          .update({
            valor_planejado: valorNumerico
          })
          .eq('id', existe.id)

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
        .from('orcamento_categorias')
        .insert({
          user_id: user?.id,
          categoria_id: categoriaSelecionada,
          valor_planejado: valorNumerico,
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

    // Buscar se já existe orçamento
    const orcamentoExistente = orcamentos.find(o => o.categoria_id === categoriaId)

    if (orcamentoExistente) {
      // Atualizar existente
      const { error } = await supabase
        .from('orcamento_categorias')
        .update({ valor_planejado: valor })
        .eq('id', orcamentoExistente.id)

      if (!error) {
        carregarOrcamentos()
      }
    } else {
      // Criar novo
      const { error } = await supabase
        .from('orcamento_categorias')
        .insert({
          user_id: user?.id,
          categoria_id: categoriaId,
          valor_planejado: valor,
          mes: mesSelecionado,
          ano: anoSelecionado
        })

      if (!error) {
        carregarOrcamentos()
      }
    }
  }

  const editarOrcamento = (orc: OrcamentoCategoria) => {
    setOrcamentoEditando(orc.id)
    setCategoriaSelecionada(orc.categoria_id)
    // Formatar valor para exibição (1.000,00)
    const valorFormatado = orc.valor_planejado.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    setValorPlanejado(valorFormatado)
    setModalOpen(true)
  }

  const removerOrcamento = async (id: string) => {
    const { error } = await supabase
      .from('orcamento_categorias')
      .delete()
      .eq('id', id)

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
      .from('orcamento_categorias')
      .select('categoria_id, valor_planejado')
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
        .from('orcamento_categorias')
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

    // Inserir novos orçamentos
    const novosOrcamentos = orcamentosAnteriores.map(orc => ({
      user_id: user?.id,
      categoria_id: orc.categoria_id,
      valor_planejado: orc.valor_planejado,
      mes: mesSelecionado,
      ano: anoSelecionado
    }))

    const { error: errorInsert } = await supabase
      .from('orcamento_categorias')
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
    const totalPlanejado = orcamentos.reduce((sum, o) => sum + (o.valor_planejado || 0), 0)
    // Somar apenas despesas (valores negativos, em valor absoluto)
    const totalRealizado = transacoesRealizadas.reduce((sum, t) => {
      return sum + (t.total < 0 ? Math.abs(t.total) : 0)
    }, 0)
    const economia = totalPlanejado - totalRealizado
    const percentualGasto = totalPlanejado > 0 ? (totalRealizado / totalPlanejado) * 100 : 0

    return {
      totalPlanejado,
      totalRealizado,
      economia,
      percentualGasto
    }
  }, [orcamentos, transacoesRealizadas])

  // Criar lista completa: orçamentos definidos + categorias com gastos
  const linhasTabela = useMemo(() => {
    const categoriasMap = new Map()

    // Adicionar todas as categorias do orçamento
    orcamentos.forEach(orc => {
      categoriasMap.set(orc.categoria_id, {
        id: orc.id,
        categoria_id: orc.categoria_id,
        categoria_nome: orc.categorias?.nome || 'Categoria',
        valor_planejado: orc.valor_planejado,
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
          valor_planejado: 0,
          tem_orcamento: false
        })
      }
    })

    const resultado = Array.from(categoriasMap.values())
    console.log('📋 Linhas da tabela:', resultado)
    
    // Aplicar ordenação se houver
    if (ordenacaoColuna && ordenacaoDirecao) {
      resultado.sort((a, b) => {
        let valorA: any
        let valorB: any
        
        switch (ordenacaoColuna) {
          case 'categoria':
            valorA = a.categoria_nome.toLowerCase()
            valorB = b.categoria_nome.toLowerCase()
            break
          case 'tipo':
            const realizadoA = getValorRealizado(a.categoria_id)
            const realizadoB = getValorRealizado(b.categoria_id)
            valorA = realizadoA > 0 ? 1 : realizadoA < 0 ? -1 : 0
            valorB = realizadoB > 0 ? 1 : realizadoB < 0 ? -1 : 0
            break
          case 'planejado':
            valorA = a.valor_planejado
            valorB = b.valor_planejado
            break
          case 'realizado':
            valorA = Math.abs(getValorRealizado(a.categoria_id))
            valorB = Math.abs(getValorRealizado(b.categoria_id))
            break
          case 'diferenca':
            const difA = a.valor_planejado - Math.abs(getValorRealizado(a.categoria_id))
            const difB = b.valor_planejado - Math.abs(getValorRealizado(b.categoria_id))
            valorA = difA
            valorB = difB
            break
          case 'progresso':
            const percA = a.valor_planejado > 0 ? (Math.abs(getValorRealizado(a.categoria_id)) / a.valor_planejado) * 100 : 0
            const percB = b.valor_planejado > 0 ? (Math.abs(getValorRealizado(b.categoria_id)) / b.valor_planejado) * 100 : 0
            valorA = percA
            valorB = percB
            break
          case 'status':
            const getStatus = (linha: any) => {
              if (linha.valor_planejado === 0) return 0
              const perc = (Math.abs(getValorRealizado(linha.categoria_id)) / linha.valor_planejado) * 100
              if (perc <= 80) return 1
              if (perc <= 100) return 2
              return 3
            }
            valorA = getStatus(a)
            valorB = getStatus(b)
            break
          default:
            return 0
        }
        
        if (valorA < valorB) return ordenacaoDirecao === 'asc' ? -1 : 1
        if (valorA > valorB) return ordenacaoDirecao === 'asc' ? 1 : -1
        return 0
      })
    }
    
    return resultado
  }, [orcamentos, transacoesRealizadas, categorias, ordenacaoColuna, ordenacaoDirecao])

  const getValorRealizado = (categoriaId: string) => {
    const transacao = transacoesRealizadas.find(t => t.categoria_id === categoriaId)
    return transacao?.total || 0
  }

  const visualizarTransacoesCategoria = async (categoriaId: string, categoriaNome: string) => {
    console.log('👁️ Visualizar transações - Categoria:', categoriaNome, 'ID:', categoriaId)
    try {
      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .eq('userid', user?.id)
        .eq('category_id', categoriaId)
        .order('quando', { ascending: false })

      console.log('📦 Dados recebidos:', data?.length, 'transações')
      if (error) {
        console.error('❌ Erro na query:', error)
        throw error
      }

      // Filtrar pelo mês e ano selecionados
      const transacoesFiltradas = (data || []).filter(t => {
        const dataTransacao = t.quando || t.created_at
        let mesTransacao, anoTransacao

        if (dataTransacao.includes('/')) {
          const [dia, mes, ano] = dataTransacao.split('/')
          mesTransacao = parseInt(mes) - 1
          anoTransacao = parseInt(ano)
        } else {
          const date = new Date(dataTransacao)
          mesTransacao = date.getMonth()
          anoTransacao = date.getFullYear()
        }

        return mesTransacao === mesSelecionado && anoTransacao === anoSelecionado
      })

      // Separar receitas (valor > 0) e despesas (valor < 0)
      const receitas = transacoesFiltradas.filter(t => t.valor > 0)
      const despesas = transacoesFiltradas.filter(t => t.valor < 0)

      console.log('🔍 Total transações:', transacoesFiltradas.length)
      console.log('💰 Receitas:', receitas.length, receitas)
      console.log('💸 Despesas:', despesas.length, despesas)

      setTransacoesCategoria(transacoesFiltradas)
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
                          .map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.nome}
                            </SelectItem>
                          ))
                      ) : (
                        categorias.map(cat => {
                          const jaTemOrcamento = orcamentos.find(o => o.categoria_id === cat.id)
                          const label = jaTemOrcamento 
                            ? `${cat.nome} (R$ ${jaTemOrcamento.valor_planejado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                            : cat.nome
                          return (
                            <SelectItem key={cat.id} value={cat.id}>
                              {label}
                            </SelectItem>
                          )
                        })
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Planejado</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(calculos.totalPlanejado)}
            </div>
            <p className="text-xs text-muted-foreground">
              O orçamento soma dos orçamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Realizado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(calculos.totalRealizado)}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculos.percentualGasto.toFixed(0)}% do orçamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {calculos.economia >= 0 ? 'Economia' : 'Excedente'}
            </CardTitle>
            {calculos.economia >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${calculos.economia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(calculos.economia))}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculos.economia >= 0 ? 'Dentro do orçamento' : 'Acima do planejado'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {calculos.percentualGasto.toFixed(0)}%
              </div>
              <Progress 
                value={Math.min(calculos.percentualGasto, 100)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Do orçamento utilizado
              </p>
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
                    <Button 
                      variant="ghost" 
                      onClick={() => handleOrdenar('categoria')}
                      className="h-8 px-2 flex items-center gap-1 hover:bg-transparent"
                    >
                      Categoria
                      {ordenacaoColuna === 'categoria' ? (
                        ordenacaoDirecao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleOrdenar('tipo')}
                      className="h-8 px-2 flex items-center gap-1 mx-auto hover:bg-transparent"
                    >
                      Tipo
                      {ordenacaoColuna === 'tipo' ? (
                        ordenacaoDirecao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleOrdenar('planejado')}
                      className="h-8 px-2 flex items-center gap-1 ml-auto hover:bg-transparent"
                    >
                      Planejado
                      {ordenacaoColuna === 'planejado' ? (
                        ordenacaoDirecao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleOrdenar('realizado')}
                      className="h-8 px-2 flex items-center gap-1 ml-auto hover:bg-transparent"
                    >
                      Realizado
                      {ordenacaoColuna === 'realizado' ? (
                        ordenacaoDirecao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleOrdenar('diferenca')}
                      className="h-8 px-2 flex items-center gap-1 ml-auto hover:bg-transparent"
                    >
                      Diferença
                      {ordenacaoColuna === 'diferenca' ? (
                        ordenacaoDirecao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleOrdenar('progresso')}
                      className="h-8 px-2 flex items-center gap-1 mx-auto hover:bg-transparent"
                    >
                      Progresso
                      {ordenacaoColuna === 'progresso' ? (
                        ordenacaoDirecao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleOrdenar('status')}
                      className="h-8 px-2 flex items-center gap-1 mx-auto hover:bg-transparent"
                    >
                      Status
                      {ordenacaoColuna === 'status' ? (
                        ordenacaoDirecao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasTabela.map((linha) => {
                  const realizado = getValorRealizado(linha.categoria_id)
                  const realizadoAbs = Math.abs(realizado)
                  const diferenca = linha.valor_planejado - realizadoAbs
                  const percentual = linha.valor_planejado > 0 ? (realizadoAbs / linha.valor_planejado) * 100 : 0

                  return (
                    <TableRow key={linha.categoria_id}>
                      <TableCell className="font-medium">
                        {linha.categoria_nome}
                        {!linha.tem_orcamento && (
                          <span className="ml-2 text-xs text-muted-foreground">(sem orçamento)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {realizado > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <TrendingUp className="h-3 w-3" />
                            Receita
                          </span>
                        ) : realizado < 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            <TrendingDown className="h-3 w-3" />
                            Despesa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="text"
                          placeholder="0,00"
                          value={linha.valor_planejado > 0 ? linha.valor_planejado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                          onChange={(e) => {
                            let valor = e.target.value.replace(/\D/g, '')
                            if (valor === '') return
                            
                            const numero = parseInt(valor) / 100
                            const formatado = numero.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })
                            
                            // Converter para número e salvar
                            const valorNumerico = parseFloat(formatado.replace(/\./g, '').replace(',', '.'))
                            atualizarOrcamento(linha.categoria_id, valorNumerico)
                          }}
                          onBlur={(e) => {
                            // Ao sair do campo, se estiver vazio, salvar como 0
                            if (!e.target.value) {
                              atualizarOrcamento(linha.categoria_id, 0)
                            }
                          }}
                          className="w-32 ml-auto text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${realizado > 0 ? 'text-green-600' : realizado < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {formatCurrency(Math.abs(realizado))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {linha.valor_planejado > 0 ? (
                          <span className={`font-semibold ${diferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(diferenca))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {linha.valor_planejado > 0 ? (
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
                        {linha.valor_planejado > 0 ? (
                          percentual <= 80 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Dentro
                            </span>
                          ) : percentual <= 100 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                              Atenção
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              Excedido
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400">
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
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                          {linha.tem_orcamento && linha.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerOrcamento(linha.id)}
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
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold">Receitas ({receitasCategoria.length})</h3>
                    <span className="ml-auto text-sm font-medium text-green-600">
                      {formatCurrency(receitasCategoria.reduce((acc, t) => acc + t.valor, 0))}
                    </span>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Estabelecimento</TableHead>
                          <TableHead>Detalhes</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receitasCategoria.map((transacao) => (
                          <TableRow key={transacao.id}>
                            <TableCell>
                              {new Date(transacao.quando || transacao.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="font-medium">
                              {transacao.estabelecimento || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {transacao.detalhes || '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              {formatCurrency(transacao.valor)}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                transacao.status === 'pago' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : transacao.status === 'pendente' || transacao.status === 'pendente_fatura'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
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
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    <h3 className="text-lg font-semibold">Despesas ({despesasCategoria.length})</h3>
                    <span className="ml-auto text-sm font-medium text-red-600">
                      {formatCurrency(Math.abs(despesasCategoria.reduce((acc, t) => acc + t.valor, 0)))}
                    </span>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Estabelecimento</TableHead>
                          <TableHead>Detalhes</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {despesasCategoria.map((transacao) => (
                          <TableRow key={transacao.id}>
                            <TableCell>
                              {new Date(transacao.quando || transacao.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="font-medium">
                              {transacao.estabelecimento || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {transacao.detalhes || '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-red-600">
                              {formatCurrency(Math.abs(transacao.valor))}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                transacao.status === 'pago' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : transacao.status === 'pendente' || transacao.status === 'pendente_fatura'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
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
