import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, parseValorBR } from '@/utils/currency'
import { Trash2, Pencil, Scale, Wallet, Landmark, TrendingDown, TrendingUp, BadgePercent } from 'lucide-react'

type StatusDivida = 'ativo' | 'pago' | 'atrasado' | 'renegociado'
type TipoDivida = 'cartao' | 'emprestimo' | 'financiamento' | 'consignado' | 'pessoal' | 'outro'

type StatusBem = 'ativo' | 'vendido' | 'perdido' | 'doado'
type TipoBem = 'imovel' | 'veiculo' | 'eletronico' | 'mobiliario' | 'equipamento' | 'investimento' | 'outro'

interface Divida {
  id: string
  user_id: string
  nome: string
  tipo: TipoDivida
  credor?: string | null
  valor_total: number
  saldo_atual: number
  taxa_juros?: number | null
  parcelas_total?: number | null
  parcelas_pagas?: number | null
  valor_parcela?: number | null
  vencimento_dia?: number | null
  data_inicio?: string | null
  data_fim?: string | null
  status: StatusDivida
  observacoes?: string | null
  created_at?: string
  updated_at?: string
}

interface Bem {
  id: string
  user_id: string
  nome: string
  tipo: TipoBem
  localizacao?: string | null
  numero_serie?: string | null
  valor_compra: number
  valor_atual: number
  data_aquisicao?: string | null
  garantia_ate?: string | null
  status: StatusBem
  observacoes?: string | null
  created_at?: string
  updated_at?: string
}

interface FormDivida {
  nome: string
  tipo: TipoDivida | ''
  credor: string
  valor_total: string
  saldo_atual: string
  taxa_juros: string
  parcelas_total: string
  parcelas_pagas: string
  valor_parcela: string
  vencimento_dia: string
  data_inicio: string
  data_fim: string
  status: StatusDivida
  observacoes: string
}

interface FormBem {
  nome: string
  tipo: TipoBem | ''
  localizacao: string
  numero_serie: string
  valor_compra: string
  valor_atual: string
  data_aquisicao: string
  garantia_ate: string
  status: StatusBem
  observacoes: string
}

