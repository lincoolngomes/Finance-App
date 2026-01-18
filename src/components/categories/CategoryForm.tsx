
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories, Category } from '@/hooks/useCategories';

interface CategoryFormProps {
  category?: Category | null;
  onClose: () => void;
}

export function CategoryForm({ category, onClose }: CategoryFormProps) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [tags, setTags] = useState('');
  const { createCategory, updateCategory, isCreating, isUpdating } = useCategories();

  useEffect(() => {
    if (category) {
      setNome(category.nome);
      setTipo(category.tipo || '');
      setTags(category.tags || '');
    } else {
      setNome('');
      setTipo('');
      setTags('');
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !tipo) return;

    try {
      if (category) {
        updateCategory({
          id: category.id,
          updates: { 
            nome: nome.trim(), 
            tipo: tipo,
            tags: tags.trim() 
          },
        });
      } else {
        createCategory({
          nome: nome.trim(),
          tipo: tipo,
          tags: tags.trim(),
        });
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-black/70 backdrop-blur-sm border-primary/20">
        {/* Header com gradiente e ícone */}
        <DialogHeader className="bg-gradient-to-r from-primary/10 to-transparent p-4 -m-6 mb-4 border-b border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <DialogTitle className="text-lg font-bold">
              {category ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Nome da Categoria *
            </Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Alimentação"
              className="bg-background/50"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tipo" className="text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.5a2 2 0 00-1 .267" />
              </svg>
              Tipo de Categoria *
            </Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              Tags (opcional)
            </Label>
            <Textarea
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ex: Restaurantes, Supermercados, Cafés"
              className="bg-background/50"
              rows={3}
            />
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Separe as tags com vírgulas para melhor organização
            </p>
          </div>
          
          <div className="flex justify-end gap-2 pt-2 bg-secondary/30 -mx-6 -mb-6 p-4 border-t border-border/50">
            <Button type="button" variant="outline" onClick={onClose}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!nome.trim() || !tipo || isCreating || isUpdating}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {category ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
