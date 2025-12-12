
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CategoriesList } from '@/components/categories/CategoriesList';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export default function Categorias() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { categories, isLoading } = useCategories();

  // Debug: Log das categorias para identificar duplicadas
  console.log('Total de categorias:', categories.length);
  console.log('Categorias:', categories.map(c => ({ id: c.id, nome: c.nome, tags: c.tags })));
  
  // Identificar duplicadas
  const nomesUnicos = new Set<string>();
  const duplicadas = categories.filter(c => {
    if (nomesUnicos.has(c.nome)) {
      return true;
    }
    nomesUnicos.add(c.nome);
    return false;
  });
  
  if (duplicadas.length > 0) {
    console.warn('⚠️ Categorias duplicadas encontradas:', duplicadas.map(c => ({ id: c.id, nome: c.nome })));
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === categories.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(categories.map(c => c.id));
    }
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  const handleRemoveDuplicates = async () => {
    if (duplicadas.length === 0) {
      toast({ title: "Nenhuma categoria duplicada encontrada!" });
      return;
    }

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isAllSelected = categories.length > 0 && selectedIds.length === categories.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Organize suas transações com categorias personalizadas
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {selectedIds.length > 0 && (
            <Button 
              onClick={handleDeleteSelected} 
              variant="destructive"
              className="gap-2 flex-1 sm:flex-initial"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Excluir {selectedIds.length} Selecionadas</span>
              <span className="sm:hidden">Excluir ({selectedIds.length})</span>
            </Button>
          )}
          {duplicadas.length > 0 && selectedIds.length === 0 && (
            <Button 
              onClick={handleRemoveDuplicates} 
              variant="outline"
              className="gap-2 flex-1 sm:flex-initial border-red-500 text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Limpar {duplicadas.length} Duplicadas</span>
              <span className="sm:hidden">Limpar ({duplicadas.length})</span>
            </Button>
          )}
          <Button onClick={() => setIsFormOpen(true)} className="gap-2 flex-1 sm:flex-initial">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Categoria</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* Checkbox Selecionar Tudo */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2">
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

      <CategoriesList 
        categories={categories} 
        onEdit={handleEditCategory}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
      />

      {isFormOpen && (
        <CategoryForm
          category={editingCategory}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
