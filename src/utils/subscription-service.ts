import { supabase } from '/src/lib/supabase';

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'free' | 'trial' | 'monthly' | 'yearly' | 'lifetime';
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  start_date: string;
  end_date: string | null;
  trial_end_date: string | null;
  created_by: 'kiwify' | 'admin' | 'self';
  metadata: Record<string, any>;
}

export interface SubscriptionInfo {
  plan_type: string;
  status: string;
  start_date: string;
  end_date: string | null;
  days_remaining: number | null;
  is_trial: boolean;
  created_by: string;
}

/**
 * Verifica se o usuário tem uma assinatura ativa
 */
export async function hasActiveSubscription(userId?: string): Promise<boolean> {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!uid) {
      return false;
    }

    const { data, error } = await supabase
      .rpc('has_active_subscription', { user_uuid: uid });

    if (error) {
      console.error('Erro ao verificar assinatura:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);
    return false;
  }
}

/**
 * Obtém informações detalhadas da assinatura do usuário
 */
export async function getSubscriptionInfo(userId?: string): Promise<SubscriptionInfo | null> {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!uid) {
      return null;
    }

    const { data, error } = await supabase
      .rpc('get_subscription_info', { user_uuid: uid });

    if (error) {
      console.error('Erro ao obter informações da assinatura:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Erro ao obter informações da assinatura:', error);
    return null;
  }
}

/**
 * Obtém a assinatura completa do usuário
 */
export async function getUserSubscription(userId?: string): Promise<Subscription | null> {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!uid) {
      return null;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', uid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Nenhuma assinatura encontrada
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao obter assinatura:', error);
    return null;
  }
}

/**
 * Cria uma assinatura gratuita para um usuário (Admin apenas)
 */
export async function createFreeSubscription(
  userId: string,
  options: {
    planType?: 'free' | 'trial';
    trialDays?: number;
  } = {}
): Promise<Subscription | null> {
  try {
    const { planType = 'free', trialDays = 0 } = options;
    
    const endDate = trialDays > 0 
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_type: planType,
        status: 'active',
        created_by: 'admin',
        end_date: endDate,
        trial_end_date: planType === 'trial' ? endDate : null,
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar assinatura gratuita:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar assinatura gratuita:', error);
    return null;
  }
}

/**
 * Cancela a assinatura do usuário
 */
export async function cancelSubscription(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    return false;
  }
}

/**
 * Reativa uma assinatura cancelada
 */
export async function reactivateSubscription(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        cancelled_at: null,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao reativar assinatura:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao reativar assinatura:', error);
    return false;
  }
}

/**
 * Lista todas as assinaturas (Admin apenas)
 */
export async function getAllSubscriptions(
  filters: {
    status?: string;
    planType?: string;
  } = {}
): Promise<Subscription[]> {
  try {
    let query = supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.planType) {
      query = query.eq('plan_type', filters.planType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar assinaturas:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao listar assinaturas:', error);
    return [];
  }
}

/**
 * Verifica se a assinatura está expirando em breve
 */
export function isSubscriptionExpiringSoon(subscription: Subscription | SubscriptionInfo, days: number = 7): boolean {
  if (!subscription.end_date) {
    return false; // Assinatura vitalícia
  }

  const endDate = new Date(subscription.end_date);
  const warningDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  return endDate <= warningDate && endDate > new Date();
}

/**
 * Formata o nome do plano para exibição
 */
export function formatPlanName(planType: string): string {
  const names: Record<string, string> = {
    free: 'Gratuito',
    trial: 'Trial',
    monthly: 'Mensal',
    yearly: 'Anual',
    lifetime: 'Vitalício',
  };

  return names[planType] || planType;
}

/**
 * Formata o status da assinatura para exibição
 */
export function formatSubscriptionStatus(status: string): string {
  const statuses: Record<string, string> = {
    active: 'Ativa',
    cancelled: 'Cancelada',
    expired: 'Expirada',
    pending: 'Pendente',
  };

  return statuses[status] || status;
}
