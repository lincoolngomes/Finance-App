
import { Edit, Trash2, Tag, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCategories, Category } from '@/hooks/useCategories';

import { useNavigate } from 'react-router-dom';

interface CategoriesListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  showTypeColor?: boolean;
  categoryStats?: Record<string, { lancamentos: number, valor: number }>;
  onOpenLancamentos?: (category: Category) => void;
}

export function CategoriesList({ categories, onEdit, selectedIds, onToggleSelect, showTypeColor, categoryStats, onOpenLancamentos }: CategoriesListProps) {
  // const navigate = useNavigate();
  const { deleteCategory } = useCategories();

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
          <Tag className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
          <h3 className="text-base sm:text-lg font-medium mb-2 text-center">Nenhuma categoria encontrada</h3>
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            Crie sua primeira categoria para começar a organizar suas transações
          </p>
        </CardContent>
      </Card>
    );
  }

  function getTypeColor(tipo: string | null | undefined) {
    if (!showTypeColor) return 'from-blue-500/20 to-blue-500/5 border-l-blue-500';
    if (!tipo || tipo === '') return 'from-sky-500/20 to-sky-500/5 border-l-sky-500';
    if (tipo.toLowerCase() === 'receita') return 'from-emerald-500/20 to-emerald-500/5 border-l-emerald-500';
    if (tipo.toLowerCase() === 'despesa') return 'from-rose-500/20 to-rose-500/5 border-l-rose-500';
    if (tipo.toLowerCase().includes('invest')) return 'from-sky-500/20 to-sky-500/5 border-l-sky-500';
    return 'from-zinc-500/20 to-zinc-500/5 border-l-zinc-500';
  }

  return (
    <div className="space-y-3">
      {categories.map((category) => {
        const isSelected = selectedIds.includes(category.id);
        const typeColor = 
          category.tipo === 'receita' ? 'text-emerald-600' :
          category.tipo === 'despesa' ? 'text-rose-600' :
          category.tipo && category.tipo.toLowerCase().includes('invest') ? 'text-sky-600' :
          'text-slate-400';

        return (
          <div 
            key={category.id}
            className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
              isSelected 
                ? 'bg-primary/10 border-primary' 
                : 'bg-secondary/30 border-border hover:bg-secondary/50'
            }`}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(category.id)}
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{category.nome}</h3>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${typeColor} ${!category.tipo ? 'bg-slate-700/50' : ''}`}
                >
                  {category.tipo || 'sem tipo'}
                </Badge>
              </div>
              {category.tags && (
                <p className="text-xs text-muted-foreground">
                  {category.tags}
                </p>
              )}
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenLancamentos && onOpenLancamentos(category)}
                className="h-8 gap-2 text-primary hover:bg-primary/10"
                title="Ver lançamentos"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(category)}
                className="h-8 px-3"
                title="Editar categoria"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-3 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    title="Excluir categoria"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir a categoria "{category.nome}"? 
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteCategory(category.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  );
}
