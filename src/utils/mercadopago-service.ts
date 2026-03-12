// Serviço para integração com Mercado Pago
// Configure o Access Token nas variáveis de ambiente

const MP_ACCESS_TOKEN = import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || '';
const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '';

export interface PaymentPreference {
  id: string;
  init_point: string; // URL para redirecionar usuário
  sandbox_init_point?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  plan_type: 'monthly' | 'yearly' | 'lifetime';
  price: number;
  currency: string;
  trial_days: number;
  features: string[];
}

/**
 * Cria uma preferência de pagamento no Mercado Pago
 */
export async function createPaymentPreference(
  planType: 'monthly' | 'yearly' | 'lifetime',
  userEmail: string,
  userName?: string
): Promise<PaymentPreference> {
  try {
    // Definir valores baseado no plano
    const plans: Record<string, { title: string; price: number }> = {
      monthly: { title: 'Finance App - Mensal', price: 29.90 },
      yearly: { title: 'Finance App - Anual', price: 249.90 },
      lifetime: { title: 'Finance App - Vitalício', price: 597.00 },
    };

    const plan = plans[planType];

    const preference = {
      items: [
        {
          title: plan.title,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: plan.price,
        },
      ],
      payer: {
        email: userEmail,
        name: userName || userEmail.split('@')[0],
      },
      back_urls: {
        success: `${window.location.origin}/assinatura/sucesso`,
        failure: `${window.location.origin}/assinatura/erro`,
        pending: `${window.location.origin}/assinatura/pendente`,
      },
      auto_return: 'approved',
      notification_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-webhook`,
      metadata: {
        plan_type: planType,
        user_email: userEmail,
      },
      statement_descriptor: 'FINANCE APP',
      payment_methods: {
        excluded_payment_types: [],
        installments: planType === 'monthly' ? 1 : 12, // Mensal: 1x, outros: até 12x
      },
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao criar preferência de pagamento');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    throw error;
  }
}

/**
 * Busca planos disponíveis no Supabase
 */
export async function getAvailablePlans(): Promise<SubscriptionPlan[]> {
  const { supabase } = await import('/src/lib/supabase');
  
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) {
    console.error('Erro ao buscar planos:', error);
    return [];
  }

  return data || [];
}

/**
 * Formata preço em BRL
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

/**
 * Calcula economia anual
 */
export function calculateYearlySavings(monthlyPrice: number, yearlyPrice: number): number {
  return (monthlyPrice * 12) - yearlyPrice;
}

/**
 * Retorna chave pública do Mercado Pago
 */
export function getMercadoPagoPublicKey(): string {
  return MP_PUBLIC_KEY;
}
