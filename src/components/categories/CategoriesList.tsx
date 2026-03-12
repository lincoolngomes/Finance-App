import { Edit, Trash2, Tag, List } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '/src/components/ui/button';
import { Badge } from '/src/components/ui/badge';
import { Card, CardContent } from '/src/components/ui/card';
import { Checkbox } from '/src/components/ui/checkbox';
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
} from '/src/components/ui/alert-dialog';
import { useCategories, Category } from '/src/hooks/useCategories';

interface CategoriesListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  lockedCategoryIds?: string[];
  showTypeColor?: boolean;
  categoryStats?: Record<string, { lancamentos: number, valor: number }>;
  onOpenLancamentos?: (category: Category) => void;
}

export function CategoriesList({
  categories,
  onEdit,
  selectedIds,
  onToggleSelect,
  lockedCategoryIds = [],
  showTypeColor,
  categoryStats,
  onOpenLancamentos,
}: CategoriesListProps) {
  const { deleteCategory } = useCategories();
  const lockedCategoryIdSet = useMemo(() => new Set(lockedCategoryIds), [lockedCategoryIds]);

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

  const actionButtonClass =
    'h-9 justify-center gap-2 rounded-lg border border-border/70 bg-background/40 px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary/70 md:h-8 md:w-9 md:px-0';

  return (
    <div className="space-y-3">
      {categories.map((category) => {
        const isLocked = lockedCategoryIdSet.has(category.id);
        const isSelected = isLocked || selectedIds.includes(category.id);
        const stats = categoryStats?.[category.id] || { lancamentos: 0, valor: 0 };
        const typeColor = 
          category.tipo === 'receita' ? 'text-emerald-600' :
          category.tipo === 'despesa' ? 'text-rose-600' :
          category.tipo && category.tipo.toLowerCase().includes('invest') ? 'text-sky-600' :
          'text-slate-400';

        return (
          <div 
            key={category.id}
            className={`rounded-xl border p-4 transition-colors ${
              isSelected && !isLocked
                ? 'bg-primary/10 border-primary' 
                : 'bg-secondary/30 border-border hover:bg-secondary/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isSelected}
                disabled={isLocked}
                onCheckedChange={() => !isLocked && onToggleSelect(category.id)}
                className="mt-1 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-start gap-2">
                      <h3 className="min-w-0 flex-1 break-words text-sm font-semibold leading-tight text-foreground sm:text-base">
                        {category.nome}
                      </h3>
                      <Badge 
                        variant="secondary" 
                        className={`shrink-0 text-[11px] ${typeColor} ${!category.tipo ? 'bg-slate-700/50' : ''}`}
                      >
                        {category.tipo || 'sem tipo'}
                      </Badge>
                      {isLocked && (
                        <Badge variant="outline" className="shrink-0 text-[11px] border-primary/50 text-primary">
                          padrão
                        </Badge>
                      )}
                    </div>

                    {category.tags && (
                      <p className="break-words text-xs leading-relaxed text-muted-foreground">
                        {category.tags}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{stats.lancamentos} lançamentos</span>
                      <span className="font-medium text-foreground/80">
                        {Number(stats.valor || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3 md:flex md:items-center md:justify-end md:border-t-0 md:pt-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenLancamentos && onOpenLancamentos(category)}
                      className={`${actionButtonClass} text-primary hover:bg-primary/10 hover:text-primary`}
                      title="Ver lançamentos"
                    >
                      <List className="h-4 w-4 shrink-0" />
                      <span className="truncate md:hidden">Lanç.</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(category)}
                      disabled={isLocked}
                      className={actionButtonClass}
                      title={isLocked ? 'Categoria padrão não pode ser editada' : 'Editar categoria'}
                    >
                      <Edit className="h-4 w-4 shrink-0" />
                      <span className="truncate md:hidden">Editar</span>
                    </Button>
                    {isLocked ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled
                        className={`${actionButtonClass} text-muted-foreground`}
                      >
                        <Trash2 className="h-4 w-4 shrink-0" />
                        <span className="truncate md:hidden">Padrão</span>
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`${actionButtonClass} text-red-500 hover:bg-red-500/10 hover:text-red-600`}
                            title="Excluir categoria"
                          >
                            <Trash2 className="h-4 w-4 shrink-0" />
                            <span className="truncate md:hidden">Excluir</span>
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
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
