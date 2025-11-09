
import { getWebhookURL, getAuthHeaders, N8N_CONFIG } from './n8n-config';

interface WhatsAppValidationResponse {
  exists: boolean | string;
  whatsapp: string;
}

// URLs dos webhooks para tentar (em ordem de prioridade)
const getWebhookURLs = () => {
  if (import.meta.env.DEV) {
    return [
      '/api/webhook-test/verifica-zap',
      '/api/webhook/verifica-zap'
    ];
  } else {
    return [
      'https://finance-app-n8n-finance-app.rcnehy.easypanel.host/webhook-test/verifica-zap',
      'https://finance-app-n8n-finance-app.rcnehy.easypanel.host/webhook/verifica-zap'
    ];
  }
};

async function tryWebhook(url: string, phoneNumber: string, authHeaders: Record<string, string>): Promise<{ exists: boolean; whatsappId?: string }> {
  console.log('Tentando webhook:', url);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), N8N_CONFIG.TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({
        whatsapp: phoneNumber
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log('Response status:', response.status, 'para', url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Tratar resposta JSON com cuidado
    const responseText = await response.text();
    console.log('Response text bruto:', responseText, 'de', url);
    
    let data: WhatsAppValidationResponse;
    try {
      if (!responseText.trim()) {
        throw new Error('Resposta vazia do N8N');
      }
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Erro ao parsear JSON:', jsonError, 'responseText:', responseText);
      throw new Error('N8N retornou resposta inválida');
    }
    
    console.log('Resposta do webhook parseada:', data, 'de', url);
    
    // Converter exists para boolean (N8N retorna como string)
    const exists = data.exists === 'true' || data.exists === true;
    
    // Manter o WhatsApp ID completo (incluindo @s.whatsapp.net ou @c.us)
    // Isso é necessário para identificação posterior em mensagens via WhatsApp
    let whatsappId = data.whatsapp;
    
    // Se não tiver o sufixo, adicionar o padrão @s.whatsapp.net
    if (whatsappId && !whatsappId.includes('@')) {
      whatsappId = whatsappId + '@s.whatsapp.net';
    }
    
    console.log('✅ Webhook funcionou! exists:', exists, 'whatsappId completo:', whatsappId);
    
    return {
      exists: exists,
      whatsappId: exists ? whatsappId : undefined
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function validateWhatsAppNumber(phoneNumber: string): Promise<{ exists: boolean; whatsappId?: string }> {
  console.log('🔍 Validando WhatsApp para número:', phoneNumber);
  
  const webhookURLs = getWebhookURLs();
  const authHeaders = getAuthHeaders();
  
  // Tentar cada webhook em ordem
  for (let i = 0; i < webhookURLs.length; i++) {
    const url = webhookURLs[i];
    try {
      const result = await tryWebhook(url, phoneNumber, authHeaders);
      console.log(`✅ Sucesso com webhook ${i + 1}/${webhookURLs.length}:`, url);
      return result;
    } catch (error) {
      console.log(`❌ Falha no webhook ${i + 1}/${webhookURLs.length} (${url}):`, error);
      
      // Se for o último webhook, lançar o erro
      if (i === webhookURLs.length - 1) {
        console.error('❌ Todos os webhooks falharam!');
        throw new Error('Não foi possível validar o WhatsApp. Tente novamente em alguns instantes.');
      }
      
      // Caso contrário, tentar o próximo
      console.log(`🔄 Tentando próximo webhook...`);
    }
  }
  
  // Este código nunca deveria ser alcançado, mas está aqui por segurança
  throw new Error('Erro inesperado na validação do WhatsApp.');
}
