
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const normalizeCategoryName = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const categoryKey = (category: { nome: string; tipo: string | null }) =>
  `${String(category.tipo || '').trim().toLowerCase()}::${normalizeCategoryName(category.nome)}`;

export interface Category {
  id: string;
  nome: string;
  tags: string | null;
  tipo: string | null;
  created_at: string;
  updated_at: string;
  userid: string;
}

export function useCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nome, tags, tipo, created_at, user_id')
          .eq('user_id', user.id)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar categorias:', error);
        throw error;
      }

      const rows = (data || []) as Category[];
      const deduped = new Map<string, Category>();

      for (const row of rows) {
        const key = categoryKey(row);
        const existing = deduped.get(key);

        if (!existing) {
          deduped.set(key, row);
          continue;
        }

        const existingTs = Date.parse(existing.created_at || '');
        const candidateTs = Date.parse(row.created_at || '');
        const shouldReplace =
          !Number.isNaN(candidateTs) && (Number.isNaN(existingTs) || candidateTs < existingTs);

        if (shouldReplace) {
          deduped.set(key, row);
        }
      }

      return Array.from(deduped.values()).sort((a, b) =>
        String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
      );
    },
    enabled: !!user?.id,
  });

  const createCategory = useMutation({
    mutationFn: async (newCategory: { nome: string; tipo?: string; tags?: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const nome = newCategory.nome.trim();
      const tipo = newCategory.tipo || null;
      const normalizedNome = normalizeCategoryName(nome);

      let checkQuery = supabase
        .from('categorias')
        .select('id, nome, tipo')
        .eq('user_id', user.id)
        .ilike('nome', nome);

      if (tipo) {
        checkQuery = checkQuery.eq('tipo', tipo);
      } else {
        checkQuery = checkQuery.is('tipo', null);
      }

      const { data: existingRows, error: existingError } = await checkQuery;
      if (existingError) throw existingError;

      const existing = (existingRows || []).find(
        (row) => normalizeCategoryName(String(row.nome || '')) === normalizedNome
      );

      if (existing?.id) {
        return { ...existing, __alreadyExists: true };
      }

      const { data, error } = await supabase
        .from('categorias')
        .insert([
          {
            nome,
            tipo,
            tags: newCategory.tags || null,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { ...data, __alreadyExists: false };
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (result?.__alreadyExists) {
        toast.info('Categoria já existe.');
        return;
      }
      toast.success('Categoria criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar categoria:', error);
      toast.error('Erro ao criar categoria');
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { nome: string; tipo?: string; tags?: string } }) => {
      const { data, error } = await supabase
        .from('categorias')
        .update({
          nome: updates.nome,
          tipo: updates.tipo || null,
          tags: updates.tags || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar categoria:', error);
      toast.error('Erro ao atualizar categoria');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir categoria:', error);
      toast.error('Erro ao excluir categoria');
    },
  });

  return {
    categories,
    isLoading,
    error,
    createCategory: createCategory.mutate,
    updateCategory: updateCategory.mutate,
    deleteCategory: deleteCategory.mutate,
    isCreating: createCategory.isPending,
    isUpdating: updateCategory.isPending,
    isDeleting: deleteCategory.isPending,
  };
}
