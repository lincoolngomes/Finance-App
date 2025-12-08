import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { CurrencyInput } from '@/components/ui/currency-input'
import { TransactionSummaryCards } from '@/components/transactions/TransactionSummaryCards'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { CategorySelector } from '@/components/transactions/CategorySelector'
import { BankSelector, CardSelector } from '@/components/accounts/BankAndCardSelector'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCategories } from '@/hooks/useCategories'
// import { useAccountsMap } from '@/hooks/useAccountsMap'
import { toast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'



interface Transacao {
  id: number
  created_at: string
  quando: string | null
  estabelecimento: string | null
}


const Transacoes: React.FC = () => {
  // Estado do formulário de transação (corrige ReferenceError)
  const [formData, setFormData] = useState({
    quando: '',
    estabelecimento: '',
    valor: 0,
    detalhes: '',
    tipo: '',
    category_id: '',
    metodo: '',
    status: '',
    account_id: '',
    fatura_id: '',
  });
  // Estados principais
  const { user } = useAuth();
  const { categories } = useCategories();
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // Ordenação padrão: data da transação mais recentes primeiro
  const [sortOrder, setSortOrder] = useState('date_desc');
  const [saldoInicial, setSaldoInicial] = useState(0);
  // Estado para controle do diálogo de transação
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transacao | null>(null);
  // Estados para seleção em massa (se usados no arquivo)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [massCategoryDialogOpen, setMassCategoryDialogOpen] = useState(false);
  const [massAccountDialogOpen, setMassAccountDialogOpen] = useState(false);
  const [massCategory, setMassCategory] = useState('');
  const [massAccount, setMassAccount] = useState('');

  // Memo para mapear contas por id (accountsMap)
  const accountsMap = useMemo(() => {
    const map: Record<string, any> = {};
    contas.forEach((conta) => {
      if (conta.id) map[conta.id] = conta;
    });
    return map;
  }, [contas]);

  // Memo para filtrar transações conforme filtros visuais
  const filteredTransacoes = useMemo(() => {
    let filtered = [...transacoes];
    if (accountFilter && accountFilter !== 'all') {
      filtered = filtered.filter(t => t.account_id === accountFilter);
    }
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(t => t.tipo === typeFilter);
    }
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category_id === categoryFilter);
    }
    if (dateFrom) {
      filtered = filtered.filter(t => t.quando && t.quando >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(t => t.quando && t.quando <= dateTo);
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        (t.estabelecimento?.toLowerCase().includes(search) || '') ||
        (t.detalhes?.toLowerCase().includes(search) || '') ||
        (t.categorias?.nome?.toLowerCase().includes(search) || '')
      );
    }
    // Ordenação
    // Helper para parsear datas em vários formatos (dd/mm/yyyy, yyyy-mm-dd, ISO)
    const parseDateToTime = (dateStr) => {
      if (!dateStr) return 0
      // dd/mm/yyyy
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split('/')
        return new Date(`${y}-${m}-${d}T00:00:00`).getTime()
      }
      // yyyy-mm-dd or ISO
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) return d.getTime()
      return 0
    }

    if (sortOrder === 'created_asc') {
      filtered.sort((a, b) => parseDateToTime(a.created_at) - parseDateToTime(b.created_at))
    } else if (sortOrder === 'created_desc') {
      filtered.sort((a, b) => parseDateToTime(b.created_at) - parseDateToTime(a.created_at))
    } else if (sortOrder === 'date_asc') {
      filtered.sort((a, b) => parseDateToTime(a.quando || a.created_at) - parseDateToTime(b.quando || b.created_at))
    } else if (sortOrder === 'date_desc') {
      filtered.sort((a, b) => parseDateToTime(b.quando || b.created_at) - parseDateToTime(a.quando || a.created_at))
    }
    return filtered;
  }, [transacoes, accountFilter, typeFilter, categoryFilter, dateFrom, dateTo, searchTerm, sortOrder]);

  // Variáveis auxiliares para seleção em massa (após filteredTransacoes)
  const isAllSelected = filteredTransacoes.length > 0 && selectedIds.length === filteredTransacoes.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredTransacoes.length;
  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedIds(filteredTransacoes.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };


  // Função para buscar transações e contas do usuário
  const fetchTransacoes = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Busca contas igual à tela de contas
      const { data: contasData, error: contasError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);
      if (contasError) throw contasError;
      setContas(contasData || []);

      const { data, error } = await supabase
        .from('transacoes')
        .select(`*, categorias:categorias!transacoes_category_id_fkey(id, nome)`) // join categorias
        .eq('userid', user.id)
        .order('quando', { ascending: false });
      if (error) throw error;
      setTransacoes(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar transações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };




  // Memo para receitas, despesas e saldo (usando todas as transações da(s) conta(s) filtrada(s), igual à tela de contas)
  const { receitas, despesas, saldoReal } = useMemo(() => {
    let transacoesParaSaldo = transacoes;
    if (accountFilter && accountFilter !== 'all') {
      transacoesParaSaldo = transacoes.filter(t => t.account_id === accountFilter);
    }
    // Não filtra por data/categoria/tipo para o saldo!
    const receitas = transacoesParaSaldo.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + (t.valor || 0), 0);
    const despesas = transacoesParaSaldo.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + (t.valor || 0), 0);
    return {
      receitas,
      despesas,
      // Em alguns setups as despesas já vêm com sinal negativo no DB.
      // O comportamento esperado (conforme UI) é: saldo = saldoInicial + receitas + despesas
      saldoReal: saldoInicial + receitas + despesas,
    };
  }, [transacoes, accountFilter, saldoInicial]);
  useEffect(() => {
    // Coloque aqui a lógica de efeito colateral, como fetch de dados, listeners, etc.
    // Não retorne JSX!
  }, []);
  // ...código JS/async deve estar fora do return/JSX...

  useEffect(() => {
    if (!user) {
      console.log('[Transacoes] Usuário não está definido ainda.');
      return;
    }
    if (!user.id) {
      console.log('[Transacoes] user.id não está definido:', user);
      return;
    }
    console.log('[Transacoes] Chamando fetchTransacoes para user.id:', user.id);
    fetchTransacoes();
  }, [user]);

  const clearFilters = () => {
    setSearchTerm('')
    setTypeFilter('all')
    setCategoryFilter('all')
    setAccountFilter('all')
    setSortOrder('created_desc')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validação: verificar se a categoria selecionada pertence ao usuário
    if (formData.category_id) {
      const categoryBelongsToUser = categories?.some(cat => cat.id === formData.category_id)
      if (!categoryBelongsToUser) {
        toast({
          title: "Erro de validação",
          description: "A categoria selecionada não é válida para este usuário.",
          variant: "destructive",
        })
        return
      }
    }

    // Categoria é obrigatória no banco (category_id uuid not null)
    if (!formData.category_id) {
      toast({
        title: 'Erro de validação',
        description: 'Selecione uma categoria antes de salvar a transação.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Define status automaticamente conforme método
      let status = formData.status;
      let metodo = formData.metodo;
      if (!status) {
        if (formData.metodo === 'credito') {
          status = 'pendente_fatura';
        } else if (formData.metodo === 'pix' || formData.metodo === 'debito' || formData.metodo === 'transferencia') {
          status = 'pago';
        } else {
          status = '';
        }
      }
      if (!metodo) {
        metodo = '';
      }
      // Normaliza campos UUID vazios para null (Postgres não aceita '')
      const normalizeUuid = (v: any) => {
        if (v === undefined || v === null) return null
        if (typeof v === 'string' && v.trim() === '') return null
        return v
      }

      const transacaoData = {
        quando: formData.quando || null,
        estabelecimento: formData.estabelecimento || null,
        valor: formData.valor || null,
        detalhes: formData.detalhes || null,
        tipo: formData.tipo || null,
        category_id: normalizeUuid(formData.category_id),
        metodo: metodo || null,
        status: status || null,
        account_id: normalizeUuid(formData.account_id), // novo campo
        userid: user?.id || null,
        fatura_id: normalizeUuid(formData.fatura_id),
      }

      // Remove fields that are empty strings (''), Postgres rejects '' for uuid fields
      const payload = Object.fromEntries(
        Object.entries(transacaoData).filter(([_, v]) => v !== '')
      )

      // Debug: mostrar payload antes de enviar (temporário)
      console.debug('[Transacoes] payload before save:', payload)

      if (editingTransaction) {
        const { error } = await supabase
          .from('transacoes')
          .update(payload)
          .eq('id', editingTransaction.id)

        if (error) {
          console.error('[Transacoes] update error:', error)
          throw error
        }
        toast({ title: "Transação atualizada com sucesso!" })
      } else {
        const { error } = await supabase
          .from('transacoes')
          .insert([payload])

        if (error) {
          console.error('[Transacoes] insert error:', error)
          throw error
        }
        toast({ title: "Transação adicionada com sucesso!" })
      }

      setDialogOpen(false)
      setEditingTransaction(null)
      setFormData({
        quando: '',
        estabelecimento: '',
        valor: 0,
        detalhes: '',
        tipo: '',
        category_id: '',
        metodo: '',
        status: '',
        account_id: '',
        fatura_id: '',
      })
      fetchTransacoes()
    } catch (error: any) {
      toast({
        title: "Erro ao salvar transação",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Handler robusto para editar transação
  const handleEdit = (transacao: any) => {
    setEditingTransaction(transacao);
    let accountId = '';
    if (typeof transacao.account_id === 'string' && transacao.account_id) {
      accountId = transacao.account_id;
    } else if (transacao.accounts && typeof transacao.accounts.id === 'string') {
      accountId = transacao.accounts.id;
    } else {
      accountId = '';
    }
    // Normaliza data: se não houver data válida, usa created_at
    let dataNormalizada = '';
    if (transacao.quando && !isNaN(new Date(transacao.quando).getTime())) {
      dataNormalizada = normalizeDate(transacao.quando);
    } else if (transacao.created_at && !isNaN(new Date(transacao.created_at).getTime())) {
      dataNormalizada = normalizeDate(transacao.created_at);
    } else {
      dataNormalizada = '';
    }
    setFormData({
      quando: dataNormalizada,
      estabelecimento: transacao.estabelecimento || '',
      valor: typeof transacao.valor === 'number' && !isNaN(transacao.valor) ? transacao.valor : 0,
      detalhes: transacao.detalhes || '',
      tipo: transacao.tipo || '',
      category_id: transacao.category_id || '',
      metodo: transacao.metodo || '',
      status: transacao.status || '',
      account_id: accountId,
      fatura_id: transacao.fatura_id || '',
    });
    // Garante que o Dialog só abre após o formData ser atualizado
    setTimeout(() => setDialogOpen(true), 0);
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return

    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast({ title: "Transação excluída com sucesso!" })
      fetchTransacoes()
    } catch (error: any) {
      toast({
        title: "Erro ao excluir transação",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteAll = async () => {
    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('userid', user?.id)

      if (error) throw error
      toast({ title: "Todas as transações foram excluídas com sucesso!" })
      fetchTransacoes()
    } catch (error: any) {
      toast({
        title: "Erro ao excluir transações",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Função robusta para formatar datas, evitando "Invalid Date"
  // Função robusta para formatar datas, tentando forçar ISO se vier formato estranho do Supabase
  // Função para exibir a data exatamente como está no banco, mas sempre no formato brasileiro
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Sem data';
    // Se vier dd/mm/yyyy, retorna igual
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return dateString;
    // Se vier yyyy-mm-dd, converte para dd/mm/yyyy
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-');
      return `${d}/${m}/${y}`;
    }
    // Se vier yyyy-mm-ddTHH:MM:SS, pega só a data
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateString)) {
      const [datePart] = dateString.split('T');
      const [y, m, d] = datePart.split('-');
      return `${d}/${m}/${y}`;
    }
    // Se vier outro formato, tenta converter
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) return date.toLocaleDateString('pt-BR');
    return dateString;
  }

  // Função para normalizar data para formato input (YYYY-MM-DD)
  const normalizeDate = (dateString: string | null): string => {
    if (!dateString) return '';
    try {
      // Se já está no formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      // Para outros formatos (ISO, timestamp, etc)
      const date = new Date(dateString);
      // Verifica se a data é válida
      if (isNaN(date.getTime())) {
        return '';
      }
      // Retorna no formato YYYY-MM-DD
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Erro ao normalizar data:', error);
      return '';
    }
  };

  // ...hooks, funções e lógica acima...
  return (


    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Título, descrição e botão Nova Transação alinhados */}
      <div className="flex flex-row items-center justify-between mb-2 mt-2">
        <div>
          <h2 className="text-3xl font-bold leading-tight">Transações</h2>
          <p className="text-muted-foreground text-base">Gerencie suas receitas e despesas</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 h-9 text-sm rounded-md px-4 whitespace-nowrap" onClick={() => { setEditingTransaction(null); setDialogOpen(true); }}>
          + Nova Transação
        </Button>
      </div>

      {/* Dialog de criação/edição de transação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
            <DialogDescription>
              {editingTransaction ? 'Edite os dados da transação.' : 'Preencha os dados para criar uma nova transação.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="quando">Data</Label>
              <Input
                id="quando"
                type="date"
                value={formData.quando}
                onChange={e => setFormData({ ...formData, quando: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="estabelecimento">Estabelecimento</Label>
              <Input
                id="estabelecimento"
                value={formData.estabelecimento}
                onChange={e => setFormData({ ...formData, estabelecimento: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="valor">Valor</Label>
              <Input
                id="valor"
                type="number"
                value={formData.valor}
                onChange={e => setFormData({ ...formData, valor: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={formData.tipo} onValueChange={value => setFormData({ ...formData, tipo: value })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category_id">Categoria</Label>
              <CategorySelector
                value={formData.category_id}
                onValueChange={value => setFormData({ ...formData, category_id: value })}
                placeholder="Selecione a categoria"
                allValue=""
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="detalhes">Detalhes</Label>
              <Textarea
                id="detalhes"
                value={formData.detalhes}
                onChange={e => setFormData({ ...formData, detalhes: e.target.value })}
                className="min-h-[60px] text-sm resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {editingTransaction ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cards de resumo: apenas uma linha, logo abaixo do título/descrição */}
      <TransactionSummaryCards receitas={receitas} despesas={despesas} saldo={saldoReal} />

      {/* Filtros agrupados em card visual, duas linhas, sem botão dentro */}
      <div className="mb-4">
        <div className="bg-muted/10 border border-muted-foreground/10 rounded-xl p-4 flex flex-col gap-2 w-full">
          <div className="flex flex-row gap-2 w-full">
            <Input
              placeholder="Pesquisar transações..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-9 text-sm rounded-md px-3 bg-background border border-muted-foreground/20 focus:ring-2 focus:ring-primary/30 shadow-sm w-[220px]"
            />
            <Select value={typeFilter} onValueChange={value => setTypeFilter(value && value !== '' ? value : 'all')}>
              <SelectTrigger className="h-9 text-sm rounded-md bg-background border border-muted-foreground/20 w-[120px]">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
            <CategorySelector
              value={categoryFilter}
              onValueChange={value => setCategoryFilter(value && value !== '' ? value : 'all')}
              placeholder="Todas categorias"
              allValue="all"
              className="h-9 text-sm rounded-md bg-background border border-muted-foreground/20 w-[150px]"
            />
          </div>
          <div className="flex flex-row gap-2 w-full">
            <Select
              value={accountFilter && accountFilter !== '' ? accountFilter : 'all'}
              onValueChange={value => setAccountFilter(value && value !== '' ? value : 'all')}
            >
              <SelectTrigger className="h-9 text-sm rounded-md bg-background border border-muted-foreground/20 w-[150px]">
                <SelectValue placeholder="Todas contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas contas</SelectItem>
                {accountsMap && Object.entries(accountsMap)
                  .filter(([id, acc]) => id && id !== '' && id !== null && id !== undefined)
                  .map(([id, acc]) => (
                    <SelectItem key={id} value={id}>{acc.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              type="text"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 text-sm rounded-md bg-background border border-muted-foreground/20 w-[120px]"
              placeholder="dd/mm/aaaa"
              maxLength={10}
            />
            <Input
              type="text"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 text-sm rounded-md bg-background border border-muted-foreground/20 w-[120px]"
              placeholder="dd/mm/aaaa"
              maxLength={10}
            />
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="h-9 text-sm flex items-center rounded-md bg-background border border-muted-foreground/20 w-[120px]">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue>
                  {sortOrder === 'date_desc' ? 'Ordenar' : sortOrder === 'date_asc' ? 'Ordenar' : 'Ordenar'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Data da transação ↓</SelectItem>
                <SelectItem value="date_asc">Data da transação ↑</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Lista de transações */}
      <div className="grid gap-3 sm:gap-4">
        {filteredTransacoes.length === 0 ? (
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                {transacoes.length === 0 ? 'Nenhuma transação encontrada' : 'Nenhuma transação encontrada com os filtros aplicados'}
              </p>
              <Button onClick={() => { setEditingTransaction(null); setDialogOpen(true); }} size="sm" className="bg-primary hover:bg-primary/90">
                Adicionar primeira transação
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredTransacoes.map((transacao) => (
            <Card key={transacao.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {transacao.tipo === 'receita' ? (
                          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-sm sm:text-base line-clamp-1">
                          {transacao.estabelecimento || 'Sem estabelecimento'}
                        </h3>
                      </div>
                      {transacao.tipo === 'receita' ? (
                        <Badge variant="default" className="self-start text-xs px-5 py-1.5 rounded-2xl bg-gradient-to-r from-green-500/90 to-green-700/90 text-white border-none font-bold tracking-wide shadow-md drop-shadow-sm" style={{letterSpacing: 0.5}}>
                          Receita
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="self-start text-xs px-5 py-1.5 rounded-2xl bg-gradient-to-r from-red-500/90 to-red-700/90 text-white border-none font-bold tracking-wide shadow-md drop-shadow-sm" style={{letterSpacing: 0.5}}>
                          Despesa
                        </Badge>
                      )}
                      <span className={`font-bold text-base sm:text-lg ${transacao.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                        {transacao.tipo === 'receita' ? '+' : '-'}R$ {formatCurrency(Math.abs(transacao.valor || 0))}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Categoria: {transacao.categorias?.nome || 'Sem categoria'}</span>
                      <span>Conta: {accountsMap?.[transacao.account_id || '']?.name || 'Sem conta'}</span>
                      <span>Data: {formatDate(transacao.quando)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(transacao)} aria-label="Editar transação">
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" type="button" className="h-8 w-8 p-0 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" aria-label="Remover transação">
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover transação</AlertDialogTitle>
                          <AlertDialogDescription>Tem certeza que deseja remover esta transação? Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(transacao.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default Transacoes;