const formatMoneyInput = (value: string) => {
  const numbers = value.replace(/\D/g, '')
  if (!numbers) return ''
  const num = parseInt(numbers, 10) / 100
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatMoneyValue = (value?: number | null) => {
  if (!value || value === 0) return ''
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Patrimonio() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [dividas, setDividas] = useState<Divida[]>([])
  const [bens, setBens] = useState<Bem[]>([])

  const [modalDividaOpen, setModalDividaOpen] = useState(false)
  const [modalBemOpen, setModalBemOpen] = useState(false)
  const [dividaEditando, setDividaEditando] = useState<Divida | null>(null)
  const [bemEditando, setBemEditando] = useState<Bem | null>(null)

  const [filtroDivida, setFiltroDivida] = useState('')
  const [filtroBem, setFiltroBem] = useState('')
  const [statusDividaFiltro, setStatusDividaFiltro] = useState<'todos' | StatusDivida>('todos')
  const [statusBemFiltro, setStatusBemFiltro] = useState<'todos' | StatusBem>('todos')

  const [formDivida, setFormDivida] = useState<FormDivida>({
    nome: '',
    tipo: '',
    credor: '',
    valor_total: '',
    saldo_atual: '',
    taxa_juros: '',
    parcelas_total: '',
    parcelas_pagas: '',
    valor_parcela: '',
    vencimento_dia: '',
    data_inicio: '',
    data_fim: '',
    status: 'ativo',
    observacoes: ''
  })

  const [formBem, setFormBem] = useState<FormBem>({
    nome: '',
    tipo: '',
    localizacao: '',
    numero_serie: '',
    valor_compra: '',
    valor_atual: '',
    data_aquisicao: '',
    garantia_ate: '',
    status: 'ativo',
    observacoes: ''
  })

  useEffect(() => {
    if (!user) return
    carregarDados()
  }, [user])

  const carregarDados = async () => {
    setLoading(true)
    try {
      await Promise.all([carregarDividas(), carregarBens()])
    } finally {
      setLoading(false)
    }
  }

  const carregarDividas = async () => {
    const { data, error } = await supabase
      .from('dividas')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as dívidas.',
        variant: 'destructive'
      })
      return
    }

    setDividas(data || [])
  }

  const carregarBens = async () => {
    const { data, error } = await supabase
      .from('bens')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os bens.',
        variant: 'destructive'
      })
      return
    }

    setBens(data || [])
  }

  const limparFormDivida = () => {
    setFormDivida({
      nome: '',
      tipo: '',
      credor: '',
      valor_total: '',
      saldo_atual: '',
      taxa_juros: '',
      parcelas_total: '',
      parcelas_pagas: '',
      valor_parcela: '',
      vencimento_dia: '',
      data_inicio: '',
      data_fim: '',
      status: 'ativo',
      observacoes: ''
    })
    setDividaEditando(null)
  }

  const limparFormBem = () => {
    setFormBem({
      nome: '',
      tipo: '',
      localizacao: '',
      numero_serie: '',
      valor_compra: '',
      valor_atual: '',
      data_aquisicao: '',
      garantia_ate: '',
      status: 'ativo',
      observacoes: ''
    })
    setBemEditando(null)
  }

  const editarDivida = (divida: Divida) => {
    setDividaEditando(divida)
    setFormDivida({
      nome: divida.nome,
      tipo: divida.tipo,
      credor: divida.credor || '',
      valor_total: formatMoneyValue(divida.valor_total),
      saldo_atual: formatMoneyValue(divida.saldo_atual),
      taxa_juros: divida.taxa_juros?.toString() || '',
      parcelas_total: divida.parcelas_total?.toString() || '',
      parcelas_pagas: divida.parcelas_pagas?.toString() || '',
      valor_parcela: formatMoneyValue(divida.valor_parcela || 0),
      vencimento_dia: divida.vencimento_dia?.toString() || '',
      data_inicio: divida.data_inicio || '',
      data_fim: divida.data_fim || '',
      status: divida.status,
      observacoes: divida.observacoes || ''
    })
    setModalDividaOpen(true)
  }

  const editarBem = (bem: Bem) => {
    setBemEditando(bem)
    setFormBem({
      nome: bem.nome,
      tipo: bem.tipo,
      localizacao: bem.localizacao || '',
      numero_serie: bem.numero_serie || '',
      valor_compra: formatMoneyValue(bem.valor_compra),
      valor_atual: formatMoneyValue(bem.valor_atual),
      data_aquisicao: bem.data_aquisicao || '',
      garantia_ate: bem.garantia_ate || '',
      status: bem.status,
      observacoes: bem.observacoes || ''
    })
    setModalBemOpen(true)
  }

  const salvarDivida = async () => {
    if (!formDivida.nome || !formDivida.tipo) {
      toast({
        title: 'Erro',
        description: 'Preencha nome e tipo da dívida.',
        variant: 'destructive'
      })
      return
    }

    const valorTotal = parseValorBR(formDivida.valor_total)
    const saldoAtual = formDivida.saldo_atual ? parseValorBR(formDivida.saldo_atual) : valorTotal

    const payload = {
      user_id: user?.id,
      nome: formDivida.nome,
      tipo: formDivida.tipo,
      credor: formDivida.credor || null,
      valor_total: valorTotal,
      saldo_atual: saldoAtual,
      taxa_juros: formDivida.taxa_juros ? Number(formDivida.taxa_juros) : null,
      parcelas_total: formDivida.parcelas_total ? Number(formDivida.parcelas_total) : null,
      parcelas_pagas: formDivida.parcelas_pagas ? Number(formDivida.parcelas_pagas) : null,
      valor_parcela: formDivida.valor_parcela ? parseValorBR(formDivida.valor_parcela) : null,
      vencimento_dia: formDivida.vencimento_dia ? Number(formDivida.vencimento_dia) : null,
      data_inicio: formDivida.data_inicio || null,
      data_fim: formDivida.data_fim || null,
      status: formDivida.status,
      observacoes: formDivida.observacoes || null
    }

    const { error } = dividaEditando
      ? await supabase.from('dividas').update(payload).eq('id', dividaEditando.id)
      : await supabase.from('dividas').insert(payload)

    if (error) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar a dívida.',
        variant: 'destructive'
      })
      return
    }

    toast({
      title: 'Sucesso',
      description: dividaEditando ? 'Dívida atualizada!' : 'Dívida criada com sucesso.'
    })
    setModalDividaOpen(false)
    limparFormDivida()
    carregarDividas()
  }

  const salvarBem = async () => {
    if (!formBem.nome || !formBem.tipo) {
      toast({
        title: 'Erro',
        description: 'Preencha nome e tipo do bem.',
        variant: 'destructive'
      })
      return
    }

    const valorCompra = parseValorBR(formBem.valor_compra)
    const valorAtual = formBem.valor_atual ? parseValorBR(formBem.valor_atual) : valorCompra

    const payload = {
      user_id: user?.id,
      nome: formBem.nome,
      tipo: formBem.tipo,
      localizacao: formBem.localizacao || null,
      numero_serie: formBem.numero_serie || null,
      valor_compra: valorCompra,
      valor_atual: valorAtual,
      data_aquisicao: formBem.data_aquisicao || null,
      garantia_ate: formBem.garantia_ate || null,
      status: formBem.status,
      observacoes: formBem.observacoes || null
    }

    const { error } = bemEditando
      ? await supabase.from('bens').update(payload).eq('id', bemEditando.id)
      : await supabase.from('bens').insert(payload)

    if (error) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o bem.',
        variant: 'destructive'
      })
      return
    }

    toast({
      title: 'Sucesso',
      description: bemEditando ? 'Bem atualizado!' : 'Bem criado com sucesso.'
    })
    setModalBemOpen(false)
    limparFormBem()
    carregarBens()
  }

  const removerDivida = async (id: string) => {
    const confirmar = confirm('Deseja remover esta dívida? Esta ação não pode ser desfeita.')
    if (!confirmar) return

    const { error } = await supabase.from('dividas').delete().eq('id', id)

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a dívida.',
        variant: 'destructive'
      })
      return
    }

    toast({ title: 'Sucesso', description: 'Dívida removida.' })
    carregarDividas()
  }

  const removerBem = async (id: string) => {
    const confirmar = confirm('Deseja remover este bem? Esta ação não pode ser desfeita.')
    if (!confirmar) return

    const { error } = await supabase.from('bens').delete().eq('id', id)

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o bem.',
        variant: 'destructive'
      })
      return
    }

    toast({ title: 'Sucesso', description: 'Bem removido.' })
    carregarBens()
  }

  const dividasFiltradas = useMemo(() => {
    return dividas.filter(d => {
      const matchStatus = statusDividaFiltro === 'todos' ? true : d.status === statusDividaFiltro
      const termo = filtroDivida.toLowerCase()
      const matchTexto = d.nome.toLowerCase().includes(termo) || (d.credor || '').toLowerCase().includes(termo)
      return matchStatus && matchTexto
    })
  }, [dividas, filtroDivida, statusDividaFiltro])

  const bensFiltrados = useMemo(() => {
    return bens.filter(b => {
      const matchStatus = statusBemFiltro === 'todos' ? true : b.status === statusBemFiltro
      const termo = filtroBem.toLowerCase()
      const matchTexto = b.nome.toLowerCase().includes(termo) || (b.localizacao || '').toLowerCase().includes(termo)
      return matchStatus && matchTexto
    })
  }, [bens, filtroBem, statusBemFiltro])

  const resumoDividas = useMemo(() => {
    const total = dividas.reduce((sum, d) => sum + (d.valor_total || 0), 0)
    const saldo = dividas.reduce((sum, d) => sum + (d.saldo_atual || 0), 0)
    const pagas = dividas.filter(d => d.status === 'pago').length
    const ativas = dividas.filter(d => d.status === 'ativo').length
    return { total, saldo, pagas, ativas }
  }, [dividas])

  const resumoBens = useMemo(() => {
    const totalCompra = bens.reduce((sum, b) => sum + (b.valor_compra || 0), 0)
    const totalAtual = bens.reduce((sum, b) => sum + (b.valor_atual || 0), 0)
    const ativos = bens.filter(b => b.status === 'ativo').length
    return { totalCompra, totalAtual, ativos }
  }, [bens])

  const patrimonioLiquido = resumoBens.totalAtual - resumoDividas.saldo

  const renderStatusDivida = (status: StatusDivida) => {
    if (status === 'pago') return <Badge variant="default">Pago</Badge>
    if (status === 'atrasado') return <Badge variant="destructive">Atrasado</Badge>
    if (status === 'renegociado') return <Badge variant="secondary">Renegociado</Badge>
    return <Badge variant="outline">Ativo</Badge>
  }

  const renderStatusBem = (status: StatusBem) => {
    if (status === 'vendido') return <Badge variant="secondary">Vendido</Badge>
    if (status === 'perdido') return <Badge variant="destructive">Perdido</Badge>
    if (status === 'doado') return <Badge variant="outline">Doado</Badge>
    return <Badge variant="default">Ativo</Badge>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bens e Dívidas</h1>
          <p className="text-muted-foreground">
            Controle completo do seu patrimônio, com visão de ativos e obrigações.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setModalDividaOpen(true)}>
            <TrendingDown className="h-4 w-4 mr-2" />
            Nova Dívida
          </Button>
          <Button onClick={() => setModalBemOpen(true)}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Novo Bem
          </Button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Patrimônio Líquido</p>
                <p className={`text-2xl font-bold mt-2 ${patrimonioLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(patrimonioLiquido)}
                </p>
              </div>
              <Scale className="h-5 w-5 text-muted-foreground/70" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Saldo de Dívidas</p>
                <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(resumoDividas.saldo)}</p>
                <p className="text-xs text-muted-foreground mt-1">{resumoDividas.ativas} ativa(s)</p>
              </div>
              <Wallet className="h-5 w-5 text-red-500/70" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Valor Atual dos Bens</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(resumoBens.totalAtual)}</p>
                <p className="text-xs text-muted-foreground mt-1">{resumoBens.ativos} ativo(s)</p>
              </div>
              <Landmark className="h-5 w-5 text-green-500/70" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Original</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{formatCurrency(resumoBens.totalCompra)}</p>
              </div>
              <BadgePercent className="h-5 w-5 text-blue-500/70" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dividas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
          <TabsTrigger value="dividas" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Dívidas
          </TabsTrigger>
          <TabsTrigger value="bens" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Bens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dividas" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Gestão de Dívidas</CardTitle>
              <CardDescription>Acompanhe saldos, parcelas e status de cada dívida.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <Input
                  placeholder="Buscar por nome ou credor..."
                  value={filtroDivida}
                  onChange={(e) => setFiltroDivida(e.target.value)}
                  className="md:max-w-sm"
                />
                <Select value={statusDividaFiltro} onValueChange={(v) => setStatusDividaFiltro(v as any)}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="renegociado">Renegociado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dívida</TableHead>
                    <TableHead>Credor</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-center">Progresso</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dividasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma dívida encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dividasFiltradas.map((divida) => {
                      const pago = Math.max(divida.valor_total - divida.saldo_atual, 0)
                      const progresso = divida.valor_total > 0 ? (pago / divida.valor_total) * 100 : 0
                      return (
                        <TableRow key={divida.id}>
                          <TableCell className="font-medium">
                            {divida.nome}
                            <div className="text-xs text-muted-foreground">{divida.tipo}</div>
                          </TableCell>
                          <TableCell>{divida.credor || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(divida.valor_total)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(divida.saldo_atual)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2">
                              <Progress value={Math.min(progresso, 100)} className="h-2 flex-1" />
                              <span className="text-xs font-medium min-w-[38px]">{progresso.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{renderStatusDivida(divida.status)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => editarDivida(divida)}>
                                <Pencil className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => removerDivida(divida.id)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bens" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Gestão de Bens</CardTitle>
              <CardDescription>Registre ativos, valores e evolução do patrimônio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <Input
                  placeholder="Buscar por nome ou localização..."
                  value={filtroBem}
                  onChange={(e) => setFiltroBem(e.target.value)}
                  className="md:max-w-sm"
                />
                <Select value={statusBemFiltro} onValueChange={(v) => setStatusBemFiltro(v as any)}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                    <SelectItem value="doado">Doado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bem</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead className="text-right">Valor de Compra</TableHead>
                    <TableHead className="text-right">Valor Atual</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bensFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum bem encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bensFiltrados.map((bem) => {
                      const variacao = bem.valor_atual - bem.valor_compra
                      return (
                        <TableRow key={bem.id}>
                          <TableCell className="font-medium">
                            {bem.nome}
                            <div className="text-xs text-muted-foreground">{bem.tipo}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{bem.localizacao || '-'}</div>
                            {bem.garantia_ate && (
                              <div className="text-xs text-muted-foreground">Garantia até {new Date(bem.garantia_ate).toLocaleDateString('pt-BR')}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(bem.valor_compra)}</TableCell>
                          <TableCell className={`text-right ${variacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(bem.valor_atual)}
                          </TableCell>
                          <TableCell className="text-center">{renderStatusBem(bem.status)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => editarBem(bem)}>
                                <Pencil className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => removerBem(bem.id)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={modalDividaOpen} onOpenChange={(open) => {
        setModalDividaOpen(open)
        if (!open) limparFormDivida()
      }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0">
        <div className="flex flex-col max-h-[85vh]">
          <div className="p-6 border-b border-border/60">
          <DialogHeader>
            <DialogTitle>{dividaEditando ? 'Editar Dívida' : 'Nova Dívida'}</DialogTitle>
            <DialogDescription>Registre detalhes completos para melhor acompanhamento.</DialogDescription>
          </DialogHeader>
          </div>
          <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Dívida</Label>
              <Input value={formDivida.nome} onChange={(e) => setFormDivida(prev => ({ ...prev, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formDivida.tipo} onValueChange={(v) => setFormDivida(prev => ({ ...prev, tipo: v as TipoDivida }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="emprestimo">Empréstimo</SelectItem>
                  <SelectItem value="financiamento">Financiamento</SelectItem>
                  <SelectItem value="consignado">Consignado</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Credor</Label>
              <Input value={formDivida.credor} onChange={(e) => setFormDivida(prev => ({ ...prev, credor: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formDivida.status} onValueChange={(v) => setFormDivida(prev => ({ ...prev, status: v as StatusDivida }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                  <SelectItem value="renegociado">Renegociado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Total</Label>
              <Input
                value={formDivida.valor_total}
                onChange={(e) => setFormDivida(prev => ({ ...prev, valor_total: formatMoneyInput(e.target.value) }))}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Saldo Atual</Label>
              <Input
                value={formDivida.saldo_atual}
                onChange={(e) => setFormDivida(prev => ({ ...prev, saldo_atual: formatMoneyInput(e.target.value) }))}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Taxa de Juros (%)</Label>
              <Input
                type="number"
                value={formDivida.taxa_juros}
                onChange={(e) => setFormDivida(prev => ({ ...prev, taxa_juros: e.target.value }))}
                placeholder="Ex: 2.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor da Parcela</Label>
              <Input
                value={formDivida.valor_parcela}
                onChange={(e) => setFormDivida(prev => ({ ...prev, valor_parcela: formatMoneyInput(e.target.value) }))}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Parcelas Totais</Label>
              <Input
                type="number"
                value={formDivida.parcelas_total}
                onChange={(e) => setFormDivida(prev => ({ ...prev, parcelas_total: e.target.value }))}
                placeholder="Ex: 24"
              />
            </div>
            <div className="space-y-2">
              <Label>Parcelas Pagas</Label>
              <Input
                type="number"
                value={formDivida.parcelas_pagas}
                onChange={(e) => setFormDivida(prev => ({ ...prev, parcelas_pagas: e.target.value }))}
                placeholder="Ex: 6"
              />
            </div>
            <div className="space-y-2">
              <Label>Dia de Vencimento</Label>
              <Input
                type="number"
                value={formDivida.vencimento_dia}
                onChange={(e) => setFormDivida(prev => ({ ...prev, vencimento_dia: e.target.value }))}
                placeholder="Ex: 10"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input
                type="date"
                value={formDivida.data_inicio}
                onChange={(e) => setFormDivida(prev => ({ ...prev, data_inicio: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Término</Label>
              <Input
                type="date"
                value={formDivida.data_fim}
                onChange={(e) => setFormDivida(prev => ({ ...prev, data_fim: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={formDivida.observacoes}
              onChange={(e) => setFormDivida(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Anotações importantes, contatos, renegociação, etc."
            />
          </div>
          </div>
          <div className="flex justify-end gap-2 p-6 border-t border-border/60 bg-background/80 backdrop-blur">
            <Button variant="outline" onClick={() => setModalDividaOpen(false)}>Cancelar</Button>
            <Button onClick={salvarDivida}>{dividaEditando ? 'Atualizar' : 'Salvar'}</Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>

      <Dialog open={modalBemOpen} onOpenChange={(open) => {
        setModalBemOpen(open)
        if (!open) limparFormBem()
      }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0">
        <div className="flex flex-col max-h-[85vh]">
          <div className="p-6 border-b border-border/60">
          <DialogHeader>
            <DialogTitle>{bemEditando ? 'Editar Bem' : 'Novo Bem'}</DialogTitle>
            <DialogDescription>Organize seus ativos e acompanhe valorização.</DialogDescription>
          </DialogHeader>
          </div>
          <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Bem</Label>
              <Input value={formBem.nome} onChange={(e) => setFormBem(prev => ({ ...prev, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formBem.tipo} onValueChange={(v) => setFormBem(prev => ({ ...prev, tipo: v as TipoBem }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imovel">Imóvel</SelectItem>
                  <SelectItem value="veiculo">Veículo</SelectItem>
                  <SelectItem value="eletronico">Eletrônico</SelectItem>
                  <SelectItem value="mobiliario">Mobiliário</SelectItem>
                  <SelectItem value="equipamento">Equipamento</SelectItem>
                  <SelectItem value="investimento">Investimento</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input value={formBem.localizacao} onChange={(e) => setFormBem(prev => ({ ...prev, localizacao: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Número de Série / Documento</Label>
              <Input value={formBem.numero_serie} onChange={(e) => setFormBem(prev => ({ ...prev, numero_serie: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Valor de Compra</Label>
              <Input
                value={formBem.valor_compra}
                onChange={(e) => setFormBem(prev => ({ ...prev, valor_compra: formatMoneyInput(e.target.value) }))}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Atual</Label>
              <Input
                value={formBem.valor_atual}
                onChange={(e) => setFormBem(prev => ({ ...prev, valor_atual: formatMoneyInput(e.target.value) }))}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Aquisição</Label>
              <Input
                type="date"
                value={formBem.data_aquisicao}
                onChange={(e) => setFormBem(prev => ({ ...prev, data_aquisicao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Garantia Até</Label>
              <Input
                type="date"
                value={formBem.garantia_ate}
                onChange={(e) => setFormBem(prev => ({ ...prev, garantia_ate: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Status</Label>
              <Select value={formBem.status} onValueChange={(v) => setFormBem(prev => ({ ...prev, status: v as StatusBem }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                  <SelectItem value="doado">Doado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={formBem.observacoes}
              onChange={(e) => setFormBem(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Detalhes do bem, notas de avaliação, etc."
            />
          </div>
          </div>
          <div className="flex justify-end gap-2 p-6 border-t border-border/60 bg-background/80 backdrop-blur">
            <Button variant="outline" onClick={() => setModalBemOpen(false)}>Cancelar</Button>
            <Button onClick={salvarBem}>{bemEditando ? 'Atualizar' : 'Salvar'}</Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>
    </div>
  )
}
