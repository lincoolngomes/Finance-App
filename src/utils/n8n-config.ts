// Configurações para integração com N8N e WhatsApp
export const N8N_CONFIG = {
  // URL do webhook N8N - Usando webhook-test que está funcionando
  WEBHOOK_URL: import.meta.env.DEV 
    ? '/api/webhook-test/verifica-zap' 
    : 'https://finance-app-n8n-finance-app.rcnehy.easypanel.host/webhook-test/verifica-zap',
  
  // URLs alternativas para fallback
  WEBHOOK_URL_BACKUP: 'https://finance-app-n8n-finance-app.rcnehy.easypanel.host/webhook/verifica-zap',
  
  // Token do Asaas para autenticação (usado no N8N)
  // CONFIGURE AQUI com seu token do Asaas
  ASAAS_TOKEN: 'SEU_TOKEN_ASAAS_AQUI',
  
  // Credenciais básicas (backup - caso não use Asaas)
  USERNAME: 'zanini',
  PASSWORD: 'oba+1bilhao',
  
  // Tipo de autenticação: 'none', 'asaas' ou 'basic'
  AUTH_TYPE: 'none' as 'none' | 'asaas' | 'basic',
  
  // Timeout para requisições (em millisegundos)
  TIMEOUT: 10000,
  
  // Configurações do Evolution API
  EVOLUTION_API: {
    INSTANCE_NAME: 'FinanceApp'
  }
};

// Função para obter a URL completa do webhook
export function getWebhookURL(): string {
  return N8N_CONFIG.WEBHOOK_URL;
}

// Função para obter as credenciais corretas baseado no tipo
export function getAuthHeaders(): Record<string, string> {
  if (N8N_CONFIG.AUTH_TYPE === 'asaas') {
    return {
      'access_token': N8N_CONFIG.ASAAS_TOKEN
    };
  }

  if (N8N_CONFIG.AUTH_TYPE === 'basic') {
    return {
      'Authorization': `Basic ${btoa(`${N8N_CONFIG.USERNAME}:${N8N_CONFIG.PASSWORD}`)}`
    };
  }

  // 'none' -> sem headers de autenticação
  return {};
}

// Função legacy para compatibilidade
export function getAuthCredentials(): string {
  return btoa(`${N8N_CONFIG.USERNAME}:${N8N_CONFIG.PASSWORD}`);
}