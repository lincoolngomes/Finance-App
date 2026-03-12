import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { Button } from '/src/components/ui/button';
import { Checkbox } from '/src/components/ui/checkbox';
import { Label } from '/src/components/ui/label';
import { CategoriesList } from '/src/components/categories/CategoriesList';
import { CategoryForm } from '/src/components/categories/CategoryForm';
import { useCategories } from '/src/hooks/useCategories';
import { supabase } from '/src/lib/supabase';
import { toast } from '/src/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '/src/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '/src/components/ui/dialog';
import { useAuth } from '/src/hooks/useAuth';
import { isDefaultCategory } from '/src/constants/defaultCategories';

type CategoryStats = Record<string, { lancamentos: number; valor: number }>;

const formatDateBr = (value: string | null | undefined) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw;
  }

  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
  }

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('pt-BR');
  }

  return raw;
};

const parseDateSortValue = (value: string | null | undefined) => {
  const raw = String(value || '').trim();
  if (!raw) return 0;

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const date = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

export default function Categorias() {
      // Editar categoria
      const handleEditCategory = (category: any) => {
        if (isDefaultCategory(category)) {
          toast({
            title: 'Categoria padrão',
            description: 'Categorias padrão não podem ser editadas.',
          });
          return;
        }
        setEditingCategory(category);
        setIsFormOpen(true);
      };

      // Fechar formulário
      const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingCategory(null);
      };

    // Selecionar todas as categorias
    const handleSelectAll = (checked: boolean | "indeterminate") => {
      if (checked) {
        const todos = categories
          .filter((c) => !isDefaultCategory(c))
          .map((c) => c.id);
        setSelectedIds(todos);
      } else {
        setSelectedIds([]);
      }
    };
  // ...outros useStates...
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isChangeTypeModalOpen, setIsChangeTypeModalOpen] = useState(false);
  // Modal de lançamentos
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<any>(null);
  const [modalLancamentos, setModalLancamentos] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Função para abrir modal e buscar lançamentos
  const handleOpenLancamentos = async (categoria: any) => {
    setModalCategoria(categoria);
    setModalOpen(true);
    setModalLoading(true);
    try {
      if (!user?.id) {
        throw new Error('Usuário não autenticado.');
      }

      const { data: transacoesData, error: transacoesError } = await supabase
        .from('transacoes')
        .select('*')
        .eq('categoria_id', categoria.id)
        .eq('user_id', user.id)
        .order('data', { ascending: false });

      if (transacoesError) throw transacoesError;
      let lancamentosBrutos = transacoesData || [];

      // Fallback: se não houver lançamentos nesse ID, tenta por categorias
      // duplicadas do mesmo usuário com o mesmo nome/tipo.
      if (lancamentosBrutos.length === 0 && categoria?.nome) {
        const normalizeCategoryValue = (value: string | null | undefined) =>
          String(value || '')
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

        const nomeAlvo = normalizeCategoryValue(categoria.nome);
        const tipoAlvo = normalizeCategoryValue(categoria.tipo);

        const { data: categoriasRelacionadas, error: categoriasRelacionadasError } = await supabase
          .from('categorias')
          .select('id, nome, tipo')
          .eq('user_id', user.id);

        if (!categoriasRelacionadasError && categoriasRelacionadas?.length) {
          const categoriaIdsRelacionados = categoriasRelacionadas
            .filter((c: any) => {
              const mesmoNome = normalizeCategoryValue(c?.nome) === nomeAlvo;
              if (!mesmoNome) return false;
              if (!tipoAlvo) return true;
              return normalizeCategoryValue(c?.tipo) === tipoAlvo;
            })
            .map((c: any) => c.id)
            .filter(Boolean);

          if (categoriaIdsRelacionados.length > 0) {
            const { data: fallbackTransacoes, error: fallbackTransacoesError } = await supabase
              .from('transacoes')
              .select('*')
              .in('categoria_id', categoriaIdsRelacionados)
              .eq('user_id', user.id)
              .order('data', { ascending: false });

            if (!fallbackTransacoesError && fallbackTransacoes) {
              lancamentosBrutos = fallbackTransacoes;
            }
          }
        }
      }

      const contaIds = Array.from(
        new Set(
          lancamentosBrutos
            .map((l) => l.conta_id || l.account_id)
            .filter(Boolean)
        )
      );
      const cartaoIds = Array.from(
        new Set(
          lancamentosBrutos
            .map((l) => l.cartao_id || l.card_id)
            .filter(Boolean)
        )
      );

      let contasMap = new Map<string, string>();
      if (contaIds.length > 0) {
        // Fallback para diferentes schemas: alguns usam "nome", outros "name".
        let contasData: any[] = [];

        const byNome = await supabase
          .from('accounts')
          .select('id, nome')
          .in('id', contaIds);

        if (!byNome.error && byNome.data) {
          contasData = byNome.data.map((c: any) => ({ id: c.id, label: c.nome }));
        } else {
          const byName = await supabase
            .from('accounts')
            .select('id, name')
            .in('id', contaIds);

          if (!byName.error && byName.data) {
            contasData = byName.data.map((c: any) => ({ id: c.id, label: c.name }));
          } else {
            console.warn('Não foi possível carregar nomes das contas para o modal de categorias.', {
              byNomeError: byNome.error,
              byNameError: byName.error,
            });
          }
        }

        contasMap = new Map(
          contasData.map((c: any) => [String(c.id), c.label || 'Sem conta'])
        );
      }

      let cartoesMap = new Map<string, string>();
      if (cartaoIds.length > 0) {
        let cartoesData: any[] = [];

        const byNome = await supabase
          .from('cartoes')
          .select('id, nome')
          .in('id', cartaoIds);

        if (!byNome.error && byNome.data) {
          cartoesData = byNome.data.map((c: any) => ({ id: c.id, label: c.nome }));
        } else {
          const byName = await supabase
            .from('cartoes')
            .select('id, name')
            .in('id', cartaoIds);

          if (!byName.error && byName.data) {
            cartoesData = byName.data.map((c: any) => ({ id: c.id, label: c.name }));
          } else {
            console.warn('Não foi possível carregar nomes dos cartões para o modal de categorias.', {
              byNomeError: byNome.error,
              byNameError: byName.error,
            });
          }
        }

        cartoesMap = new Map(
          cartoesData.map((c: any) => [String(c.id), c.label || 'Cartão'])
        );
      }

      const lancamentosComConta = lancamentosBrutos.map((l: any) => {
        const contaId = l.conta_id || l.account_id;
        const cartaoId = l.cartao_id || l.card_id;
        const contaNome = contaId ? contasMap.get(String(contaId)) || 'Sem conta' : 'Sem conta';
        const cartaoNome = cartaoId ? cartoesMap.get(String(cartaoId)) || 'Cartão' : null;
        const origemNome = cartaoNome || contaNome;
        const origemTipo = cartaoNome ? 'cartao' : 'conta';

        return {
          ...l,
          conta_nome: contaNome,
          cartao_nome: cartaoNome,
          origem_nome: origemNome,
          origem_tipo: origemTipo,
        };
      });

      setModalLancamentos(lancamentosComConta);
    } catch (err) {
      toast({ title: 'Erro ao buscar lançamentos', description: err?.message || String(err), variant: 'destructive' });
      setModalLancamentos([]);
    } finally {
      setModalLoading(false);
    }
  };

  // Selecionar/deselecionar categoria individual
  const handleToggleSelect = (id: string) => {
    if (defaultCategoryIdSet.has(id)) {
      return;
    }

    setSelectedIds((prev) => {
      const novo = prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id];
      return novo;
    });
  };
  const { categories, isLoading, error, updateCategory } = useCategories();
  const { user } = useAuth();
  const [changingType, setChangingType] = useState(false);
  const [sortOption, setSortOption] = useState('tipo');
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({});
  const defaultCategoryIds = useMemo(
    () => categories.filter((c) => isDefaultCategory(c)).map((c) => c.id),
    [categories]
  );
  const defaultCategoryIdSet = useMemo(() => new Set(defaultCategoryIds), [defaultCategoryIds]);
  const selectableCategoryIds = useMemo(
    () => categories.filter((c) => !isDefaultCategory(c)).map((c) => c.id),
    [categories]
  );

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => selectableCategoryIds.includes(id)));
  }, [selectableCategoryIds]);

  useEffect(() => {
    let isActive = true;

    async function fetchStats() {
      if (!user?.id) {
        if (isActive) setCategoryStats({});
        return;
      }

      const { data, error } = await supabase
        .from('transacoes')
        .select('categoria_id, valor')
        .eq('user_id', user.id)
        .not('categoria_id', 'is', null);

      if (error) {
        console.error('Erro ao buscar estatísticas das categorias:', error);
        if (isActive) setCategoryStats({});
        return;
      }

      const stats = (data || []).reduce((acc, row: any) => {
        const categoriaId = row?.categoria_id;
        if (!categoriaId) return acc;

        if (!acc[categoriaId]) {
          acc[categoriaId] = { lancamentos: 0, valor: 0 };
        }

        const valor = Number(row?.valor);
        acc[categoriaId].lancamentos += 1;
        acc[categoriaId].valor += Number.isFinite(valor) ? Math.abs(valor) : 0;

        return acc;
      }, {} as CategoryStats);

      if (isActive) {
        setCategoryStats(stats);
      }
    }

    fetchStats();

    return () => {
      isActive = false;
    };
  }, [user?.id]);

  // Ordenação das categorias
  // ...existing code...

  // Ordenação das categorias
  const sortedCategories = useMemo(() => {
    let cats = [...categories];
    if (sortOption === 'tipo' || sortOption === 'tipo_inverso') {
      // Função de prioridade para cada tipo
      const getTipoOrder = (tipo: string | null | undefined) => {
        if (!tipo || tipo === '') return 99;
        if (sortOption === 'tipo') {
          if (tipo.toLowerCase().includes('receita')) return 1;
          if (tipo.toLowerCase().includes('despesa')) return 2;
          if (tipo.toLowerCase().includes('invest')) return 3;
        } else {
          // tipo_inverso: investimentos, despesas, receitas
          if (tipo.toLowerCase().includes('invest')) return 1;
          if (tipo.toLowerCase().includes('despesa')) return 2;
          if (tipo.toLowerCase().includes('receita')) return 3;
        }
        return 98;
      };
      cats.sort((a, b) => {
        const orderA = getTipoOrder(a.tipo);
        const orderB = getTipoOrder(b.tipo);
        if (orderA !== orderB) return orderA - orderB;
        // Se mesmo tipo, ordena por nome
        return (a.nome || '').localeCompare(b.nome || '');
      });
    } else if (sortOption === 'az') {
      cats.sort((a, b) => a.nome.localeCompare(b.nome));
    } else if (sortOption === 'za') {
      cats.sort((a, b) => b.nome.localeCompare(a.nome));
    } else if (sortOption === 'mais_lanc') {
      cats.sort((a, b) => (categoryStats[b.id]?.lancamentos || 0) - (categoryStats[a.id]?.lancamentos || 0));
    } else if (sortOption === 'menos_lanc') {
      cats.sort((a, b) => (categoryStats[a.id]?.lancamentos || 0) - (categoryStats[b.id]?.lancamentos || 0));
    } else if (sortOption === 'maior_fluxo') {
      cats.sort((a, b) => Math.abs(categoryStats[b.id]?.valor || 0) - Math.abs(categoryStats[a.id]?.valor || 0));
    }
    return cats;
  }, [categories, sortOption, categoryStats]);

  // Identificar duplicadas
  const nomesUnicos = new Set<string>();
  const duplicadas = categories.filter(c => {
    if (nomesUnicos.has(c.nome)) {
      return true;
    } else {
      nomesUnicos.add(c.nome);
      return false;
    }
  });
  const duplicadasRemoviveis = duplicadas.filter((c) => !isDefaultCategory(c));

  // Ordenação dos lançamentos do modal
  const [lancSort, setLancSort] = useState<{ key: string, asc: boolean }>({ key: 'quando', asc: false });
  const handleLancSort = (key: string) => {
    setLancSort((prev) => {
      if (prev.key === key) {
        return { key, asc: !prev.asc };
      } else {
        return { key, asc: true };
      }
    });
  };
  const sortedModalLancamentos = useMemo(() => {
    const lancs = [...modalLancamentos];
    lancs.sort((a, b) => {
      let aValue = a[lancSort.key];
      let bValue = b[lancSort.key];
      if (lancSort.key === 'conta') {
        aValue = a.origem_nome || '';
        bValue = b.origem_nome || '';
      }
      if (lancSort.key === 'valor') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      if (lancSort.key === 'quando') {
        aValue = parseDateSortValue(a.data || a.quando);
        bValue = parseDateSortValue(b.data || b.quando);
      }
      if (lancSort.key === 'descricao') {
        aValue = a.descricao || a.estabelecimento || '';
        bValue = b.descricao || b.estabelecimento || '';
      }
      if (aValue < bValue) return lancSort.asc ? -1 : 1;
      if (aValue > bValue) return lancSort.asc ? 1 : -1;
      return 0;
    });
    return lancs;
  }, [modalLancamentos, lancSort]);

  // Função para remover duplicadas
  const handleRemoveDuplicates = async () => {
    if (duplicadasRemoviveis.length === 0) {
      toast({ title: 'Não há categorias duplicadas removíveis.' });
      return;
    }

    if (!confirm(`Deseja remover ${duplicadasRemoviveis.length} categoria(s) duplicada(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      // Remove as categorias duplicadas (mantém a primeira de cada nome)
      const idsToDelete = duplicadasRemoviveis.map(c => c.id);
      const { error } = await supabase
        .from('categorias')
        .delete()
        .in('id', idsToDelete);
      if (error) throw error;
      toast({ title: `${duplicadasRemoviveis.length} categoria(s) duplicada(s) removida(s) com sucesso!` });
      window.location.reload();
    } catch (error: any) {
      console.error('Erro ao remover duplicadas:', error);
      toast({
        title: "Erro ao remover duplicadas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Função para alterar o tipo das categorias selecionadas
  const handleChangeType = async (newType: string) => {
    const idsParaAlterar = selectedIds.filter((id) => !defaultCategoryIdSet.has(id));
    if (idsParaAlterar.length === 0) {
      toast({ title: 'Selecione ao menos uma categoria não padrão para alterar o tipo.' });
      return;
    }

    setChangingType(true);
    try {
      for (const id of idsParaAlterar) {
        const cat = categories.find(c => c.id === id);
        if (cat) {
          // Atualiza categoria
          await updateCategory({ id, updates: { nome: cat.nome, tags: cat.tags, tipo: newType } });
          // Atualiza todas as transações vinculadas
          const { error } = await supabase
            .from('transacoes')
            .update({ tipo: newType })
            .eq('categoria_id', id)
            .select();
          if (error) {
            toast({ title: 'Erro ao atualizar transações', description: error.message, variant: 'destructive' });
            throw error;
          }
        } else {
          console.warn('Categoria não encontrada para id:', id);
        }
      }
      setSelectedIds([]);
      toast({ title: `Tipo alterado para ${newType} em ${idsParaAlterar.length} categoria(s) e transações vinculadas!` });
      window.location.reload();
    } catch (error: any) {
      console.error('Erro ao alterar tipo:', error);
      toast({ title: 'Erro ao alterar tipo', description: error.message, variant: 'destructive' });
    } finally {
      setChangingType(false);
    }
  };

  const handleDeleteSelected = async () => {
    const idsParaExcluir = selectedIds.filter((id) => !defaultCategoryIdSet.has(id));
    if (idsParaExcluir.length === 0) {
      toast({ title: 'Selecione ao menos uma categoria não padrão para excluir.' });
      return;
    }

    if (!confirm(`Deseja remover ${idsParaExcluir.length} categoria(s) selecionada(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .in('id', idsParaExcluir);

      if (error) throw error;

      toast({ title: `${idsParaExcluir.length} categoria(s) removida(s) com sucesso!` });
      setSelectedIds([]);
      window.location.reload();
    } catch (error: any) {
      console.error('Erro ao remover categorias:', error);
      toast({
        title: "Erro ao remover categorias",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-zinc-400 text-sm">Carregando categorias...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-red-500 font-bold">Erro ao buscar categorias</div>
        <div className="text-xs text-zinc-400">{error.message || String(error)}</div>
      </div>
    );
  }

  const isAllSelected = categories.length > 0 && selectedIds.length === selectableCategoryIds.length;

  return (
    <>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lançamentos da categoria: {modalCategoria?.nome}</DialogTitle>
          </DialogHeader>
          {modalLoading ? (
            <div className="text-center py-8">Carregando lançamentos...</div>
          ) : modalLancamentos.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">Nenhum lançamento encontrado para esta categoria.</div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-2 py-1 border cursor-pointer" onClick={() => handleLancSort('quando')}>Data</th>
                    <th className="px-2 py-1 border cursor-pointer" onClick={() => handleLancSort('descricao')}>Descrição</th>
                    <th className="px-2 py-1 border cursor-pointer" onClick={() => handleLancSort('valor')}>Valor</th>
                    <th className="px-2 py-1 border cursor-pointer" onClick={() => handleLancSort('conta')}>Conta/Cartão</th>
                    <th className="px-2 py-1 border cursor-pointer" onClick={() => handleLancSort('tipo')}>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedModalLancamentos.map((lanc) => (
                    <tr key={lanc.id} className="border-b hover:bg-muted/50">
                      <td className="px-2 py-1 border">{formatDateBr(lanc.data)}</td>
                      <td className="px-2 py-1 border">{lanc.descricao || lanc.estabelecimento || '-'}</td>
                      <td className="px-2 py-1 border text-right">{Number(lanc.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="px-2 py-1 border">{lanc.origem_nome || '-'}</td>
                      <td className="px-2 py-1 border">{lanc.tipo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Header e Controles */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Categorias</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Organize suas transações com categorias personalizadas.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {selectedIds.length > 0 && (
            <>
              <Button 
                onClick={() => setIsChangeTypeModalOpen(true)}
                variant="outline"
                className="min-h-10 flex-1 gap-2 px-4 sm:flex-initial"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                </svg>
                Mudar Tipo ({selectedIds.length})
              </Button>
              <Button 
                onClick={handleDeleteSelected}
                variant="destructive"
                className="min-h-10 flex-1 gap-2 px-4 sm:flex-initial"
              >
                <Trash2 className="h-4 w-4" />
                Excluir ({selectedIds.length})
              </Button>
            </>
          )}
          <Button onClick={() => setIsFormOpen(true)} className="min-h-10 flex-1 gap-2 sm:flex-initial">
            <Plus className="h-4 w-4" />
            Nova Categoria
          </Button>
        </div>
      </div>

      {/* Select Ordenação */}
      <div className="mb-4">
        <Select value={sortOption} onValueChange={setSortOption}>
          <SelectTrigger className="min-h-11 w-full sm:w-[260px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tipo">Tipo (Receita, Despesa, Investimento)</SelectItem>
            <SelectItem value="tipo_inverso">Tipo (Investimento, Despesa, Receita)</SelectItem>
            <SelectItem value="az">Nome A-Z</SelectItem>
            <SelectItem value="za">Nome Z-A</SelectItem>
            <SelectItem value="mais_lanc">Mais lançamentos</SelectItem>
            <SelectItem value="menos_lanc">Menos lançamentos</SelectItem>
            <SelectItem value="maior_fluxo">Maior fluxo de movimentação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Checkbox Selecionar Tudo */}
      {categories.length > 0 && (
        <div className="mb-6 flex items-center gap-2">
          <Checkbox
            checked={isAllSelected}
            disabled={selectableCategoryIds.length === 0}
            onCheckedChange={handleSelectAll}
            id="select-all"
          />
          <Label htmlFor="select-all" className="cursor-pointer text-sm font-medium leading-snug">
            Selecionar todas ({categories.length})
          </Label>
        </div>
      )}

      {/* Lista de Categorias */}
      <CategoriesList
        categories={sortedCategories}
        onEdit={handleEditCategory}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        lockedCategoryIds={defaultCategoryIds}
        showTypeColor
        categoryStats={categoryStats}
        onOpenLancamentos={handleOpenLancamentos}
      />

      {isFormOpen && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <CategoryForm
                category={editingCategory}
                onClose={handleCloseForm}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Mudança de Tipo em Massa */}
      {isChangeTypeModalOpen && (
        <Dialog open={isChangeTypeModalOpen} onOpenChange={setIsChangeTypeModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Mudar Tipo de Categoria</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Alterar o tipo para {selectedIds.length} categoria(s) selecionada(s):
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    handleChangeType('receita');
                    setIsChangeTypeModalOpen(false);
                  }}
                  disabled={changingType}
                  className="w-full"
                  variant="outline"
                >
                  <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                  Receita
                </Button>
                <Button
                  onClick={() => {
                    handleChangeType('despesa');
                    setIsChangeTypeModalOpen(false);
                  }}
                  disabled={changingType}
                  className="w-full"
                  variant="outline"
                >
                  <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
                  Despesa
                </Button>
              </div>
              <Button
                onClick={() => setIsChangeTypeModalOpen(false)}
                disabled={changingType}
                variant="ghost"
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
    );
  }
