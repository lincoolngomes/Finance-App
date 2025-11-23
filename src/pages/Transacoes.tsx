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
import { useAccountsMap } from '@/hooks/useAccountsMap'
import { toast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'


interface Transacao {
  id: number
  created_at: string
  quando: string | null
  estabelecimento: string | null
  valor: number | null
  detalhes: string | null
  tipo: string | null
  category_id: string
  userid: string | null
  metodo?: string | null
  status?: string | null
  fatura_id?: string | null
  categorias?: {
    id: string
    nome: string
  }
  account_id?: string // id da conta/cartão vinculado
  accounts?: {
    id: string
    name: string
    type: string
  }
}

export default function Transacoes() {
  const [accountFilter, setAccountFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { user } = useAuth()
  const { categories } = useCategories()
  const accountsMap = useAccountsMap()
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transacao | null>(null)
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Ordenação
  const [sortOrder, setSortOrder] = useState('created_desc') // created_desc, created_asc, date_desc, date_asc

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
  })

  // Transações filtradas e ordenadas
  const filteredTransacoes = useMemo(() => {
    let filtered = transacoes.filter(transacao => {
      const searchLower = searchTerm.toLowerCase();
      const matchesEstabelecimento = transacao.estabelecimento?.toLowerCase().includes(searchLower) ?? false;
      const matchesCategoria = transacao.categorias?.nome?.toLowerCase().includes(searchLower) ?? false;
      const matchesDetalhes = transacao.detalhes?.toLowerCase().includes(searchLower) ?? false;
      const matchesData = transacao.quando?.includes(searchTerm) ?? false;
      const matchesValor = transacao.valor?.toString().includes(searchTerm) ?? false;
      const matchesSearch = !searchTerm || matchesEstabelecimento || matchesCategoria || matchesDetalhes || matchesData || matchesValor;
      const matchesType = typeFilter === 'all' || !typeFilter ? true : transacao.tipo === typeFilter;
      const matchesCategory = categoryFilter === 'all' || !categoryFilter ? true : transacao.category_id === categoryFilter;
      const matchesAccount = accountFilter === 'all' || !accountFilter ? true : transacao.account_id === accountFilter;
      const matchesDateFrom = !dateFrom || (transacao.quando && transacao.quando >= dateFrom);
      const matchesDateTo = !dateTo || (transacao.quando && transacao.quando <= dateTo);
      return matchesSearch && matchesType && matchesCategory && matchesAccount && matchesDateFrom && matchesDateTo;
    });
    // Ordenação
    return filtered.sort((a, b) => {
      if (sortOrder === 'date_desc') {
        const dateA = a.quando ? new Date(a.quando) : new Date(a.created_at);
        const dateB = b.quando ? new Date(b.quando) : new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      } else if (sortOrder === 'date_asc') {
        const dateA = a.quando ? new Date(a.quando) : new Date(a.created_at);
        const dateB = b.quando ? new Date(b.quando) : new Date(b.created_at);
        return dateA.getTime() - dateB.getTime();
      }
      return 0;
    });
  }, [transacoes, searchTerm, typeFilter, categoryFilter, accountFilter, dateFrom, dateTo, sortOrder]);

  // Seleção em massa (agora após filteredTransacoes)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  // Estados para dialogs de edição em massa
  const [massCategoryDialogOpen, setMassCategoryDialogOpen] = useState(false);
  const [massCategory, setMassCategory] = useState("");
  const [massAccountDialogOpen, setMassAccountDialogOpen] = useState(false);
  const [massAccount, setMassAccount] = useState("");

  // Handler para aplicar categoria em massa
  const handleMassCategoryChange = async () => {
    if (!massCategory || selectedIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('transacoes')
        .update({ category_id: massCategory })
        .in('id', selectedIds);
      if (error) throw error;
      toast({ title: `Categoria alterada em ${selectedIds.length} transação(ões)!` });
      setMassCategoryDialogOpen(false);
      setMassCategory("");
      setSelectedIds([]);
      fetchTransacoes();
    } catch (error: any) {
      toast({
        title: 'Erro ao mudar categoria',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Handler para aplicar conta em massa
  const handleMassAccountChange = async () => {
    if (!massAccount || selectedIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('transacoes')
        .update({ account_id: massAccount })
        .in('id', selectedIds);
      if (error) throw error;
      toast({ title: `Conta alterada em ${selectedIds.length} transação(ões)!` });
      setMassAccountDialogOpen(false);
      setMassAccount("");
      setSelectedIds([]);
      fetchTransacoes();
    } catch (error: any) {
      toast({
        title: 'Erro ao mudar conta',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  const isAllSelected = useMemo(() =>
    filteredTransacoes.length > 0 && selectedIds.length === filteredTransacoes.length,
    [filteredTransacoes, selectedIds]
  );
  const isIndeterminate = useMemo(() =>
    selectedIds.length > 0 && selectedIds.length < filteredTransacoes.length,
    [filteredTransacoes, selectedIds]
  );
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedIds(filteredTransacoes.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };
  const handleSelectOne = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  const handleRemoveSelected = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Tem certeza que deseja remover ${selectedIds.length} transação(ões)?`)) return;
    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .in('id', selectedIds);
      if (error) throw error;
      toast({ title: `${selectedIds.length} transação(ões) removida(s)!` });
      setSelectedIds([]);
      fetchTransacoes();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover transações',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Cálculo dos totais
  const { receitas, despesas, saldo } = useMemo(() => {
    const receitas = filteredTransacoes
      .filter(t => t.tipo === 'receita')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    const despesas = filteredTransacoes
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    return {
      receitas,
      despesas,
      saldo: receitas - despesas
    }
  }, [filteredTransacoes])

  const fetchTransacoes = async () => {
    try {
      console.log('[fetchTransacoes] user?.id:', user?.id);
      const { data, error } = await supabase
        .from('transacoes')
        .select(`
          *,
          categorias!transacoes_category_id_fkey (
            id,
            nome
          ),
          accounts:account_id (
            id,
            name,
            type
          )
        `)
        .eq('userid', user?.id)
        .order('created_at', { ascending: false })

      console.log('[fetchTransacoes] resultado data:', data);
      if (error) {
        console.error('[fetchTransacoes] erro:', error);
        throw error;
      }
      setTransacoes(data || [])
    } catch (error: any) {
      toast({
        title: "Erro ao carregar transações",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

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
      const transacaoData = {
        quando: formData.quando,
        estabelecimento: formData.estabelecimento,
        valor: formData.valor,
        detalhes: formData.detalhes,
        tipo: formData.tipo,
        category_id: formData.category_id,
        metodo,
        status,
        account_id: formData.account_id, // novo campo
        userid: user?.id,
      }

      if (editingTransaction) {
        const { error } = await supabase
          .from('transacoes')
          .update(transacaoData)
          .eq('id', editingTransaction.id)

        if (error) throw error
        toast({ title: "Transação atualizada com sucesso!" })
      } else {
        const { error } = await supabase
          .from('transacoes')
          .insert([transacaoData])

        if (error) throw error
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

  const handleEdit = (transacao: any) => {
    setEditingTransaction(transacao)
    let accountId = ''
    if (typeof transacao.account_id === 'string' && transacao.account_id) {
      accountId = transacao.account_id
    } else if (transacao.accounts && typeof transacao.accounts.id === 'string') {
      accountId = transacao.accounts.id
    } else {
      accountId = ''
    }
    // Garante que é string e corresponde a uma conta do tipo 'banco'
    accountId = accountId ? String(accountId) : ''
    setFormData({
      quando: transacao.quando ? normalizeDate(transacao.quando) : normalizeDate(transacao.created_at),
      estabelecimento: transacao.estabelecimento || '',
      valor: typeof transacao.valor === 'number' && !isNaN(transacao.valor) ? transacao.valor : 0,
      detalhes: transacao.detalhes || '',
      tipo: transacao.tipo || '',
      category_id: transacao.category_id || '',
      metodo: transacao.metodo || '',
      status: transacao.status || '',
      account_id: accountId,
      fatura_id: transacao.fatura_id || '',
    })
    setDialogOpen(true)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  // Função para normalizar data para formato input (YYYY-MM-DD)
  const normalizeDate = (dateString: string | null): string => {
    if (!dateString) return ''
    
    try {
      // Se já está no formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString
      }
      
      // Para outros formatos (ISO, timestamp, etc)
      const date = new Date(dateString)
      
      // Verifica se a data é válida
      if (isNaN(date.getTime())) {
        return ''
      }
      
      // Retorna no formato YYYY-MM-DD
      return date.toISOString().split('T')[0]
    } catch (error) {
      console.error('Erro ao normalizar data:', error)
      return ''
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center sm:gap-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Transações</h2>
          <p className="text-muted-foreground text-sm sm:text-base">Gerencie suas receitas e despesas</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Nova Transação</span>
              </Button>
            </DialogTrigger>
            {/* DialogContent do formulário de transação aqui (pode ser simplificado para foco visual) */}
          </Dialog>
        </div>
      </div>

      <TransactionSummaryCards 
        receitas={receitas}
        despesas={despesas}
        saldo={saldo}
      />

      {/* Filtros principais */}
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <Input
          placeholder="Pesquisar transações..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="h-9 text-sm min-w-[180px]"
        />
        {/* Adicione aqui os outros filtros conforme necessário (tipo, categoria, conta, datas, ordenação) */}
      </div>

      {/* Menu de ações em massa */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 items-center bg-muted/40 rounded p-2 border border-muted-foreground/10">
          <span className="text-sm">{selectedIds.length} selecionada(s)</span>
          <Button size="sm" variant="outline" onClick={handleRemoveSelected} className="text-destructive border-destructive">
            <Trash2 className="w-4 h-4 mr-1" /> Remover
          </Button>
          {/* Botão para mudar categoria em massa */}
          <Dialog open={massCategoryDialogOpen} onOpenChange={setMassCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-primary text-primary">
                Mudar Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Mudar categoria das selecionadas</DialogTitle>
              </DialogHeader>
              <CategorySelector
                value={massCategory}
                onValueChange={setMassCategory}
                placeholder="Selecione a nova categoria"
              />
              <Button
                onClick={handleMassCategoryChange}
                disabled={!massCategory}
                className="w-full mt-2"
              >
                Aplicar Categoria
              </Button>
            </DialogContent>
          </Dialog>
          {/* Botão para mudar conta em massa */}
          <Dialog open={massAccountDialogOpen} onOpenChange={setMassAccountDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-primary text-primary">
                Mudar Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Mudar conta das selecionadas</DialogTitle>
              </DialogHeader>
              <BankSelector
                value={massAccount}
                onValueChange={setMassAccount}
                placeholder="Selecione a nova conta"
              />
              <Button
                onClick={handleMassAccountChange}
                disabled={!massAccount}
                className="w-full mt-2"
              >
                Aplicar Conta
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Lista de transações */}
      <div className="grid gap-3 sm:gap-4">
        {filteredTransacoes.length > 0 && (
          <div className="flex items-center gap-2 px-2">
            <Checkbox
              checked={isAllSelected}
              indeterminate={isIndeterminate}
              onCheckedChange={handleSelectAll}
              aria-label="Selecionar todas"
            />
            <span className="text-xs text-muted-foreground">Selecionar todas</span>
          </div>
        )}
        {loading ? (
          <div className="space-y-3 sm:space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-3 sm:h-4 bg-gray-200 rounded w-24 sm:w-32"></div>
                      <div className="h-2 sm:h-3 bg-gray-200 rounded w-16 sm:w-20"></div>
                    </div>
                    <div className="h-5 sm:h-6 bg-gray-200 rounded w-16 sm:w-20"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTransacoes.length === 0 ? (
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                {transacoes.length === 0 ? 'Nenhuma transação encontrada' : 'Nenhuma transação encontrada com os filtros aplicados'}
              </p>
              <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-primary hover:bg-primary/90">
                Adicionar primeira transação
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredTransacoes.map((transacao) => (
            <Card key={transacao.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  {/* Checkbox de seleção individual */}
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={selectedIds.includes(transacao.id)}
                      onCheckedChange={() => handleSelectOne(transacao.id)}
                      aria-label="Selecionar transação"
                    />
                  </div>
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
                      <Badge variant={transacao.tipo === 'receita' ? 'default' : 'destructive'} className="self-start text-xs">
                        {transacao.tipo}
                      </Badge>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                      {transacao.categorias && (
                        <p className="line-clamp-1">Categoria: {transacao.categorias.nome}</p>
                      )}
                      {accountsMap && transacao.account_id && accountsMap[transacao.account_id] && (
                        <p className="line-clamp-1">
                          Conta: {accountsMap[transacao.account_id].name}
                        </p>
                      )}
                      <p>Data: {formatDate(transacao.quando || transacao.created_at)}</p>
                      {transacao.status && (
                        <p className="line-clamp-1">Status: {transacao.status === 'a_pagar' ? 'A pagar' : transacao.status === 'pago' ? 'Pago' : transacao.status === 'pendente_fatura' ? 'Pendente Fatura' : transacao.status}</p>
                      )}
                      {transacao.detalhes && (
                        <p className="line-clamp-2 sm:line-clamp-1">Detalhes: {transacao.detalhes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className={`text-base sm:text-lg md:text-xl font-bold text-center sm:text-right ${
                      transacao.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transacao.tipo === 'receita' ? '+' : '-'}
                      {formatCurrency(Math.abs(transacao.valor || 0))}
                    </div>
                    <div className="flex justify-center sm:justify-start gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(transacao)}
                        className="h-8 w-8 p-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(transacao.id)}
                        className="h-8 w-8 p-0 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
