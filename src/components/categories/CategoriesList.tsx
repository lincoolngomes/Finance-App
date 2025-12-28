
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category, index) => {
        const colorClass = getTypeColor(category.tipo);
        const isSelected = selectedIds.includes(category.id);
        return (
          <Card key={category.id} className={`overflow-hidden border-l-4 hover:shadow-lg transition-all ${colorClass.split(' ')[2]} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="p-0">
              {/* Header com gradiente e checkbox */}
              <div className={`bg-gradient-to-r ${colorClass.split(' ')[0]} ${colorClass.split(' ')[1]} p-4 border-b border-border/50`}>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(category.id)}
                    className="mt-0"
                  />
                  <div className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center">
                    <Tag className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base">{category.nome}</h3>
                    <p className="text-xs mt-0.5">
                      <span className={
                        category.tipo === 'receita' ? 'text-emerald-600' :
                        category.tipo === 'despesa' ? 'text-rose-600' :
                        category.tipo && category.tipo.toLowerCase().includes('invest') ? 'text-sky-600' :
                        'text-sky-600'
                      }>
                        {category.tipo ? category.tipo : '[sem tipo]'}
                      </span>
                    </p>
                    {category.tags && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {category.tags.split(',').length} palavras-chave
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    {categoryStats && categoryStats[category.id] && (
                      <span className="text-xs text-zinc-400">Lançamentos: {categoryStats[category.id].lancamentos} | Fluxo: {categoryStats[category.id].valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {category.tags && (
                <div className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {category.tags.split(',').slice(0, 6).map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag.trim()}
                      </Badge>
                    ))}
                    {category.tags.split(',').length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{category.tags.split(',').length - 6}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Footer com botões */}
              <div className="bg-secondary/30 p-3 flex gap-2 justify-between border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 text-primary border-primary hover:bg-primary/10"
                  onClick={() => onOpenLancamentos && onOpenLancamentos(category)}
                  type="button"
                  aria-label="Ver Lançamentos"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">Ver Lançamentos</span>
                  <span className="sm:hidden">Lançamentos</span>
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(category)}
                    className="h-8 gap-2"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Excluir</span>
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
