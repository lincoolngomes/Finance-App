import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  hasActiveSubscription,
  getSubscriptionInfo,
  getUserSubscription,
  createFreeSubscription,
  cancelSubscription,
  reactivateSubscription,
  type SubscriptionInfo,
  type Subscription,
} from '@/utils/subscription-service';
import { supabase } from '@/lib/supabase';

/**
 * Hook para verificar se usuário tem assinatura ativa
 */
export function useHasActiveSubscription(userId?: string) {
  return useQuery({
    queryKey: ['subscription', 'active', userId],
    queryFn: () => hasActiveSubscription(userId),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para obter informações da assinatura
 */
export function useSubscriptionInfo(userId?: string) {
  return useQuery<SubscriptionInfo | null>({
    queryKey: ['subscription', 'info', userId],
    queryFn: () => getSubscriptionInfo(userId),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para obter a assinatura completa
 */
export function useUserSubscription(userId?: string) {
  return useQuery<Subscription | null>({
    queryKey: ['subscription', 'full', userId],
    queryFn: () => getUserSubscription(userId),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para criar assinatura gratuita (Admin)
 */
export function useCreateFreeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      planType = 'free',
      trialDays = 0,
    }: {
      userId: string;
      planType?: 'free' | 'trial';
      trialDays?: number;
    }) => createFreeSubscription(userId, { planType, trialDays }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

/**
 * Hook para cancelar assinatura
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => cancelSubscription(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

/**
 * Hook para reativar assinatura
 */
export function useReactivateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => reactivateSubscription(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

/**
 * Hook para escutar mudanças em tempo real na assinatura
 */
export function useSubscriptionRealtime(userId?: string) {
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['subscription', 'realtime', userId],
    queryFn: async () => {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!uid) return null;

      // Configurar listener de tempo real
      const channel = supabase
        .channel('subscription-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${uid}`,
          },
          () => {
            // Invalidar todas as queries de subscription quando houver mudança
            queryClient.invalidateQueries({ queryKey: ['subscription'] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    enabled: !!userId,
    staleTime: Infinity, // Nunca expira - apenas invalida quando há mudança
  });
}
