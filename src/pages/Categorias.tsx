
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoriesList } from '@/components/categories/CategoriesList';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export default function Categorias() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          {duplicadas.length > 0 && (
            <Button 
              onClick={handleRemoveDuplicates} 
              variant="destructive"
              className="gap-2 flex-1 sm:flex-initial"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Remover {duplicadas.length} Duplicadas</span>
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

      <CategoriesList 
        categories={categories} 
        onEdit={handleEditCategory}
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
