import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import { fetchSubscriptionInfo, SubscriptionData, isSubscriptionActive } from '@/utils/subscription';
import { toast } from './use-toast';

interface UseSubscriptionReturn {
  subscriptionData: SubscriptionData | null;
  loading: boolean;
  error: string | null;
  hasSubscription: boolean;
  isActive: boolean;
  refreshSubscription: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assinaturaId, setAssinaturaId] = useState<string | null>(null);

  // Buscar assinatura do usuário usando email como identificador
  const fetchUserSubscription = async () => {
    if (!user?.email) return;

    try {
      console.log('🔍 Buscando assinatura do usuário via email:', user.email);
      
      // Usar diretamente o email do usuário para buscar no N8N
      const subscriptionId = user.email;
      
      console.log('📧 Usando email como identificador da assinatura:', subscriptionId);
      setAssinaturaId(subscriptionId);
      
      return subscriptionId;
    } catch (error: any) {
      console.error('❌ Erro ao buscar assinatura:', error);
      setError('Erro ao buscar informações da assinatura');
      return null;
    }
  };

  // Buscar dados da assinatura via N8N
  const fetchSubscriptionData = async (subscriptionId: string) => {
    try {
      console.log('📊 Buscando dados da assinatura via N8N...');
      setError(null);
      
      const response = await fetchSubscriptionInfo(subscriptionId);
      
      if (response.success && response.data) {
        console.log('✅ Dados da assinatura obtidos:', response.data);
        setSubscriptionData(response.data);
      } else {
        console.log('❌ Falha ao obter dados da assinatura:', response.error);
        setError(response.error || 'Erro ao buscar dados da assinatura');
        setSubscriptionData(null);
      }
    } catch (error: any) {
      console.error('❌ Erro inesperado ao buscar assinatura:', error);
      setError(error.message || 'Erro inesperado');
      setSubscriptionData(null);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    if (user?.id) {
      loadSubscription();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  // Buscar dados quando assinaturaId muda
  useEffect(() => {
    if (assinaturaId) {
      fetchSubscriptionData(assinaturaId);
    }
    setLoading(false);
  }, [assinaturaId]);

  const loadSubscription = async () => {
    setLoading(true);
    const subscriptionId = await fetchUserSubscription();
    
    if (subscriptionId) {
      await fetchSubscriptionData(subscriptionId);
    }
    
    setLoading(false);
  };

  // Função para forçar atualização dos dados
  const refreshSubscription = async () => {
    await loadSubscription();
  };

  const hasSubscription = !!assinaturaId && !!subscriptionData;
  const isActive = subscriptionData ? isSubscriptionActive(subscriptionData.status) : false;

  return {
    subscriptionData,
    loading,
    error,
    hasSubscription,
    isActive,
    refreshSubscription
  };
}