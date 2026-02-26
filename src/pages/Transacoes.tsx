import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePicker } from '@/components/ui/date-picker'
import { TransactionSummaryCards } from '@/components/transactions/TransactionSummaryCards'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { CategorySelector } from '@/components/transactions/CategorySelector'
import { BankSelector, CardSelector } from '@/components/accounts/BankAndCardSelector'
import { GerenciarFaturasModal } from '@/components/faturas/GerenciarFaturasModal'
import { ImportarFaturaModal } from '@/components/faturas/ImportarFaturaModal'
import { ImportarExtratoModal } from '@/components/extratos/ImportarExtratoModal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCategories } from '@/hooks/useCategories'
// import { useAccountsMap } from '@/hooks/useAccountsMap'
import { toast } from '@/hooks/use-toast'
import { Edit, Trash2, TrendingUp, TrendingDown, ArrowUpDown, Download, Clock, DollarSign, Wallet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { formatCurrency } from '@/utils/currency'
import { categorizar } from '@/utils/categorizacao'
import { addMonths, format, parse } from 'date-fns'
import { useSearchParams } from 'react-router-dom'



interface Transacao {
  id: string
  created_at: string
  data: string | null
  descricao: string | null
  valor: number | null
  observacao: string | null
  tipo: string | null
  categoria_id: string
  pago: boolean
  conta_id: string | null
  cartao_id: string | null
  userid: string | null
  user_id: string | null
  categorias?: {
    id: string
    nome: string
  }
  contas?: {
    id: string
    nome: string
    saldo_inicial: number
  }
}

const createInitialFormData = () => ({
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
  isPago: true,
  isParcelado: false,
  numeroParcelas: 1,
  isRecorrente: false,
  repetirMeses: 1,
})


const Transacoes: React.FC = () => {
  // Estado do formulário de transação (corrige ReferenceError)
  const [formData, setFormData] = useState(createInitialFormData);
  // Estados principais
  const { user } = useAuth();
  const { categories } = useCategories();
  const [searchParams, setSearchParams] = useSearchParams();
  // mês/ano para filtro rápido (igual ao Dashboard)
  const [filterMonth, setFilterMonth] = useState<string>(new Date().getMonth().toString())
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString())
  const [viewMode, setViewMode] = useState<'mes' | 'ultimos'>('ultimos')
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // Ordenação multi-coluna da tabela (prioridade da esquerda para a direita do array)
  type SortField = 'data' | 'descricao' | 'categoria' | 'conta' | 'cartao' | 'valor'
  type SortDirection = 'asc' | 'desc'
  const [sortCriteria, setSortCriteria] = useState<Array<{ field: SortField; direction: SortDirection }>>([
    { field: 'data', direction: 'desc' }
  ])
  const [saldoInicial, setSaldoInicial] = useState(0);
  // Estados para modais
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [importarFaturaOpen, setImportarFaturaOpen] = useState(false);
  const [importarExtratoOpen, setImportarExtratoOpen] = useState(false);
  const [cartaoParaImportar, setCartaoParaImportar] = useState<string | undefined>(undefined);
  const [hideCardTransactions, setHideCardTransactions] = useState(false);
  const [pendingExpensesDetailOpen, setPendingExpensesDetailOpen] = useState(false);
  // Filtros avançados
  const [advFilters, setAdvFilters] = useState({
    period: '',
    tipo: '',
    categories: [] as string[],
    accounts: [] as string[],
    cards: [] as string[],
    status: '',
    minValue: '',
    maxValue: '',
    onlyRecorrentes: false,
    onlyParceladas: false,
  });
  // Estado para controle do diálogo de transação
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transacao | null>(null);
  // Estados para seleção em massa (se usados no arquivo)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [massCategoryDialogOpen, setMassCategoryDialogOpen] = useState(false);
  const [massAccountDialogOpen, setMassAccountDialogOpen] = useState(false);
  const [massCategory, setMassCategory] = useState('');
  const [massAccount, setMassAccount] = useState('');
  // Estados para dropdowns
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // Estado para paginação (carregar mais)
  const [displayCount, setDisplayCount] = useState(30);

  const openNewTransactionDialog = () => {
    setEditingTransaction(null)
    setFormData(createInitialFormData())
    setDialogOpen(true)
  }

  // Memo para mapear contas por id (accountsMap)
  const accountsMap = useMemo(() => {
    const map: Record<string, any> = {};
    contas.forEach((conta) => {
      if (conta.id) map[conta.id] = conta;
    });
    return map;
  }, [contas]);

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

  // Memo para filtrar transações conforme filtros visuais
  const filteredTransacoes = useMemo(() => {
    let filtered = [...transacoes];
    
    if (accountFilter && accountFilter !== 'all') {
      filtered = filtered.filter(t => t.conta_id === accountFilter);
    }
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(t => t.tipo === typeFilter);
    }
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.categoria_id === categoryFilter);
    }
    if (dateFrom) {
      filtered = filtered.filter(t => t.data && t.data >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(t => t.data && t.data <= dateTo);
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        (t.descricao?.toLowerCase().includes(search) || '') ||
        (t.observacao?.toLowerCase().includes(search) || '') ||
        (t.categorias?.nome?.toLowerCase().includes(search) || '')
      );
    }
    // Filtro para ocultar transações de cartão de crédito
    if (hideCardTransactions) {
      filtered = filtered.filter(t => !t.cartao_id);
    }
    // Filtros avançados: cartão
    if (advFilters.cards.length > 0) {
      filtered = filtered.filter(t => t.cartao_id && advFilters.cards.includes(t.cartao_id));
    }
    // Filtros avançados: status
    if (advFilters.status) {
      filtered = filtered.filter(t => {
        if (advFilters.status === 'pago') return t.pago === true;
        if (advFilters.status === 'pendente') return t.pago === false || t.pago === null;
        if (advFilters.status === 'atrasado') {
          const dataT = t.data ? new Date(t.data) : null;
          return (!t.pago) && dataT && dataT < new Date();
        }
        return true;
      });
    }
    // Filtros avançados: faixa de valor
    if (advFilters.minValue) {
      const min = parseFloat(advFilters.minValue);
      if (!isNaN(min)) filtered = filtered.filter(t => Math.abs(t.valor) >= min);
    }
    if (advFilters.maxValue) {
      const max = parseFloat(advFilters.maxValue);
      if (!isNaN(max)) filtered = filtered.filter(t => Math.abs(t.valor) <= max);
    }
    // Filtros avançados: apenas recorrentes
    if (advFilters.onlyRecorrentes) {
      filtered = filtered.filter(t => t.recorrente === true);
    }
    // Filtros avançados: apenas parceladas
    if (advFilters.onlyParceladas) {
      const parcelaRegex = /\d{1,2}\/\d{1,2}\s*$/;
      filtered = filtered.filter(t => {
        const desc = t.descricao || t.estabelecimento || '';
        return parcelaRegex.test(desc) || (t.total_parcelas && t.total_parcelas > 1);
      });
    }

    if (viewMode === 'mes') {
      // Filtro por mês/ano selecionado
      const monthIndex = (() => { const m = parseInt(filterMonth); return isNaN(m) ? new Date().getMonth() : (m > 11 ? m - 1 : m) })()
      const yearNum = parseInt(filterYear) || new Date().getFullYear()
      filtered = filtered.filter(t => {
        // Transações de cartão importadas por fatura:
        // quando houver fatura_mes/fatura_ano, o mês de referência é o vencimento da fatura.
        if (t.cartao_id && t.fatura_mes && t.fatura_ano) {
          return (Number(t.fatura_mes) - 1) === monthIndex && Number(t.fatura_ano) === yearNum
        }

        // Transações de conta (ou cartão sem referência de fatura): usar data da transação
        const dt = parseToDate(t.data || t.created_at)
        if (!dt) return false
        return dt.getUTCMonth() === monthIndex && dt.getUTCFullYear() === yearNum
      })
    }
    
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

    const getSortValue = (t: any, field: SortField) => {
      switch (field) {
        case 'data':
          return parseDateToTime(viewMode === 'ultimos' ? (t.created_at || t.data) : (t.data || t.created_at))
        case 'descricao':
          return (t.descricao || t.observacao || '').toString().toLowerCase()
        case 'categoria':
          return (t.categorias?.nome || '').toString().toLowerCase()
        case 'conta':
          return ((!t.cartao_id && t.contas?.nome) ? t.contas.nome : '').toString().toLowerCase()
        case 'cartao':
          return (t.cartao_nome || '').toString().toLowerCase()
        case 'valor':
          return Math.abs(Number(t.valor) || 0)
        default:
          return ''
      }
    }

    filtered.sort((a, b) => {
      for (const criterion of sortCriteria) {
        const aVal = getSortValue(a, criterion.field)
        const bVal = getSortValue(b, criterion.field)
        let compare = 0

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          compare = aVal - bVal
        } else {
          compare = String(aVal).localeCompare(String(bVal), 'pt-BR')
        }

        if (compare !== 0) {
          return criterion.direction === 'asc' ? compare : -compare
        }
      }
      return 0
    })
    
    console.log('✨ Transações filtradas:', filtered.length, 'de', transacoes.length);
    return filtered;
  }, [transacoes, accountFilter, typeFilter, categoryFilter, dateFrom, dateTo, searchTerm, sortCriteria, hideCardTransactions, filterMonth, filterYear, advFilters, viewMode]);

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
      // Busca contas
      const { data: contasData, error: contasError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);
      if (contasError) throw contasError;
      setContas(contasData || []);

      // Busca categorias
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id);
      if (categoriasError) throw categoriasError;

      // Busca cartões
      const { data: cartoesData } = await supabase
        .from('cartoes')
        .select('id, nome')
        .eq('user_id', user.id);

      // Busca transações
      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: false });
      
      if (error) throw error;
      
      // Importar regras de categorização para aplicar retroativamente
      const { categorizar, REGRAS_PADRAO } = await import('@/utils/categorizacao');
      const regrasTexto = localStorage.getItem('regrasFatura') || REGRAS_PADRAO;

      // Cache para buscar/criar categorias
      const categoriaCacheMap: Record<string, string> = {};
      async function getOrCreateCatId(nome: string): Promise<string | null> {
        if (!nome) return null;
        if (categoriaCacheMap[nome]) return categoriaCacheMap[nome];
        const found = categoriasData?.find(c => c.nome?.toLowerCase() === nome.toLowerCase());
        if (found) { categoriaCacheMap[nome] = found.id; return found.id; }
        const { data: created } = await supabase.from('categorias').insert({ user_id: user.id, nome }).select('id').maybeSingle();
        if (created?.id) { categoriaCacheMap[nome] = created.id; categoriasData?.push({ id: created.id, nome, user_id: user.id }); return created.id; }
        return null;
      }

      // Fazer o "join" manualmente e aplicar categorização retroativa
      const idsParaAtualizar: { id: string, categoria_id: string }[] = [];
      const mapped = (data || []).map(t => {
        let categoriaId = t.categoria_id;
        let categoria = categoriaId ? categoriasData?.find(c => c.id === categoriaId) : null;
        const conta = contasData?.find(c => c.id === t.conta_id);
        const cartao = cartoesData?.find(c => c.id === t.cartao_id);
        
        // Aplicar categorização retroativa se não tem categoria
        if (!categoriaId && t.descricao) {
          const nomeCategoria = categorizar(t.descricao, regrasTexto);
          if (nomeCategoria) {
            // Buscar no array local
            const catLocal = categoriasData?.find(c => c.nome?.toLowerCase() === nomeCategoria.toLowerCase());
            if (catLocal) {
              categoriaId = catLocal.id;
              categoria = catLocal;
              idsParaAtualizar.push({ id: t.id, categoria_id: catLocal.id });
            }
          }
        }
        
        // Derivar status em memória (não salvar no banco — coluna pode não existir)
        let statusDerivado = t.status;
        if (!statusDerivado) {
          if (t.cartao_id) {
            statusDerivado = t.pago ? 'pago' : 'pendente_fatura';
          } else {
            statusDerivado = t.pago ? 'pago' : 'pendente';
          }
        }
        
        return {
          ...t,
          categoria_id: categoriaId,
          status: statusDerivado,
          categorias: categoria ? { id: categoria.id, nome: categoria.nome } : null,
          contas: conta ? { id: conta.id, nome: conta.nome, saldo_inicial: conta.saldo_inicial } : null,
          cartao_nome: cartao?.nome || null
        };
      });

      // Salvar categorizações retroativas no banco (em background) — apenas categoria_id
      if (idsParaAtualizar.length > 0) {
        const uniqueUpdates = new Map<string, string>();
        idsParaAtualizar.forEach(u => {
          if (u.categoria_id) uniqueUpdates.set(u.id, u.categoria_id);
        });
        for (const [id, catId] of uniqueUpdates) {
          supabase.from('transacoes').update({ categoria_id: catId }).eq('id', id).then();
        }
        console.log(`🔄 Categorizando retroativamente ${uniqueUpdates.size} transações...`);
      }
      
      console.log('✅ Transações carregadas:', mapped);
      console.log('📊 Total de transações:', mapped.length);
      setTransacoes(mapped);
    } catch (error: any) {
      console.error('❌ Erro ao carregar transações:', error);
      toast({
        title: 'Erro ao carregar transações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportLancamentos = async (lancamentos: any[], contaId: string, regras: string) => {
    if (!user || !user.id) {
      return { success: false, message: 'Usuário não autenticado.' };
    }
    const pendentesCategoria = (lancamentos || []).filter((l) => !String(l?.categoria || '').trim());
    if (pendentesCategoria.length > 0) {
      return {
        success: false,
        message: `Existem ${pendentesCategoria.length} lançamento(s) sem categoria. Preencha antes de importar.`,
      };
    }
    try {
      async function getOrCreateCategoriaId(nomeCategoria: string, tipoCategoria: 'receita' | 'despesa') {
        if (!nomeCategoria) return null;
        const nomeNormalizado = nomeCategoria.trim();

        const { data: categoriasEncontradas } = await supabase
          .from('categorias')
          .select('id, nome')
          .eq('user_id', user.id)
          .eq('tipo', tipoCategoria)
          .ilike('nome', nomeNormalizado);

        const existente =
          (categoriasEncontradas || []).find(
            (c) => String(c.nome || '').trim().toLowerCase() === nomeNormalizado.toLowerCase()
          ) || categoriasEncontradas?.[0];

        if (existente?.id) return existente.id;

        const { data: newCat } = await supabase
          .from('categorias')
          .insert({ user_id: user.id, nome: nomeNormalizado, tipo: tipoCategoria })
          .select('id')
          .maybeSingle();
        if (newCat && newCat.id) return newCat.id;
        return null;
      }

      const lancamentosComCategoriaId = [];
      const contaSelecionadaObj = contas.find(c => c.id === contaId);
      if (!contaSelecionadaObj || (contaSelecionadaObj.tipo || '').toLowerCase() !== 'bank') {
        return { success: false, message: 'Selecione uma conta bancária válida para importar.' };
      }

      function parseDataBRtoISO(dataBR: string) {
        if (!dataBR) return null;
        const [dia, mes, ano] = dataBR.split('/');
        return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }

      function parseValorBR(valorStr: any) {
        if (valorStr === undefined || valorStr === null) return 0;
        let str = String(valorStr).replace(/[^0-9.,-]/g, '');
        if (str.includes(',')) {
          str = str.replace(/\./g, '').replace(',', '.');
        }
        return parseFloat(str);
      }

      for (const l of lancamentos) {
        const valorNum = parseValorBR(l.valor);
        const tipo: 'receita' | 'despesa' = valorNum >= 0 ? 'receita' : 'despesa';
        const descricao = l.estabelecimento || l.descricao || '';
        const categoriaPorRegra = categorizar(descricao, regras || '');
        const nomeCategoria = (categoriaPorRegra || (
          l.categoria && l.categoria.trim() !== ''
            ? l.categoria.trim()
            : tipo === 'receita'
              ? 'Renda Extra'
              : 'Compras'
        )).trim();
        const categoriaId = await getOrCreateCategoriaId(nomeCategoria, tipo);

        lancamentosComCategoriaId.push({
          user_id: user.id,
          conta_id: contaId,
          categoria_id: categoriaId,
          descricao,
          valor: valorNum,
          tipo,
          data: parseDataBRtoISO(l.quando || l.data),
          pago: true,
          observacao: '',
        });
      }

      lancamentosComCategoriaId.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const { data, error } = await supabase.from('transacoes').insert(lancamentosComCategoriaId).select();
      if (error) {
        return { success: false, message: 'Erro ao importar: ' + error.message };
      }

      let totalRecategorizadas = 0;
      const { data: transacoesContaExistentes } = await supabase
        .from('transacoes')
        .select('id, descricao, tipo, categoria_id')
        .eq('user_id', user.id)
        .is('cartao_id', null);

      if (Array.isArray(transacoesContaExistentes) && transacoesContaExistentes.length > 0) {
        const atualizacoes: Array<{ id: string; categoria_id: string }> = [];
        for (const row of transacoesContaExistentes) {
          const descricao = String(row?.descricao || '').trim();
          if (!descricao) continue;
          const categoriaPorRegra = categorizar(descricao, regras || '');
          if (!categoriaPorRegra) continue;
          const tipoCategoria: 'receita' | 'despesa' = row?.tipo === 'receita' ? 'receita' : 'despesa';
          const categoriaId = await getOrCreateCategoriaId(categoriaPorRegra, tipoCategoria);
          if (categoriaId && categoriaId !== row?.categoria_id) {
            atualizacoes.push({ id: row.id, categoria_id: categoriaId });
          }
        }

        for (const updateRow of atualizacoes) {
          const { error: updateError } = await supabase
            .from('transacoes')
            .update({ categoria_id: updateRow.categoria_id })
            .eq('id', updateRow.id)
            .eq('user_id', user.id);
          if (!updateError) totalRecategorizadas += 1;
        }
      }

      fetchTransacoes();
      const conta = contas.find(c => c.id === contaId);
      return {
        success: true,
        count: (data || []).length,
        accountName: conta ? conta.nome : contaId,
        message: `✓ Importação realizada com sucesso!${totalRecategorizadas > 0 ? ` ${totalRecategorizadas} transações recategorizadas pelas regras.` : ''}`
      };
    } catch (e: any) {
      return { success: false, message: `Erro ao importar: ${e.message || e}` };
    }
  };




  // Memo para saldo GLOBAL (não depende de filtros visuais)
  // SALDO: usa TODAS as transações de CONTAS (sem cartão de crédito), independente de filtros
  const saldoReal = useMemo(() => {
    // Soma do saldo inicial de todas as contas (respeitando sinal — pode ser negativo)
    // Tenta: saldo_inicial → saldoInicial → saldo (campo original da tabela)
    const totalSaldoInicial = contas.reduce((acc, conta) => {
      const s = conta.saldo_inicial ?? conta.saldoInicial ?? conta.saldo ?? 0
      const n = Number(s)
      return acc + (isNaN(n) ? 0 : n)
    }, 0)

    // SALDO: usa 'transacoes' (GLOBAL), não 'filteredTransacoes' — filtros visuais não devem afetar o saldo
    const transacoesConta = transacoes.filter(t => !t.cartao_id)
    const receitasGlobais = transacoesConta.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)
    const despesasGlobais = transacoesConta.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)

    // Saldo = saldo inicial + receitas - despesas (apenas de contas, cartão não afeta, sem filtros)
    const saldo = totalSaldoInicial + receitasGlobais - despesasGlobais
    console.log('💰 SALDO DEBUG:', {
      contas: contas.map(c => ({ id: c.id, nome: c.nome, saldo_inicial: c.saldo_inicial, saldoInicial: c.saldoInicial, saldo: c.saldo, TODOS_CAMPOS: Object.keys(c) })),
      totalSaldoInicial,
      totalTransacoes: transacoes.length,
      transacoesConta: transacoesConta.length,
      receitasGlobais,
      despesasGlobais,
      saldo,
      amostraTransacoes: transacoesConta.slice(0, 5).map(t => ({ id: t.id, desc: t.descricao, valor: t.valor, tipo: t.tipo, cartao_id: t.cartao_id }))
    })
    return saldo
  }, [transacoes, contas])

  // Totais para o mês/ano selecionado
  const { receitasMes, despesasMes, despesasPendentes, transacoesCountMes, countReceitasMes, countDespesasMes } = useMemo(() => {
    const monthIndex = (() => { const m = parseInt(filterMonth); return isNaN(m) ? new Date().getMonth() : (m > 11 ? m - 1 : m) })()
    const yearNum = parseInt(filterYear) || new Date().getFullYear()
    
    // Filtrar por mês/ano usando TODAS as transações (não filteredTransacoes)
    const todasDoMes = transacoes.filter(t => {
      // Transações de cartão: usar fatura_mes/fatura_ano (mês de vencimento)
      if (t.cartao_id && t.fatura_mes && t.fatura_ano) {
        return (t.fatura_mes - 1) === monthIndex && t.fatura_ano === yearNum
      }
      // Transações normais: usar data da transação
      const dt = parseToDate(t.data || t.created_at)
      if (!dt) return false
      return dt.getUTCMonth() === monthIndex && dt.getUTCFullYear() === yearNum
    })
    
    const baseDoMes = hideCardTransactions ? todasDoMes.filter(t => !t.cartao_id) : todasDoMes
    const contaDoMes = baseDoMes.filter(t => !t.cartao_id)

    // Receitas do mês: mantém apenas contas (receitas de cartão são estornos/pgto fatura)
    const receitasMes = contaDoMes.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)
    const countReceitasMes = contaDoMes.filter(t => t.tipo === 'receita').length

    // Despesas do mês: incluir cartão + conta (respeitando toggle de ocultar cartão)
    const despesasMes = baseDoMes.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)
    const countDespesasMes = baseDoMes.filter(t => t.tipo === 'despesa').length

    // Despesas pendentes: transações de cartão NÃO pagas + pendentes de conta (na base atual)
    const despesasPendentes = baseDoMes
      .filter(t => t.tipo === 'despesa' && !t.pago && (t.cartao_id || t.status === 'pendente' || t.status === 'pendente_fatura'))
      .reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)

    return { receitasMes, despesasMes, despesasPendentes, transacoesCountMes: baseDoMes.length, countReceitasMes, countDespesasMes }
  }, [transacoes, filterMonth, filterYear, hideCardTransactions])

  // Cálculo do saldo do mês: saldo inicial + receitas do mês - despesas pagas do mês (APENAS CONTAS, sem cartão)
  const saldoMes = useMemo(() => {
    const totalSaldoInicial = contas.reduce((acc, conta) => {
      const s = conta.saldo_inicial ?? conta.saldoInicial ?? conta.saldo ?? 0
      const n = Number(s)
      return acc + (isNaN(n) ? 0 : n)
    }, 0)
    return totalSaldoInicial + receitasMes - despesasMes
  }, [contas, receitasMes, despesasMes])

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

  useEffect(() => {
    if (searchParams.get('nova') !== '1') return

    openNewTransactionDialog()

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('nova')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    setDisplayCount(30)
    setSelectedIds([])
  }, [viewMode, filterMonth, filterYear])

  const clearFilters = () => {
    setSearchTerm('')
    setTypeFilter('all')
    setCategoryFilter('all')
    setAccountFilter('all')
    setSortCriteria([{ field: 'data', direction: 'desc' }])
  }

  const toggleSort = (field: SortField) => {
    setSortCriteria(prev => {
      const existingIndex = prev.findIndex(c => c.field === field)

      if (existingIndex === -1) {
        const defaultDirection: SortDirection = (field === 'data' || field === 'valor') ? 'desc' : 'asc'
        // Novo critério entra no fim para preservar a sequência de clique
        return [...prev, { field, direction: defaultDirection }]
      }

      const next = [...prev]
      const current = next[existingIndex]

      // Ciclo: desc -> asc -> remover ordenação da coluna
      if (current.direction === 'desc') {
        next[existingIndex] = { ...current, direction: 'asc' }
        return next
      }

      // Se já estava asc, remove o critério dessa coluna
      next.splice(existingIndex, 1)
      return next
    })
  }

  const getSortIndicator = (field: SortField) => {
    const idx = sortCriteria.findIndex(c => c.field === field)
    if (idx === -1) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
    const direction = sortCriteria[idx].direction
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-primary text-[11px]">{direction === 'asc' ? '↑' : '↓'}</span>
        <span className="text-[10px] text-primary/80">#{idx + 1}</span>
      </span>
    )
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
      // Define status automaticamente conforme data e método
      let status = formData.status;
      let metodo = formData.metodo;
      
      // Função para determinar status baseado na data
      const determinarStatusPorData = (dataStr) => {
        try {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          
          let data;
          // Se for string em formato yyyy-mm-dd
          if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
            data = new Date(dataStr + 'T00:00:00');
          } else {
            data = new Date(dataStr);
          }
          
          data.setHours(0, 0, 0, 0);
          
          // Se data > hoje → pendente, senão pago
          return data > hoje ? 'pendente' : 'pago';
        } catch {
          return 'pago'; // Padrão é pago se der erro
        }
      };
      
      if (!status) {
        if (formData.metodo === 'cartao_credito') {
          status = 'pendente_fatura';
        } else if (formData.metodo === 'pix' || formData.metodo === 'debito' || formData.metodo === 'transferencia') {
          // Determina status baseado na data
          status = determinarStatusPorData(formData.quando);
        } else {
          // Para outros métodos, também verifica a data
          status = formData.quando ? determinarStatusPorData(formData.quando) : '';
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
        data: formData.quando || null,
        descricao: formData.estabelecimento
          ? String(formData.estabelecimento).trim().toLocaleUpperCase('pt-BR')
          : null,
        valor: formData.valor || null,
        observacao: formData.detalhes || null,
        tipo: formData.tipo || null,
        categoria_id: normalizeUuid(formData.category_id),
        pago: formData.isPago !== undefined ? formData.isPago : true,
        conta_id: formData.metodo === 'cartao_credito' ? null : normalizeUuid(formData.account_id),
        cartao_id: formData.metodo === 'cartao_credito' ? normalizeUuid(formData.account_id) : null,
        user_id: user?.id || null,
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
        const shouldRepeat = Boolean(formData.isRecorrente)
        const shouldInstallments = Boolean(formData.isParcelado) && formData.metodo === 'cartao_credito' && !shouldRepeat

        // Se for recorrente, cria múltiplas transações incluindo o mês base selecionado
        if (shouldRepeat) {
          const transacoes = [];
          const repetirMeses = Number(formData.repetirMeses) || 1;
          const dataBase = parse(formData.quando, 'yyyy-MM-dd', new Date())
          if (isNaN(dataBase.getTime())) {
            throw new Error('Informe uma data válida para repetir a transação.')
          }
          
          for (let i = 0; i < repetirMeses; i++) {
            // Calcula a data da próxima transação
            const dataFormatada = format(addMonths(dataBase, i), 'yyyy-MM-dd')
            
            transacoes.push({
              ...payload,
              data: dataFormatada,
            });
          }
          
          const { error } = await supabase
            .from('transacoes')
            .insert(transacoes)
          
          if (error) {
            console.error('[Transacoes] recorrente insert error:', error)
            throw error
          }
        }
        // Se for parcelado, cria múltiplas transações em faturas futuras
        else if (shouldInstallments) {
          const transacoes = [];
          const numeroParcelas = Number(formData.numeroParcelas) || 1;
          const valorParcela = Number(formData.valor || 0) / numeroParcelas;
          const dataBase = parse(formData.quando, 'yyyy-MM-dd', new Date())
          if (isNaN(dataBase.getTime())) {
            throw new Error('Informe uma data válida para parcelar a transação.')
          }
          
          for (let i = 0; i < numeroParcelas; i++) {
            // Calcula a data da fatura (mês seguinte + i meses)
            const dataFormatada = format(addMonths(dataBase, i + 1), 'yyyy-MM-dd')
            
            transacoes.push({
              ...payload,
              valor: Math.round(valorParcela * 100) / 100, // Evita erros de ponto flutuante
              data: dataFormatada,
              descricao: `${formData.estabelecimento} (Parcela ${i + 1}/${numeroParcelas})`,
            });
          }
          
          const { error } = await supabase
            .from('transacoes')
            .insert(transacoes)
          
          if (error) {
            console.error('[Transacoes] parcelado insert error:', error)
            throw error
          }
        } 
        // Transação normal
        else {
          const { error } = await supabase
            .from('transacoes')
            .insert([payload])

          if (error) {
            console.error('[Transacoes] insert error:', error)
            throw error
          }
        }
        
        toast({ title: "Transação adicionada com sucesso!" })
      }

      setDialogOpen(false)
      setEditingTransaction(null)
      setFormData(createInitialFormData())
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
    if (typeof transacao.conta_id === 'string' && transacao.conta_id) {
      accountId = transacao.conta_id;
    } else if (transacao.accounts && typeof transacao.accounts.id === 'string') {
      accountId = transacao.accounts.id;
    } else {
      accountId = '';
    }
    // Normaliza data: se não houver data válida, usa created_at
    let dataNormalizada = '';
    if (transacao.data && !isNaN(new Date(transacao.data).getTime())) {
      dataNormalizada = normalizeDate(transacao.data);
    } else if (transacao.quando && !isNaN(new Date(transacao.quando).getTime())) {
      dataNormalizada = normalizeDate(transacao.quando);
    } else if (transacao.created_at && !isNaN(new Date(transacao.created_at).getTime())) {
      dataNormalizada = normalizeDate(transacao.created_at);
    } else {
      dataNormalizada = '';
    }
    setFormData({
      quando: dataNormalizada,
      estabelecimento: transacao.descricao || '',
      valor: typeof transacao.valor === 'number' && !isNaN(transacao.valor) ? transacao.valor : 0,
      detalhes: transacao.observacao || '',
      tipo: transacao.tipo || '',
      category_id: transacao.categoria_id || '',
      metodo: transacao.cartao_id ? 'cartao_credito' : transacao.tipo || '',
      status: transacao.pago ? 'pago' : 'pendente',
      account_id: accountId,
      fatura_id: transacao.fatura_id || '',
      isPago: transacao.status !== 'pendente' && transacao.status !== 'pendente_fatura',
      isParcelado: false,
      numeroParcelas: 1,
      isRecorrente: false,
      repetirMeses: 1,
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
        .eq('user_id', user.id)

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
        .eq('user_id', user.id)

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
    
    console.log(`Tentando excluir ${selectedIds.length} transações em lotes`)
    
    // Mostrar loading
    const loadingToast = toast({
      title: "Excluindo...",
      description: `Processando ${selectedIds.length} transações em lotes...`,
    })
    
    try {
      let deleted = 0
      let errors = []
      const batchSize = 50 // Processar 50 por vez
      
      // Dividir em lotes
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize)
        
        console.log(`Processando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(selectedIds.length/batchSize)}`)
        
        // Deletar lote com .in()
        try {
          const { error, data } = await supabase
            .from('transacoes')
            .delete()
            .in('id', batch)
            .eq('user_id', user.id)
            .select()
          
          if (error) {
            console.error(`Erro no lote:`, error)
            errors.push(error)
          } else {
            deleted += data?.length || 0
            console.log(`Lote excluído: ${data?.length || 0} itens`)
          }
          
          // Atualizar progresso
          toast({
            title: "Excluindo...",
            description: `${deleted} de ${selectedIds.length} excluídas...`,
          })
          
        } catch (batchError: any) {
          console.error(`Erro de rede no lote:`, batchError)
          errors.push(batchError)
        }
      }
      
      if (deleted > 0) {
        toast({ 
          title: `${deleted} transações excluídas!`,
          description: errors.length > 0 ? `Alguns lotes falharam` : "Todas excluídas com sucesso",
          variant: errors.length > 0 ? "default" : "default"
        })
        setSelectedIds([])
        fetchTransacoes()
      } else {
        throw new Error(`Nenhuma transação foi excluída.`)
      }
      
    } catch (error: any) {
      console.error('Erro final:', error)
      toast({
        title: "Erro ao excluir transações",
        description: error.message || "Erro de conexão com o servidor",
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
        .eq('user_id', user.id)
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
        .update({ categoria_id: massCategory })
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
        .update({ conta_id: massAccount })
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
        .update({ data: massDate })
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
    // Exporta TODAS as transações (não apenas as selecionadas)
    const selectedTransacoes = transacoes; // Use TODAS as transações, não apenas filtradas
    
    if (selectedTransacoes.length === 0) {
      toast({ 
        title: 'Nenhuma transação encontrada',
        description: 'Não há transações para exportar.',
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
      'Data': formatDate(t.data || t.created_at),
      'Estabelecimento': t.descricao || 'Sem descrição',
      'Tipo': t.tipo === 'receita' ? 'Receita' : 'Despesa',
      'Valor': Math.abs(parseFloat(String(t.valor || 0))),
      'Categoria': t.categorias?.nome || 'Sem categoria',
      'Conta': t.contas?.nome || (t.cartao_id ? 'Cartão' : 'Sem conta'),
      'Método': t.cartao_id ? 'Cartão de Crédito' : t.tipo || '',
      'Status': t.pago ? 'Pago' : 'Pendente',
      'Detalhes': t.observacao || ''
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
    XLSX.writeFile(wb, `transacoes_completo_${new Date().toISOString().split('T')[0]}.xlsx`)
    
    toast({ title: `✅ ${allData.length} registros exportados com sucesso!`, description: `${saldosIniciais.length} saldos iniciais + ${dataToExport.length} transações` })
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

  // Modal Filtros Avançados
  const handleApplyAdvancedFilters = () => {
    // Aplicar filtros ao estado principal
    if (advFilters.tipo) {
      setTypeFilter(advFilters.tipo);
    }
    if (advFilters.categories.length > 0) {
      setCategoryFilter(advFilters.categories[0]);
    }
    if (advFilters.accounts.length > 0) {
      setAccountFilter(advFilters.accounts[0]);
    }
    // Período: ajustar dateFrom/dateTo
    if (advFilters.period) {
      const now = new Date();
      let from = '';
      if (advFilters.period === 'ultima_semana') {
        const d = new Date(now); d.setDate(d.getDate() - 7);
        from = d.toISOString().split('T')[0];
      } else if (advFilters.period === 'ultimo_mes') {
        const d = new Date(now); d.setMonth(d.getMonth() - 1);
        from = d.toISOString().split('T')[0];
      } else if (advFilters.period === 'ultimos_3_meses') {
        const d = new Date(now); d.setMonth(d.getMonth() - 3);
        from = d.toISOString().split('T')[0];
      } else if (advFilters.period === 'ultimo_ano') {
        const d = new Date(now); d.setFullYear(d.getFullYear() - 1);
        from = d.toISOString().split('T')[0];
      }
      if (from) {
        setDateFrom(from);
        setDateTo(now.toISOString().split('T')[0]);
      }
    }
    setAdvancedFiltersOpen(false);
    toast({ title: 'Filtros aplicados', description: 'Os filtros avançados foram aplicados com sucesso.' });
  };

  const handleClearAdvancedFilters = () => {
    setAdvFilters({
      period: '',
      tipo: '',
      categories: [],
      accounts: [],
      cards: [],
      status: '',
      minValue: '',
      maxValue: '',
      onlyRecorrentes: false,
      onlyParceladas: false,
    });
    setTypeFilter('all');
    setCategoryFilter('all');
    setAccountFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setHideCardTransactions(false);
    toast({ title: 'Filtros limpos', description: 'Todos os filtros foram removidos.' });
  };

  // Função para recalcular e corrigir o saldo
  const handleRecalculateBalance = async () => {
    try {
      toast({
        title: "Diagnosticando...",
        description: "Analisando saldo e transações...",
      });

      const { data: allTransactions, error: fetchError } = await supabase
        .from('transacoes')
        .select('id, tipo, valor')
        .eq('user_id', user?.id);

      if (fetchError) throw fetchError;

      // Log detalhado
      const receitas = allTransactions?.filter(t => t.tipo === 'receita') || [];
      const despesas = allTransactions?.filter(t => t.tipo === 'despesa') || [];
      const nullType = allTransactions?.filter(t => !t.tipo) || [];

      const totalReceitas = receitas.reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
      const totalDespesas = despesas.reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

      console.log('📊 Diagnóstico Detalhado:', {
        totalTransacoes: allTransactions?.length || 0,
        receitasCount: receitas.length,
        despesasCount: despesas.length,
        nullTypeCount: nullType.length,
        totalReceitas: totalReceitas.toFixed(2),
        totalDespesas: totalDespesas.toFixed(2),
        receitasDetalhes: receitas.slice(0, 5),
        despesasDetalhes: despesas.slice(0, 5),
      });

      toast({
        title: "Diagnóstico Concluído",
        description: `Receitas: ${receitas.length} | Despesas: ${despesas.length} | Sem tipo: ${nullType.length}. Verifique o console para detalhes.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao diagnosticar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Função para sincronizar tipos de transações com categorias
  const handleSyncTransactionTypes = async () => {
    try {
      toast({
        title: "Sincronizando...",
        description: "Atualizando tipos de transações com base nas categorias...",
      });

      const { data: allTransactions, error: fetchError } = await supabase
        .from('transacoes')
        .select('id, categoria_id, tipo, valor')
        .eq('user_id', user?.id);

      if (fetchError) throw fetchError;

      let updated = 0;
      let nullFixed = 0;
      
      for (const transaction of allTransactions || []) {
        const category = categories.find(c => c.id === transaction.category_id);
        
        // Se a transação não tem tipo, atribua o tipo da categoria
        if (!transaction.tipo && category && category.tipo) {
          const { error: updateError } = await supabase
            .from('transacoes')
            .update({ tipo: category.tipo })
            .eq('id', transaction.id);

          if (updateError) throw updateError;
          nullFixed++;
        }
        // Se o tipo está diferente da categoria, atualize
        else if (category && category.tipo && category.tipo !== transaction.tipo) {
          const { error: updateError } = await supabase
            .from('transacoes')
            .update({ tipo: category.tipo })
            .eq('id', transaction.id);

          if (updateError) throw updateError;
          updated++;
        }
      }

      const totalFixed = updated + nullFixed;
      toast({
        title: "Sincronização Concluída!",
        description: `${updated} transações atualizadas e ${nullFixed} transações com tipo NULL corrigidas. Total: ${totalFixed} ajustes realizados.`,
      });

      // Recarregar dados
      await fetchTransacoes();
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Função para exportar TODAS as transações em Excel
  const handleExportAllToExcel = () => {
    // Exporta TODAS as transações (não apenas filtradas)
    handleExportToExcel();
  };

  // Função para exportar TODAS as transações em PDF
  const handleExportAllToPDF = () => {
    toast({
      title: "Exportar PDF",
      description: "Função de exportação PDF em desenvolvimento",
    });
  };

  // Função para exportar TODAS as transações em CSV
  const handleExportAllToCSV = () => {
    toast({
      title: "Exportar CSV",
      description: "Função de exportação CSV em desenvolvimento",
    });
  };

  // ...hooks, funções e lógica acima...
  return (
    <div className="space-y-6 p-6">
      {/* Header: Título, Descrição e Botão Nova Transação */}
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Transações</h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie todas as suas transações financeiras</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 h-9 text-sm rounded-lg px-4 whitespace-nowrap font-semibold" onClick={openNewTransactionDialog}>
          + Nova Transação
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-3 grid-cols-4">
        {/* Card Saldo */}
        <Card className="border-border/40 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Saldo</CardTitle>
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(saldoReal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Saldo atualizado até hoje</p>
          </CardContent>
        </Card>

        {/* Card Receitas */}
        <Card className="border-border/40 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Receitas</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-3xl font-bold text-green-500">
              {formatCurrency(receitasMes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{countReceitasMes} {countReceitasMes === 1 ? 'transação' : 'transações'}</p>
          </CardContent>
        </Card>

        {/* Card Despesas */}
        <Card className="border-border/40 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Despesas</CardTitle>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-3xl font-bold text-red-500">
              {formatCurrency(despesasMes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{countDespesasMes} {countDespesasMes === 1 ? 'transação' : 'transações'}</p>
          </CardContent>
        </Card>

        {/* Card Faturas em Aberto */}
        <Card className="border-border/40 bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors" onClick={() => setPendingExpensesDetailOpen(true)}>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Faturas em Aberto</CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-3xl font-bold text-foreground">
              {formatCurrency(despesasPendentes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">A pagar</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros Superiores */}
      <div className="flex flex-wrap items-start justify-between gap-4 py-4">
        <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'mes' ? 'default' : 'ghost'}
              className={`h-8 text-xs rounded px-3 ${
                viewMode === 'mes'
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400'
              }`}
              onClick={() => setViewMode('mes')}
            >
              Por mês
            </Button>
            <Button
              variant={viewMode === 'ultimos' ? 'default' : 'ghost'}
              className={`h-8 text-xs rounded px-3 ${
                viewMode === 'ultimos'
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400'
              }`}
              onClick={() => {
                setViewMode('ultimos')
                setSortCriteria([{ field: 'data', direction: 'desc' }])
              }}
            >
              Últimos lançamentos
            </Button>
          </div>

          {viewMode === 'mes' ? (
            <>
              {/* Ano */}
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-20 h-9 text-sm bg-slate-900/50 border-slate-700/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>

              {/* Período */}
              <span className="text-xs text-slate-400">Período:</span>

              {/* Botões de Mês */}
              <div className="flex flex-wrap gap-1">
                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                  <Button
                    key={i}
                    variant={parseInt(filterMonth) === i ? 'default' : 'ghost'}
                    className={`h-8 w-10 text-xs rounded px-1 ${
                      parseInt(filterMonth) === i 
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                        : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400'
                    }`}
                    onClick={() => setFilterMonth(i.toString())}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <span className="text-xs text-slate-400">
              Mostrando os lançamentos mais recentes (independente do mês de fatura).
            </span>
          )}
        </div>

        {/* Ações Direita */}
        <div className="flex gap-2 flex-wrap justify-end">
          <Button 
            variant="ghost" 
            className="h-9 text-sm rounded-lg px-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300"
            onClick={() => setInvoicesOpen(true)}
          >
            📋 Faturas
          </Button>
          <div className="relative">
            <Button 
              variant="ghost" 
              className="h-9 text-sm rounded-lg px-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300"
              onClick={() => setOpenDropdown(openDropdown === 'importar' ? null : 'importar')}
            >
              ↑ Importar
            </Button>
            {openDropdown === 'importar' && (
              <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 w-48">
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 first:rounded-t-lg rounded-t-lg"
                  onClick={() => {
                    setImportarExtratoOpen(true);
                    setOpenDropdown(null);
                  }}
                >
                  📊 Importar Extrato
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 last:rounded-b-lg rounded-b-lg"
                  onClick={() => {
                    setImportarFaturaOpen(true);
                    setOpenDropdown(null);
                  }}
                >
                  📄 Importar Fatura
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <Button 
              variant="ghost" 
              className="h-9 text-sm rounded-lg px-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300"
              onClick={() => setOpenDropdown(openDropdown === 'exportar' ? null : 'exportar')}
            >
              ↓ Exportar
            </Button>
            {openDropdown === 'exportar' && (
              <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 w-48">
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 first:rounded-t-lg"
                  onClick={() => {
                    handleExportAllToExcel();
                    setOpenDropdown(null);
                  }}
                >
                  📊 Exportar em Excel
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  onClick={() => {
                    handleExportAllToPDF();
                    setOpenDropdown(null);
                  }}
                >
                  📄 Exportar em PDF
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  onClick={() => {
                    handleExportAllToCSV();
                    setOpenDropdown(null);
                  }}
                >
                  📋 Exportar em CSV
                </button>
                <div className="border-t border-slate-700"></div>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
                  onClick={() => {
                    handleRecalculateBalance();
                    setOpenDropdown(null);
                  }}
                >
                  🔍 Diagnosticar Saldo
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-slate-700 last:rounded-b-lg"
                  onClick={() => {
                    handleSyncTransactionTypes();
                    setOpenDropdown(null);
                  }}
                >
                  🔄 Sincronizar Tipos
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtros Secundários */}
      <div className="flex items-center gap-4 py-2">
        <Button variant="ghost" className={`h-8 text-xs rounded-lg px-3 ${(() => {
          const count = [advFilters.tipo && advFilters.tipo !== 'all', advFilters.period, advFilters.categories.length > 0, advFilters.accounts.length > 0, advFilters.cards.length > 0, advFilters.status && advFilters.status !== 'all', advFilters.minValue, advFilters.maxValue, advFilters.onlyRecorrentes, advFilters.onlyParceladas].filter(Boolean).length;
          return count > 0 ? 'bg-primary/10 hover:bg-primary/15 text-primary border border-primary/30' : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300';
        })()}`} onClick={() => setAdvancedFiltersOpen(true)}>
          🔍 Filtros Avançados
          {(() => {
            const count = [advFilters.tipo && advFilters.tipo !== 'all', advFilters.period, advFilters.categories.length > 0, advFilters.accounts.length > 0, advFilters.cards.length > 0, advFilters.status && advFilters.status !== 'all', advFilters.minValue, advFilters.maxValue, advFilters.onlyRecorrentes, advFilters.onlyParceladas].filter(Boolean).length;
            return count > 0 ? <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">{count}</span> : null;
          })()}
        </Button>
        <div className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800/75 transition-colors rounded-lg px-3 py-1.5 cursor-pointer">
          <input type="checkbox" className="w-4 h-4" checked={hideCardTransactions} onChange={(e) => setHideCardTransactions(e.target.checked)} />
          <span className="text-xs text-slate-400">Ocultar Cartões de Crédito</span>
        </div>
        <Input
          placeholder="Buscar transações..."
          className="flex-1 h-9 rounded-lg bg-slate-900/50 border-slate-700/50 text-slate-300 placeholder:text-slate-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Barra de ações em massa */}
      {selectedIds.length > 0 && (
        <Card className="mb-4 border-2 border-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-semibold text-primary">
                ✓ {selectedIds.length} {selectedIds.length === 1 ? 'transação selecionada' : 'transações selecionadas'}
              </span>
              <div className="h-6 w-px bg-slate-700"></div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setMassCategoryDialogOpen(true)}>
                  📁 Alterar Categoria
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMassDateDialogOpen(true)}>
                  📅 Alterar Data
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMassAccountDialogOpen(true)}>
                  🏦 Alterar Conta
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      🗑️ Excluir
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
                  ✕ Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cabeçalho da Tabela */}
      <div className="grid gap-4 grid-cols-[50px_100px_1.5fr_130px_130px_100px_110px_120px] items-center px-6 py-3 bg-slate-800/50 rounded-lg font-semibold text-xs text-slate-400 border border-slate-700/50 sticky top-0">
        <div className="flex items-center justify-center">
          <input type="checkbox" className="w-4 h-4 cursor-pointer" onChange={(e) => handleSelectAll(e.target.checked)} checked={isAllSelected} />
        </div>
        <button type="button" onClick={() => toggleSort('data')} className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
          {viewMode === 'ultimos' ? 'LANÇAMENTO' : 'DATA'} {getSortIndicator('data')}
        </button>
        <button type="button" onClick={() => toggleSort('descricao')} className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
          DESCRIÇÃO {getSortIndicator('descricao')}
        </button>
        <button type="button" onClick={() => toggleSort('categoria')} className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
          CATEGORIA {getSortIndicator('categoria')}
        </button>
        <button type="button" onClick={() => toggleSort('conta')} className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
          CONTA {getSortIndicator('conta')}
        </button>
        <button type="button" onClick={() => toggleSort('cartao')} className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
          CARTÃO {getSortIndicator('cartao')}
        </button>
        <button type="button" onClick={() => toggleSort('valor')} className="text-right flex items-center justify-end gap-1.5 hover:text-slate-200 transition-colors">
          VALOR {getSortIndicator('valor')}
        </button>
        <div>STATUS / AÇÕES</div>
      </div>

      {/* Lista de Transações */}
      <div className="space-y-2">
        {filteredTransacoes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            {viewMode === 'ultimos' ? 'Nenhum lançamento encontrado' : 'Nenhuma transação encontrada'}
          </div>
        ) : (
          <>
            {filteredTransacoes.slice(0, displayCount).map((transacao) => {
            const dataFormatada = (() => {
              const dateStr = viewMode === 'ultimos'
                ? (transacao.created_at || transacao.data)
                : (transacao.data || transacao.created_at);
              if (!dateStr) return '-';
              
              try {
                // Se for string em formato yyyy-mm-dd, adiciona T00:00:00
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                  const date = new Date(dateStr + 'T00:00:00');
                  if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('pt-BR');
                  }
                }
                
                // Se for string com timestamp ISO
                if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
                  const date = new Date(dateStr);
                  if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('pt-BR');
                  }
                }
                
                // Tentar parse direto
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                  return date.toLocaleDateString('pt-BR');
                }
                
                return dateStr; // Retorna a string original se tudo falhar
              } catch {
                return dateStr || '-';
              }
            })()
            
            const isReceita = transacao.tipo === 'receita' || (transacao.tipo === null && Number(transacao.valor || 0) > 0)
            const isPendente = transacao.status === 'pendente' || transacao.status === 'pendente_fatura'
            
            return (
              <div
                key={transacao.id}
                className={`grid gap-4 grid-cols-[50px_100px_1.5fr_130px_130px_100px_110px_120px] items-center px-6 py-4 rounded-lg border-l-4 border-b border-slate-700/30 bg-gradient-to-r hover:bg-slate-800/50 transition-colors text-sm ${
                  isReceita
                    ? 'from-green-500/5 border-l-green-500'
                    : isPendente
                    ? 'from-slate-500/10 border-l-slate-500'
                    : 'from-slate-700/10 border-l-red-500'
                }`}
              >
                <input 
                  type="checkbox" 
                  className="w-4 h-4 cursor-pointer" 
                  checked={selectedIds.includes(transacao.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds([...selectedIds, transacao.id]);
                    } else {
                      setSelectedIds(selectedIds.filter(id => id !== transacao.id));
                    }
                  }}
                />
                <div className="text-slate-300">
                  {dataFormatada}
                </div>
                <div className="font-medium text-slate-200 line-clamp-1">
                  {(() => {
                    const desc = transacao.descricao || transacao.observacao
                    return desc ? String(desc).toLocaleUpperCase('pt-BR') : '-'
                  })()}
                </div>
                <div className="text-slate-400 truncate text-xs">
                  {transacao.categorias?.nome || '-'}
                </div>
                <div className="text-slate-400 truncate text-xs">
                  {/* CONTA: mostra apenas se NÃO for cartão de crédito */}
                  {!transacao.cartao_id && transacao.conta_id && transacao.contas
                    ? transacao.contas.nome
                    : '-'}
                </div>
                <div className="text-slate-400 truncate text-xs">
                  {/* CARTÃO: mostra nome do cartão */}
                  {transacao.cartao_id ? (transacao.cartao_nome || 'Cartão') : '-'}
                </div>
                <div className={`font-bold text-right ${isReceita ? 'text-green-400' : 'text-red-400'}`}>
                  {isReceita ? '+' : '-'}{formatCurrency(Math.abs(transacao.valor || 0))}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={`text-xs px-2 py-1 rounded font-semibold ${
                      transacao.status === 'pendente' || transacao.status === 'pendente_fatura'
                        ? 'bg-yellow-900/60 text-yellow-300 border border-yellow-700/50'
                        : 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
                    }`}
                  >
                    {transacao.status === 'pendente_fatura' ? 'Fatura' : transacao.status === 'pendente' ? 'Pend.' : 'Pago'}
                  </Badge>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleEdit(transacao)} 
                      className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-500/10"
                      title="Editar"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir transação</AlertDialogTitle>
                          <AlertDialogDescription>Tem certeza que deseja remover esta transação? Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(transacao.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            )
          })}
            
            {/* Botão Carregar Mais */}
            {displayCount < filteredTransacoes.length && (
              <div className="flex justify-center py-6">
                <Button 
                  onClick={() => setDisplayCount(displayCount + 30)}
                  variant="outline"
                  className="gap-2 hover:bg-primary/10 border-primary/30 text-primary hover:text-primary"
                >
                  <span>Carregar mais</span>
                  <span className="text-xs text-muted-foreground">({displayCount} de {filteredTransacoes.length})</span>
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog de criação/edição de transação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-background via-background to-secondary/10 border border-border/40 shadow-2xl flex flex-col">
          {/* ===== HEADER PREMIUM ===== */}
          <div className="pb-6 border-b border-gradient-to-r from-primary/20 via-primary/10 to-transparent">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20">
                    {editingTransaction ? (
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-7-4l7-7m0 0l-7 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground/80 mt-1">Preencha os dados da transação abaixo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 px-2 pb-24 overflow-y-auto">
            {/* ========== SEÇÃO 1: VALOR PRINCIPAL ========== */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-gradient-to-br from-secondary/50 to-secondary/30 rounded-2xl p-6 border border-primary/20 shadow-lg">
                <div className="mb-4">
                  <h3 className="text-xs font-bold text-primary/90 uppercase tracking-wider">Informações Principais</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Data */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <Label htmlFor="quando" className="text-xs font-bold text-foreground/90 uppercase">Data</Label>
                    </div>
                    <DatePicker
                      date={formData.quando ? parse(formData.quando, 'yyyy-MM-dd', new Date()) : undefined}
                      onDateChange={(date) => {
                        const newDate = date ? format(date, 'yyyy-MM-dd') : '';
                        setFormData({ 
                          ...formData, 
                          quando: newDate,
                          isPago: date && date <= new Date() ? true : false,
                          status: date && date <= new Date() ? 'pago' : 'pendente'
                        });
                      }}
                      placeholder="Selecione a data"
                    />
                    <p className="text-xs text-muted-foreground/70">dia/mês/ano</p>
                  </div>

                  {/* Tipo */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4a1 1 0 011-1h16a1 1 0 011 1v2.757a1 1 0 01-.808 0 977A2 2 0 0012 4a2 2 0 100 4 2 2 0 00-11.192-2v-1.242z" />
                      </svg>
                      <Label htmlFor="tipo" className="text-xs font-bold text-foreground/90 uppercase">Tipo</Label>
                    </div>
                    <Select value={formData.tipo} onValueChange={value => setFormData({ ...formData, tipo: value })}>
                      <SelectTrigger className="h-12 text-sm border-primary/20 bg-background/60 focus:bg-background focus:border-primary/50 rounded-lg transition-all font-semibold">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita"><span className="text-lg">💰</span> Receita</SelectItem>
                        <SelectItem value="despesa"><span className="text-lg">💸</span> Despesa</SelectItem>
                        <SelectItem value="transferencia"><span className="text-lg">🔁</span> Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Valor Grande */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <Label htmlFor="valor" className="text-xs font-bold text-foreground/90 uppercase">Valor</Label>
                    </div>
                    <div className="relative h-12 group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-primary group-focus-within:text-primary/80 transition-colors">R$</span>
                      <Input
                        id="valor"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        className="h-12 text-sm border-primary/30 bg-background/50 focus:bg-background focus:border-primary/60 rounded-lg transition-all pl-12 font-bold text-base text-primary focus:ring-2 focus:ring-primary/20"
                        value={formData.valor || ''}
                        onChange={e => setFormData({ ...formData, valor: Number(e.target.value) })}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========== SEÇÃO 2: CLASSIFICAÇÃO ========== */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <h3 className="text-sm font-bold text-foreground/90 uppercase tracking-wider">Classificação</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Descrição */}
                <div className="space-y-2">
                  <Label htmlFor="estabelecimento" className="text-xs font-semibold text-foreground/80">Descrição</Label>
                  <Input
                    id="estabelecimento"
                    placeholder="Ex: Supermercado, Salário..."
                    className="h-11 text-sm border-border/40 bg-secondary/30 hover:bg-secondary/50 focus:bg-secondary/80 rounded-lg transition-colors"
                    value={formData.estabelecimento}
                    onChange={e => setFormData({ ...formData, estabelecimento: e.target.value })}
                    required
                  />
                </div>

                {/* Categoria */}
                <div className="space-y-2">
                  <Label htmlFor="category_id" className="text-xs font-semibold text-foreground/80">Categoria</Label>
                  <CategorySelector
                    value={formData.category_id}
                    onValueChange={value => setFormData({ ...formData, category_id: value })}
                    placeholder="Selecione uma"
                    tipo={formData.tipo as 'receita' | 'despesa' | ''}
                    className="h-11 text-sm border-border/40 bg-secondary/30 hover:bg-secondary/50 focus:bg-secondary/80 rounded-lg transition-colors"
                  />
                </div>
              </div>
            </div>


            {/* ========== SEÇÃO 3: MÉTODO DE PAGAMENTO ========== */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <h3 className="text-sm font-bold text-foreground/90 uppercase tracking-wider">Como foi pago?</h3>
              </div>
              
              {/* Método */}
              <div className="space-y-2">
                <Label htmlFor="metodo" className="text-xs font-semibold text-foreground/80">Forma de Pagamento</Label>
                <Select
                  value={formData.metodo}
                  onValueChange={value => setFormData(prev => ({
                    ...prev,
                    metodo: value,
                    ...(value !== 'cartao_credito' ? { isParcelado: false, numeroParcelas: 1 } : {}),
                  }))}
                >
                  <SelectTrigger className="h-11 text-sm border-border/40 bg-secondary/30 hover:bg-secondary/50 focus:bg-secondary/80 rounded-lg transition-colors">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix"><span className="text-lg">💳</span> PIX</SelectItem>
                    <SelectItem value="debito"><span className="text-lg">🏧</span> Débito</SelectItem>
                    <SelectItem value="cartao_credito"><span className="text-lg">💰</span> Cartão Crédito</SelectItem>
                    <SelectItem value="transferencia"><span className="text-lg">🔁</span> Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conta/Cartão */}
              {formData.metodo && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Label className="text-xs font-semibold text-foreground/80">
                    {formData.metodo === 'cartao_credito' ? '💳 Qual Cartão?' : '🏦 Qual Conta?'}
                  </Label>
                  {formData.metodo === 'cartao_credito' ? (
                    <CardSelector
                      value={formData.account_id}
                      onValueChange={value => setFormData({ ...formData, account_id: value })}
                      placeholder="Selecione seu cartão"
                    />
                  ) : (
                    <BankSelector
                      value={formData.account_id}
                      onValueChange={value => setFormData({ ...formData, account_id: value })}
                      placeholder="Selecione a conta"
                    />
                  )}
                </div>
              )}
            </div>


            {/* ========== SEÇÃO 4: OPÇÕES ========== */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-bold text-foreground/90 uppercase tracking-wider">Configurações</h3>
              </div>

              {/* Status de Pagamento */}
              <label className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-secondary/40 hover:bg-secondary/60 hover:border-primary/30 cursor-pointer transition-all group">
                <div className="flex items-center justify-center w-6 h-6 rounded-md border border-primary/40 bg-primary/10 group-hover:bg-primary/20 group-hover:border-primary/60">
                  <input
                    id="isPago"
                    type="checkbox"
                    checked={formData.isPago}
                    onChange={e => setFormData({ ...formData, isPago: e.target.checked, status: e.target.checked ? 'pago' : 'pendente' })}
                    className="w-4 h-4 cursor-pointer accent-primary rounded opacity-0 absolute"
                  />
                  {formData.isPago && (
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Marcar como Pago</p>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">{formData.isPago ? '✅ Pagamento confirmado' : '⏳ Pendente de confirmação'}</p>
                </div>
              </label>

              {/* Parcelamento */}
              {formData.metodo === 'cartao_credito' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-secondary/40 hover:bg-secondary/60 hover:border-primary/30 cursor-pointer transition-all group">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md border border-primary/40 bg-primary/10 group-hover:bg-primary/20 group-hover:border-primary/60">
                      <input
                        id="isParcelado"
                        type="checkbox"
                        checked={formData.isParcelado}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          isParcelado: e.target.checked,
                          numeroParcelas: e.target.checked ? 2 : 1,
                          ...(e.target.checked ? { isRecorrente: false, repetirMeses: 1 } : {}),
                        }))}
                        className="w-4 h-4 cursor-pointer accent-primary rounded opacity-0 absolute"
                      />
                      {formData.isParcelado && (
                        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">Parcelar Compra</p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">{formData.isParcelado ? '📊 Dividir em parcelas' : '📋 Compra à vista'}</p>
                    </div>
                  </label>

                  {formData.isParcelado && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 space-y-3 animate-in fade-in duration-200">
                      <Label htmlFor="numeroParcelas" className="text-xs font-bold text-foreground/90 uppercase tracking-wider">Quantas parcelas?</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="numeroParcelas"
                          type="number"
                          min="2"
                          max="12"
                          value={formData.numeroParcelas}
                          onChange={e => setFormData({ ...formData, numeroParcelas: Math.max(2, parseInt(e.target.value) || 1) })}
                          className="h-11 text-sm border-primary/40 bg-background/60"
                        />
                        <span className="text-xs font-semibold text-muted-foreground/80">máx 12</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recorrência */}
              <label className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-secondary/40 hover:bg-secondary/60 hover:border-primary/30 cursor-pointer transition-all group">
                <div className="flex items-center justify-center w-6 h-6 rounded-md border border-primary/40 bg-primary/10 group-hover:bg-primary/20 group-hover:border-primary/60">
                  <input
                    id="isRecorrente"
                    type="checkbox"
                    checked={formData.isRecorrente}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      isRecorrente: e.target.checked,
                      repetirMeses: e.target.checked ? 3 : 1,
                      ...(e.target.checked ? { isParcelado: false, numeroParcelas: 1 } : {}),
                    }))}
                    className="w-4 h-4 cursor-pointer accent-primary rounded opacity-0 absolute"
                  />
                  {formData.isRecorrente && (
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Repetir Mensalmente</p>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">{formData.isRecorrente ? '🔁 Transação automática' : '📅 Apenas uma vez'}</p>
                </div>
              </label>

              {formData.isRecorrente && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 space-y-3 animate-in fade-in duration-200">
                  <Label htmlFor="repetirMeses" className="text-xs font-bold text-foreground/90 uppercase tracking-wider">Por quantos meses?</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="repetirMeses"
                      type="number"
                      min="1"
                      max="60"
                      value={formData.repetirMeses}
                      onChange={e => setFormData({ ...formData, repetirMeses: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="h-11 text-sm border-primary/40 bg-background/60"
                    />
                    <span className="text-xs font-semibold text-muted-foreground/80">máx 60</span>
                  </div>
                </div>
              )}
            </div>

            {/* Spacer */}
            <div className="h-6" />
          </form>

          {/* ===== FOOTER PREMIUM ===== */}
          <div className="sticky bottom-0 border-t border-border/40 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-4 -mx-6 px-6">
            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                className="px-6 h-11 rounded-lg border-border/40 hover:bg-secondary/50 transition-all"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </Button>
              <Button 
                type="submit"
                onClick={handleSubmit}
                className="px-8 h-11 rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all font-semibold"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {editingTransaction ? 'Salvar Alterações' : 'Adicionar Transação'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              <DatePicker
                date={massDate ? parse(massDate, 'yyyy-MM-dd', new Date()) : undefined}
                onDateChange={(date) => setMassDate(date ? format(date, 'yyyy-MM-dd') : '')}
                placeholder="Selecione a nova data"
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

      {/* Modal Filtros Avançados */}
      <Dialog open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
        <DialogContent className="max-w-xl p-0 gap-0 border-slate-700/50 bg-slate-900/95 backdrop-blur-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-700/50">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20">
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                </span>
                Filtros Avançados
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">Refine sua busca com filtros detalhados</DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
            {/* Linha 1: Tipo + Período */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Tipo</Label>
                <Select value={advFilters.tipo} onValueChange={(v) => setAdvFilters({...advFilters, tipo: v})}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600 transition-colors">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="receita">
                      <span className="flex items-center gap-2">🟢 Receitas</span>
                    </SelectItem>
                    <SelectItem value="despesa">
                      <span className="flex items-center gap-2">🔴 Despesas</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Período</Label>
                <Select value={advFilters.period} onValueChange={(v) => setAdvFilters({...advFilters, period: v})}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600 transition-colors">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ultima_semana">Última semana</SelectItem>
                    <SelectItem value="ultimo_mes">Último mês</SelectItem>
                    <SelectItem value="ultimos_3_meses">Últimos 3 meses</SelectItem>
                    <SelectItem value="ultimo_ano">Último ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Categoria com indicação de tipo */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Categoria</Label>
              <Select value={advFilters.categories[0] || ''} onValueChange={(v) => setAdvFilters({...advFilters, categories: v ? [v] : []})}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600 transition-colors">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {/* Receitas */}
                  {categories.filter(c => c.tipo === 'receita').length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/5 border-t border-b border-emerald-500/10 mt-1">
                        ● Receitas
                      </div>
                      {categories.filter(c => c.tipo === 'receita').sort((a,b) => a.nome.localeCompare(b.nome)).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            {cat.nome}
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {/* Despesas */}
                  {categories.filter(c => c.tipo === 'despesa').length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest text-red-400 bg-red-500/5 border-t border-b border-red-500/10 mt-1">
                        ● Despesas
                      </div>
                      {categories.filter(c => c.tipo === 'despesa').sort((a,b) => a.nome.localeCompare(b.nome)).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                            {cat.nome}
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {/* Sem tipo definido */}
                  {categories.filter(c => !c.tipo).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-slate-500/5 border-t border-b border-slate-500/10 mt-1">
                        ● Sem tipo
                      </div>
                      {categories.filter(c => !c.tipo).sort((a,b) => a.nome.localeCompare(b.nome)).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            {cat.nome}
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Linha 3: Conta + Cartão */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Conta</Label>
                <BankSelector
                  value={advFilters.accounts[0] || ''}
                  onValueChange={(v) => setAdvFilters({...advFilters, accounts: v ? [v] : []})}
                  placeholder="Todas as contas"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Cartão</Label>
                <CardSelector
                  value={advFilters.cards[0] || ''}
                  onValueChange={(v) => setAdvFilters({...advFilters, cards: v ? [v] : []})}
                  placeholder="Todos os cartões"
                />
              </div>
            </div>

            {/* Linha 4: Status + Faixa de Valor */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Status</Label>
                <Select value={advFilters.status} onValueChange={(v) => setAdvFilters({...advFilters, status: v})}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600 transition-colors">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pago">
                      <span className="flex items-center gap-2">✅ Pago</span>
                    </SelectItem>
                    <SelectItem value="pendente">
                      <span className="flex items-center gap-2">⏳ Pendente</span>
                    </SelectItem>
                    <SelectItem value="atrasado">
                      <span className="flex items-center gap-2">⚠️ Atrasado</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Valor Mín.</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={advFilters.minValue}
                  onChange={(e) => setAdvFilters({...advFilters, minValue: e.target.value})}
                  className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600 transition-colors"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Valor Máx.</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={advFilters.maxValue}
                  onChange={(e) => setAdvFilters({...advFilters, maxValue: e.target.value})}
                  className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-colors cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={advFilters.onlyRecorrentes}
                  onChange={(e) => setAdvFilters({...advFilters, onlyRecorrentes: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-600 text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-slate-300">🔄 Apenas recorrentes</span>
              </label>
              <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-colors cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={advFilters.onlyParceladas}
                  onChange={(e) => setAdvFilters({...advFilters, onlyParceladas: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-600 text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-slate-300">💳 Apenas parceladas</span>
              </label>
            </div>

            {/* Filtros ativos */}
            {(() => {
              const activeCount = [
                advFilters.tipo && advFilters.tipo !== 'all',
                advFilters.period,
                advFilters.categories.length > 0,
                advFilters.accounts.length > 0,
                advFilters.cards.length > 0,
                advFilters.status && advFilters.status !== 'all',
                advFilters.minValue,
                advFilters.maxValue,
                advFilters.onlyRecorrentes,
                advFilters.onlyParceladas,
              ].filter(Boolean).length;
              return activeCount > 0 ? (
                <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  <span>{activeCount} {activeCount === 1 ? 'filtro ativo' : 'filtros ativos'}</span>
                </div>
              ) : null;
            })()}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-700/50 flex justify-between items-center bg-slate-900/50">
            <Button
              variant="ghost"
              onClick={handleClearAdvancedFilters}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              ✕ Limpar Filtros
            </Button>
            <Button
              onClick={handleApplyAdvancedFilters}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
            >
              Aplicar Filtros
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Gerenciar Faturas */}
      <GerenciarFaturasModal 
        open={invoicesOpen} 
        onClose={() => setInvoicesOpen(false)}
        onImportClick={(cardId) => {
          setCartaoParaImportar(cardId);
          setImportarFaturaOpen(true);
        }}
      />

      {/* Modal Importar Fatura */}
      <ImportarFaturaModal
        open={importarFaturaOpen}
        onClose={() => {
          setImportarFaturaOpen(false);
          setCartaoParaImportar(undefined);
          fetchTransacoes(); // Recarrega para mostrar novas transações
        }}
        cardId={cartaoParaImportar}
      />

      {/* Modal Importar Extrato */}
      <ImportarExtratoModal
        open={importarExtratoOpen}
        onClose={() => {
          setImportarExtratoOpen(false);
          fetchTransacoes(); // Recarrega para mostrar novas transações
        }}
        onImport={handleImportLancamentos}
        contas={contas}
      />

      {/* Modal Faturas em Aberto Details */}
      <Dialog open={pendingExpensesDetailOpen} onOpenChange={setPendingExpensesDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Faturas em Aberto</DialogTitle>
            <DialogDescription>Detalhes das despesas de faturas em aberto</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg">
              <p className="text-xs text-slate-600 dark:text-slate-400">Total das Faturas em Aberto</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(despesasPendentes)}</p>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg">
              <p className="text-xs text-slate-600 dark:text-slate-400">Contas Pendentes</p>
              <p className="text-xl font-bold text-green-600 mt-1">R$ 0,00</p>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg">
              <p className="text-xs text-slate-600 dark:text-slate-400">Cartões Pendentes</p>
              <p className="text-xl font-bold text-green-600 mt-1">R$ 0,00</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingExpensesDetailOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Transacoes;
