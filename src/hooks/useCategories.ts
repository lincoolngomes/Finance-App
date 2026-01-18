
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
        .select('id, nome, tags, tipo, created_at, updated_at, userid')
        .eq('userid', user.id)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar categorias:', error);
        throw error;
      }

      return data as Category[];
    },
    enabled: !!user?.id,
  });

  const createCategory = useMutation({
    mutationFn: async (newCategory: { nome: string; tipo?: string; tags?: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('categorias')
        .insert([
          {
            nome: newCategory.nome,
            tipo: newCategory.tipo || null,
            tags: newCategory.tags || null,
            userid: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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
