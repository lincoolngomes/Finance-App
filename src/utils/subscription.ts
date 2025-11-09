import { N8N_CONFIG, getAuthHeaders } from './n8n-config';

export interface SubscriptionData {
  id: string;
  dataAssinatura: string;
  valor: number;
  ciclo: string;
  status: string;
  proximoPagamento: string;
  creditCard: {
    creditCardNumber: string;
    creditCardBrand: string;
    creditCardToken: string;
  };
}

export interface SubscriptionResponse {
  success: boolean;
  data?: SubscriptionData;
  error?: string;
}

/**
 * Busca informações da assinatura via N8N
 */
export async function fetchSubscriptionInfo(identifier: string): Promise<SubscriptionResponse> {
  console.log('📧 Iniciando busca de assinatura via N8N:', identifier);
  
  const urls = [
    N8N_CONFIG.SUBSCRIPTION_WEBHOOK_URL,
    N8N_CONFIG.SUBSCRIPTION_WEBHOOK_URL_BACKUP
  ];

  for (const url of urls) {
    try {
      console.log(`🔄 Tentando webhook: ${url}`);
      
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...getAuthHeaders()
      };

      // Para requisições Basic Auth, usar o formato correto
      if (N8N_CONFIG.AUTH_TYPE === 'basic') {
        headers['Authorization'] = `Basic ${btoa(`${N8N_CONFIG.USERNAME}:${N8N_CONFIG.PASSWORD}`)}`;
      }

      console.log('📤 Headers:', Object.keys(headers));

      // Detectar se é email ou ID de assinatura
      const isEmail = identifier.includes('@');
      const bodyParams = isEmail 
        ? { email: identifier }
        : { subscription: identifier };

      console.log('📋 Parâmetros de busca:', bodyParams);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: new URLSearchParams(bodyParams),
        signal: AbortSignal.timeout(N8N_CONFIG.TIMEOUT)
      });

      console.log(`📡 Status da resposta: ${response.status}`);

      if (!response.ok) {
        console.log(`❌ Erro HTTP: ${response.status} - ${response.statusText}`);
        continue; // Tenta próxima URL
      }

      const responseText = await response.text();
      console.log('📄 Resposta bruta:', responseText.substring(0, 200));

      if (!responseText || responseText.trim() === '') {
        console.log('⚠️ Resposta vazia, tentando próxima URL...');
        continue;
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse do JSON:', parseError);
        console.log('📄 Texto da resposta:', responseText);
        continue;
      }

      // Verificar se a resposta tem a estrutura esperada
      if (data && data.id && data.dataAssinatura && data.valor) {
        console.log('✅ Dados de assinatura obtidos com sucesso');
        
        return {
          success: true,
          data: {
            id: data.id,
            dataAssinatura: data.dataAssinatura,
            valor: data.valor,
            ciclo: data.ciclo || 'MONTHLY',
            status: data.status || 'UNKNOWN',
            proximoPagamento: data.proximoPagamento || data.proimoPagamento || '',
            creditCard: {
              creditCardNumber: data.creditCard?.creditCardNumber || '****',
              creditCardBrand: data.creditCard?.creditCardBrand || 'Desconhecido',
              creditCardToken: data.creditCard?.creditCardToken || ''
            }
          }
        };
      } else {
        console.log('❌ Estrutura de dados inválida:', data);
        continue;
      }

    } catch (error: any) {
      console.error(`❌ Erro no webhook ${url}:`, error.message);
      
      if (error.name === 'TimeoutError') {
        console.log('⏰ Timeout na requisição');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.log('🌐 Erro de conexão de rede');
      }

      // Continue tentando outras URLs
      continue;
    }
  }

  console.log('❌ Falha em todos os webhooks para buscar assinatura');
  return {
    success: false,
    error: 'Não foi possível obter informações da assinatura. Tente novamente em alguns instantes.'
  };
}

/**
 * Verifica se uma assinatura está ativa
 */
export function isSubscriptionActive(status: string): boolean {
  const activeStatuses = ['ACTIVE', 'CONFIRMED', 'RECEIVED_IN_CASH', 'AWAITING_PAYMENT'];
  return activeStatuses.includes(status.toUpperCase());
}

/**
 * Formatar valor monetário
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formatar data
 */
export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('pt-BR');
  } catch (error) {
    return dateString;
  }
}

/**
 * Obter label do ciclo de cobrança
 */
export function getCycleLabel(cycle: string): string {
  const cycles: Record<string, string> = {
    'MONTHLY': 'Mensal',
    'YEARLY': 'Anual',
    'QUARTERLY': 'Trimestral',
    'BIANNUAL': 'Semestral',
    'WEEKLY': 'Semanal'
  };
  
  return cycles[cycle.toUpperCase()] || cycle;
}