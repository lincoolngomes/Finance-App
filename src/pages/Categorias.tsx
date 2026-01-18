import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, PiggyBank, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CategoriesList } from '@/components/categories/CategoriesList';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';

export default function Categorias() {
      // Editar categoria
      const handleEditCategory = (category: any) => {
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
        const todos = categories.map((c) => c.id);
        console.log('[DEBUG] handleSelectAll - selecionando todos:', todos);
        setSelectedIds(todos);
      } else {
        console.log('[DEBUG] handleSelectAll - limpando seleção');
        setSelectedIds([]);
      }
    };
  console.log('[DEBUG] Renderizando Categorias');
  // ...outros useStates...
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isChangeTypeModalOpen, setIsChangeTypeModalOpen] = useState(false);
  console.log('[DEBUG] selectedIds no render:', selectedIds);
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
      // Busca lançamentos com join para pegar o nome da conta
      const { data, error } = await supabase
        .from('transacoes')
        .select('*, conta:accounts(name)')
        .eq('category_id', categoria.id)
        .order('quando', { ascending: false });
      if (error) throw error;
      setModalLancamentos(data || []);
    } catch (err) {
      toast({ title: 'Erro ao buscar lançamentos', description: err.message, variant: 'destructive' });
      setModalLancamentos([]);
    } finally {
      setModalLoading(false);
    }
  };

  // Selecionar/deselecionar categoria individual
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const novo = prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id];
      console.log('[DEBUG] handleToggleSelect - novo selectedIds:', novo);
      return novo;
    });
  };
  const { categories, isLoading, error, updateCategory } = useCategories();
  const { user } = useAuth();
  const [changingType, setChangingType] = useState(false);
  const [sortOption, setSortOption] = useState('tipo');
  const [categoryStats, setCategoryStats] = useState<any>({});

  useEffect(() => {
    async function fetchStats() {
      // Implemente a lógica de busca de stats aqui, se necessário
    }
    fetchStats();
  }, []);

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
        aValue = a.conta?.name || '';
        bValue = b.conta?.name || '';
      }
      if (lancSort.key === 'valor') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      if (lancSort.key === 'quando') {
        aValue = aValue || '';
        bValue = bValue || '';
      }
      if (lancSort.key === 'descricao') {
        aValue = a.estabelecimento || '';
        bValue = b.estabelecimento || '';
      }
      if (aValue < bValue) return lancSort.asc ? -1 : 1;
      if (aValue > bValue) return lancSort.asc ? 1 : -1;
      return 0;
    });
    return lancs;
  }, [modalLancamentos, lancSort]);

  // Função para remover duplicadas
  const handleRemoveDuplicates = async () => {
    if (!confirm(`Deseja remover ${duplicadas.length} categoria(s) duplicada(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      // Remove as categorias duplicadas (mantém a primeira de cada nome)
      const idsToDelete = duplicadas.map(c => c.id);
      const { error } = await supabase
        .from('categorias')
        .delete()
        .in('id', idsToDelete);
      if (error) throw error;
      toast({ title: `${duplicadas.length} categoria(s) duplicada(s) removida(s) com sucesso!` });
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
    setChangingType(true);
    try {
      for (const id of selectedIds) {
        const cat = categories.find(c => c.id === id);
        console.log('[DEBUG] Tentando atualizar tipo das transações', { id, newType, cat });
        if (cat) {
          // Atualiza categoria
          await updateCategory({ id, updates: { nome: cat.nome, tags: cat.tags, tipo: newType } });
          // Atualiza todas as transações vinculadas
          const { data, error } = await supabase
            .from('transacoes')
            .update({ tipo: newType })
            .eq('category_id', id)
            .select();
          // Log para debug
          console.log('[DEBUG] Update transacoes:', { id, newType, data, error });
          if (error) {
            toast({ title: 'Erro ao atualizar transações', description: error.message, variant: 'destructive' });
            throw error;
          }
        } else {
          console.warn('[DEBUG] Categoria não encontrada para id:', id);
        }
      }
      setSelectedIds([]);
      toast({ title: `Tipo alterado para ${newType} em ${selectedIds.length} categoria(s) e transações vinculadas!` });
      window.location.reload();
    } catch (error: any) {
      console.error('[DEBUG] Erro ao alterar tipo:', error);
      toast({ title: 'Erro ao alterar tipo', description: error.message, variant: 'destructive' });
    } finally {
      setChangingType(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    if (!confirm(`Deseja remover ${selectedIds.length} categoria(s) selecionada(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast({ title: `${selectedIds.length} categoria(s) removida(s) com sucesso!` });
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


  // Debug visual
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-zinc-400 text-sm">Carregando categorias...</div>
        <div className="text-xs text-zinc-500">Usuário: {user?.id || 'NÃO AUTENTICADO'}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-red-500 font-bold">Erro ao buscar categorias</div>
        <div className="text-xs text-zinc-400">{error.message || String(error)}</div>
        <div className="text-xs text-zinc-500">Usuário: {user?.id || 'NÃO AUTENTICADO'}</div>
      </div>
    );
  }

  const isAllSelected = categories.length > 0 && selectedIds.length === categories.length;

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
                    <th className="px-2 py-1 border cursor-pointer" onClick={() => handleLancSort('conta')}>Conta</th>
                    <th className="px-2 py-1 border cursor-pointer" onClick={() => handleLancSort('tipo')}>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedModalLancamentos.map((lanc) => (
                    <tr key={lanc.id} className="border-b hover:bg-muted/50">
                      <td className="px-2 py-1 border">{lanc.quando}</td>
                      <td className="px-2 py-1 border">{lanc.estabelecimento}</td>
                      <td className="px-2 py-1 border text-right">{Number(lanc.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="px-2 py-1 border">{lanc.conta?.name || 'Sem conta'}</td>
                      <td className="px-2 py-1 border">{lanc.tipo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <div className="text-xs text-zinc-400 mb-2">Usuário: {user?.id || 'NÃO AUTENTICADO'} | Categorias carregadas: {categories.length}</div>
      
      {/* Header e Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize suas transações com categorias personalizadas</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {selectedIds.length > 0 && (
            <>
              <Button 
                onClick={() => setIsChangeTypeModalOpen(true)}
                variant="outline"
                className="gap-2 px-4"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                </svg>
                Mudar Tipo ({selectedIds.length})
              </Button>
              <Button 
                onClick={handleDeleteSelected}
                variant="destructive"
                className="gap-2 px-4"
              >
                <Trash2 className="h-4 w-4" />
                Excluir ({selectedIds.length})
              </Button>
            </>
          )}
          <Button onClick={() => setIsFormOpen(true)} className="gap-2 flex-1 sm:flex-initial">
            <Plus className="h-4 w-4" />
            Nova Categoria
          </Button>
        </div>
      </div>

      {/* Select Ordenação */}
      <div className="mb-4">
        <Select value={sortOption} onValueChange={setSortOption}>
          <SelectTrigger className="w-full sm:w-[260px]">
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
        <div className="flex items-center gap-2 mb-6">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            id="select-all"
          />
          <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
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
