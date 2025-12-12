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
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, ArrowUpDown, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
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
  // mês/ano para filtro rápido (igual ao Dashboard)
  const [filterMonth, setFilterMonth] = useState<string>(new Date().getMonth().toString())
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString())
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




  // Memo para receitas, despesas e saldo (calcula saldo agregado por conta como no Dashboard)
  const { receitas, despesas, saldoReal } = useMemo(() => {
    // Soma do saldo inicial de todas as contas (valores absolutos, tratando tipo)
    const totalSaldoInicial = contas.reduce((acc, conta) => {
      const s = (typeof conta.saldo_inicial !== 'undefined' && conta.saldo_inicial !== null)
        ? Number(conta.saldo_inicial)
        : (typeof conta.saldoInicial !== 'undefined' && conta.saldoInicial !== null ? Number(conta.saldoInicial) : 0)
      return acc + Math.abs(isNaN(s) ? 0 : s)
    }, 0)

    // Soma todas as receitas/despesas com valores absolutos
    const receitasGlobais = transacoes.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)
    const despesasGlobais = transacoes.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)

    // Saldo = saldo inicial + receitas - despesas (todos valores absolutos)
    const saldoAggregate = totalSaldoInicial + receitasGlobais - despesasGlobais

    // Debug
    console.log('📊 Cálculo do Saldo:', {
      contas: contas.length,
      totalSaldoInicial,
      receitasGlobais,
      despesasGlobais,
      saldoAggregate,
      formula: `${totalSaldoInicial} + ${receitasGlobais} - ${despesasGlobais} = ${saldoAggregate}`,
      contasDetalhes: contas.map(c => ({ 
        name: c.name || c.nome, 
        saldo_inicial: c.saldo_inicial,
        saldoInicial: c.saldoInicial 
      }))
    })

    return {
      receitas: receitasGlobais,
      despesas: despesasGlobais,
      saldoReal: saldoAggregate,
    }
  }, [transacoes, contas])

  // Parser de data reutilizável (normaliza para UTC midnight)
  const parseToDate = (dateStr?: string | null): Date | null => {
    if (!dateStr) return null
    const s = String(dateStr).trim()
    const dmYMatch = s.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/)
    if (dmYMatch) {
      const d = Number(dmYMatch[1])
      const m = Number(dmYMatch[2])
      const y = Number(dmYMatch[3])
      const fullYear = y < 100 ? 2000 + y : y
      return new Date(Date.UTC(fullYear, m - 1, d))
    }
    const dt = new Date(s)
    if (isNaN(dt.getTime())) return null
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()))
  }

  // Totais para o mês/ano selecionado
  const { receitasMes, despesasMes, transacoesCountMes } = useMemo(() => {
    const monthIndex = (() => { const m = parseInt(filterMonth); return isNaN(m) ? new Date().getMonth() : (m > 11 ? m - 1 : m) })()
    const yearNum = parseInt(filterYear) || new Date().getFullYear()
    const filtered = transacoes.filter(t => {
      const dt = parseToDate(t.quando || t.created_at)
      if (!dt) return false
      return dt.getUTCMonth() === monthIndex && dt.getUTCFullYear() === yearNum
    })
    const receitasMes = filtered.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)
    const despesasMes = filtered.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)
    return { receitasMes, despesasMes, transacoesCountMes: filtered.length }
  }, [transacoes, filterMonth, filterYear])
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
        if (formData.metodo === 'cartao_credito') {
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

      // (debug removed)

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
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id)
        .eq('userid', user.id)

      if (error) {
        console.error('Erro ao excluir:', error)
        throw error
      }
      
      toast({ title: "Transação excluída com sucesso!" })
      fetchTransacoes()
    } catch (error: any) {
      console.error('Erro ao excluir transação:', error)
      toast({
        title: "Erro ao excluir transação",
        description: error.message || "Erro de conexão. Verifique sua internet.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAll = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('userid', user.id)

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

  // Handlers para ações em massa
  const handleMassDelete = async () => {
    if (selectedIds.length === 0) return
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      })
      return
    }
    
    console.log('Tentando excluir IDs:', selectedIds, 'User ID:', user.id)
    
    // Mostrar loading
    toast({
      title: "Excluindo...",
      description: `Excluindo ${selectedIds.length} transações...`,
    })
    
    try {
      // Deletar um por um para evitar problemas com RLS
      let errors = []
      let deleted = 0
      
      for (const id of selectedIds) {
        try {
          const { error, data } = await supabase
            .from('transacoes')
            .delete()
            .eq('id', id)
            .eq('userid', user.id)
            .select()
          
          console.log(`Tentativa de excluir ${id}:`, { error, data })
          
          if (error) {
            console.error(`Erro ao excluir transação ${id}:`, error)
            errors.push({ id, error })
          } else {
            deleted++
          }
        } catch (networkError: any) {
          console.error(`Erro de rede ao excluir ${id}:`, networkError)
          errors.push({ id, error: networkError })
        }
      }
      
      if (deleted > 0) {
        toast({ 
          title: `${deleted} transações excluídas!`,
          description: errors.length > 0 ? `${errors.length} falharam` : undefined,
          variant: errors.length > 0 ? "default" : "default"
        })
        setSelectedIds([])
        fetchTransacoes()
      } else {
        throw new Error(`Nenhuma transação foi excluída. Verifique sua conexão com o servidor.`)
      }
      
    } catch (error: any) {
      console.error('Erro final:', error)
      toast({
        title: "Erro ao excluir transações",
        description: "Verifique sua conexão com o servidor Supabase. Erro: " + (error.message || "Failed to fetch"),
        variant: "destructive",
      })
    }
  }

  const handleMassDeleteOld = async () => {
    if (selectedIds.length === 0) return
    if (!user) return
    
    try {
      // Tenta em lote primeiro
      const { error, data } = await supabase
        .from('transacoes')
        .delete()
        .in('id', selectedIds)
        .eq('userid', user.id)
        .select()
      
      console.log('Resultado delete em lote:', { error, data, selectedIds })
      
      if (error) throw error
      
      toast({ title: `${selectedIds.length} transações excluídas!` })
      setSelectedIds([])
      fetchTransacoes()
    } catch (error: any) {
      console.error('Erro exclusão em lote:', error)
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleMassUpdateCategory = async () => {
    if (selectedIds.length === 0 || !massCategory) return
    try {
      const { error } = await supabase
        .from('transacoes')
        .update({ category_id: massCategory })
        .in('id', selectedIds)
      if (error) throw error
      toast({ title: `Categoria atualizada para ${selectedIds.length} transações!` })
      setSelectedIds([])
      setMassCategoryDialogOpen(false)
      setMassCategory('')
      fetchTransacoes()
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleMassUpdateAccount = async () => {
    if (selectedIds.length === 0 || !massAccount) return
    try {
      const { error } = await supabase
        .from('transacoes')
        .update({ account_id: massAccount })
        .in('id', selectedIds)
      if (error) throw error
      toast({ title: `Conta atualizada para ${selectedIds.length} transações!` })
      setSelectedIds([])
      setMassAccountDialogOpen(false)
      setMassAccount('')
      fetchTransacoes()
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar conta",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const [massDate, setMassDate] = useState('')
  const [massDateDialogOpen, setMassDateDialogOpen] = useState(false)

  const handleMassUpdateDate = async () => {
    if (selectedIds.length === 0 || !massDate) return
    try {
      const { error} = await supabase
        .from('transacoes')
        .update({ quando: massDate })
        .in('id', selectedIds)
      if (error) throw error
      toast({ title: `Data atualizada para ${selectedIds.length} transações!` })
      setSelectedIds([])
      setMassDateDialogOpen(false)
      setMassDate('')
      fetchTransacoes()
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar data",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleExportToExcel = () => {
    // Exporta apenas as transações selecionadas
    const selectedTransacoes = filteredTransacoes.filter(t => selectedIds.includes(t.id))
    
    if (selectedTransacoes.length === 0) {
      toast({ 
        title: 'Nenhuma transação selecionada',
        description: 'Selecione ao menos uma transação para exportar.',
        variant: 'destructive'
      })
      return
    }

    // Adiciona saldos iniciais das contas como transações
    const saldosIniciais = contas
      .filter(c => {
        const saldo = (typeof c.saldo_inicial !== 'undefined' && c.saldo_inicial !== null)
          ? Number(c.saldo_inicial)
          : (typeof c.saldoInicial !== 'undefined' && c.saldoInicial !== null ? Number(c.saldoInicial) : 0)
        return !isNaN(saldo) && saldo !== 0
      })
      .map(c => {
        const saldo = (typeof c.saldo_inicial !== 'undefined' && c.saldo_inicial !== null)
          ? Number(c.saldo_inicial)
          : (typeof c.saldoInicial !== 'undefined' && c.saldoInicial !== null ? Number(c.saldoInicial) : 0)
        return {
          'Data': c.created_at ? formatDate(c.created_at) : 'Saldo Inicial',
          'Estabelecimento': 'Saldo Inicial da Conta',
          'Tipo': saldo >= 0 ? 'Receita' : 'Despesa',
          'Valor': Math.abs(saldo),
          'Categoria': 'Saldo Inicial',
          'Conta': c.name || c.nome || 'Sem nome',
          'Método': '',
          'Status': '',
          'Detalhes': 'Saldo inicial cadastrado na conta'
        }
      })

    // Prepara os dados das transações para exportação
    const dataToExport = selectedTransacoes.map(t => ({
      'Data': formatDate(t.quando || t.created_at),
      'Estabelecimento': t.estabelecimento || 'Sem estabelecimento',
      'Tipo': t.tipo === 'receita' ? 'Receita' : 'Despesa',
      'Valor': Math.abs(parseFloat(String(t.valor || 0))),
      'Categoria': t.categorias?.nome || 'Sem categoria',
      'Conta': accountsMap?.[t.account_id || '']?.name || 'Sem conta',
      'Método': t.metodo === 'cartao_credito' ? 'Cartão de Crédito' : t.metodo || '',
      'Status': t.status || '',
      'Detalhes': t.detalhes || ''
    }))

    // Combina saldos iniciais com transações
    const allData = [...saldosIniciais, ...dataToExport]

    // Cria worksheet e workbook
    const ws = XLSX.utils.json_to_sheet(allData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transações')

    // Formata coluna de Valor como moeda
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: 3 }) // Coluna D (Valor)
      if (ws[cellAddress]) {
        ws[cellAddress].z = 'R$ #,##0.00'
      }
    }

    // Define larguras das colunas
    ws['!cols'] = [
      { wch: 12 },  // Data
      { wch: 25 },  // Estabelecimento
      { wch: 10 },  // Tipo
      { wch: 15 },  // Valor
      { wch: 20 },  // Categoria
      { wch: 20 },  // Conta
      { wch: 18 },  // Método
      { wch: 12 },  // Status
      { wch: 30 },  // Detalhes
    ]

    // Faz o download
    XLSX.writeFile(wb, `transacoes_${new Date().toISOString().split('T')[0]}.xlsx`)
    
    toast({ title: `${allData.length} registros exportados com sucesso (${saldosIniciais.length} saldos iniciais + ${dataToExport.length} transações)!` })
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
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button 
              variant="outline" 
              className="h-9 text-sm rounded-md px-4 whitespace-nowrap" 
              onClick={handleExportToExcel}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          )}
          <Button className="bg-primary hover:bg-primary/90 h-9 text-sm rounded-md px-4 whitespace-nowrap" onClick={() => { setEditingTransaction(null); setDialogOpen(true); }}>
            + Nova Transação
          </Button>
        </div>
      </div>

      {/* Dialog de criação/edição de transação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md w-full bg-black/70 backdrop-blur-sm border-primary/20">
          {/* Header com gradiente e ícone */}
          <DialogHeader className="bg-gradient-to-r from-primary/10 to-transparent p-4 -m-6 mb-4 border-b border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
                <DialogDescription className="text-xs">
                  {editingTransaction ? 'Edite os dados da transação.' : 'Preencha os dados para criar uma nova transação.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quando" className="text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Data
                </Label>
                <Input
                  id="quando"
                  type="date"
                  className="bg-background/50"
                  value={formData.quando}
                  onChange={e => setFormData({ ...formData, quando: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="valor" className="text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Valor
                </Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  className="bg-background/50"
                  value={formData.valor}
                  onChange={e => setFormData({ ...formData, valor: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="estabelecimento" className="text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Estabelecimento
              </Label>
              <Input
                id="estabelecimento"
                className="bg-background/50"
                value={formData.estabelecimento}
                onChange={e => setFormData({ ...formData, estabelecimento: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo" className="text-sm font-medium">Tipo</Label>
                <Select value={formData.tipo} onValueChange={value => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger className="h-9 text-sm bg-background/50">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="metodo" className="text-sm font-medium">Método</Label>
                <Select value={formData.metodo} onValueChange={value => setFormData({ ...formData, metodo: value })}>
                  <SelectTrigger className="h-9 text-sm bg-background/50">
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="category_id" className="text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Categoria
              </Label>
              <CategorySelector
                value={formData.category_id}
                onValueChange={value => setFormData({ ...formData, category_id: value })}
                placeholder="Selecione a categoria"
                allValue=""
                className="h-9 text-sm bg-background/50"
              />
            </div>
            <div>
              <Label htmlFor="account_id" className="text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Conta
              </Label>
              <BankSelector
                value={formData.account_id}
                onValueChange={value => setFormData({ ...formData, account_id: value })}
                placeholder="Selecione a conta (opcional)"
              />
            </div>
            {formData.metodo === 'cartao_credito' && (
              <div>
                <Label htmlFor="card_account_id" className="text-sm font-medium">Cartão</Label>
                <CardSelector
                  value={formData.account_id}
                  onValueChange={value => setFormData({ ...formData, account_id: value })}
                  placeholder="Selecione o cartão (opcional)"
                />
              </div>
            )}
            <div>
              <Label htmlFor="detalhes" className="text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Detalhes (opcional)
              </Label>
              <Textarea
                id="detalhes"
                value={formData.detalhes}
                onChange={e => setFormData({ ...formData, detalhes: e.target.value })}
                className="min-h-[60px] text-sm resize-none bg-background/50"
              />
            </div>
            <div className="bg-secondary/30 -mx-6 -mb-6 p-4 border-t border-border/50 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {editingTransaction ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Seletor de mês/ano igual ao Dashboard e Cards de resumo (totais do período + saldo atualizado) */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-9 text-sm w-40">
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
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="h-9 text-sm w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <span className="text-sm text-muted-foreground">Filtro: {new Date(0, parseInt(filterMonth)).toLocaleDateString('pt-BR', { month: 'long' })} / {filterYear} • Transações no período: <b>{transacoesCountMes}</b></span>
        </div>
      </div>

      <TransactionSummaryCards receitas={receitasMes} despesas={despesasMes} saldo={saldoReal} />

      {/* Barra de ações em massa */}
      {selectedIds.length > 0 && (
        <Card className="mb-4 border-primary">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">
                {selectedIds.length} {selectedIds.length === 1 ? 'transação selecionada' : 'transações selecionadas'}
              </span>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setMassCategoryDialogOpen(true)}>
                  Alterar Categoria
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMassDateDialogOpen(true)}>
                  Alterar Data
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMassAccountDialogOpen(true)}>
                  Alterar Conta
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      Excluir Selecionadas
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir transações selecionadas</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir {selectedIds.length} {selectedIds.length === 1 ? 'transação' : 'transações'}? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleMassDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                  Limpar Seleção
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog para alterar categoria em massa */}
      <Dialog open={massCategoryDialogOpen} onOpenChange={setMassCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Categoria</DialogTitle>
            <DialogDescription>
              Selecione a nova categoria para {selectedIds.length} {selectedIds.length === 1 ? 'transação' : 'transações'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Categoria</Label>
              <CategorySelector
                value={massCategory}
                onValueChange={setMassCategory}
                placeholder="Selecione a categoria"
                allValue=""
                className="h-9 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMassCategoryDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleMassUpdateCategory} disabled={!massCategory}>
                Atualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para alterar data em massa */}
      <Dialog open={massDateDialogOpen} onOpenChange={setMassDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Data</DialogTitle>
            <DialogDescription>
              Selecione a nova data para {selectedIds.length} {selectedIds.length === 1 ? 'transação' : 'transações'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={massDate}
                onChange={e => setMassDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMassDateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleMassUpdateDate} disabled={!massDate}>
                Atualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para alterar conta em massa */}
      <Dialog open={massAccountDialogOpen} onOpenChange={setMassAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Conta</DialogTitle>
            <DialogDescription>
              Selecione a nova conta para {selectedIds.length} {selectedIds.length === 1 ? 'transação' : 'transações'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Conta</Label>
              <BankSelector
                value={massAccount}
                onValueChange={setMassAccount}
                placeholder="Selecione a conta"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMassAccountDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleMassUpdateAccount} disabled={!massAccount}>
                Atualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Checkbox Selecionar Tudo */}
      {filteredTransacoes.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            id="select-all"
          />
          <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            Selecionar todas ({filteredTransacoes.length})
          </Label>
        </div>
      )}

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
          filteredTransacoes.map((transacao) => {
            const isReceita = transacao.tipo === 'receita';
            return (
              <Card key={transacao.id} className={`overflow-hidden border-l-4 hover:shadow-lg transition-all ${
                selectedIds.includes(transacao.id) ? 'ring-2 ring-primary' : ''
              } ${isReceita ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <CardContent className="p-0">
                  {/* Header com gradiente */}
                  <div className={`bg-gradient-to-r p-4 border-b border-border/50 ${
                    isReceita ? 'from-green-500/10 to-transparent' : 'from-red-500/10 to-transparent'
                  }`}>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedIds.includes(transacao.id)}
                        onCheckedChange={() => handleToggleSelect(transacao.id)}
                      />
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isReceita ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {isReceita ? (
                          <TrendingUp className={`h-5 w-5 text-green-500`} />
                        ) : (
                          <TrendingDown className={`h-5 w-5 text-red-500`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base line-clamp-1">
                          {transacao.estabelecimento || 'Sem estabelecimento'}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {transacao.categorias?.nome || 'Sem categoria'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-base sm:text-lg font-bold ${isReceita ? 'text-green-500' : 'text-red-500'}`}>
                          {isReceita ? '+' : '-'}{formatCurrency(Math.abs(transacao.valor || 0))}
                        </p>
                        <Badge variant={isReceita ? 'default' : 'destructive'} className={`text-xs mt-1 ${
                          isReceita ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {isReceita ? 'Receita' : 'Despesa'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatDate(transacao.quando)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <span>{accountsMap?.[transacao.account_id || '']?.name || 'Sem conta'}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(transacao)} className="h-8 gap-1.5" aria-label="Editar transação">
                          <Edit className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-xs">Editar</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" type="button" className="h-8 gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10" aria-label="Remover transação">
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline text-xs">Excluir</span>
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
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Transacoes;
