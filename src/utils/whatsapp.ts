
import { getWebhookURL, getAuthHeaders, N8N_CONFIG } from './n8n-config';

interface WhatsAppValidationResponse {
  exists: boolean | string;
  whatsapp: string;
}

export async function validateWhatsAppNumber(phoneNumber: string): Promise<{ exists: boolean; whatsappId?: string }> {
  try {
    const webhookURL = getWebhookURL();
    const authHeaders = getAuthHeaders();
    
    console.log('Validando WhatsApp para número:', phoneNumber);
    console.log('URL do webhook:', webhookURL);
    
    // Configurar timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), N8N_CONFIG.TIMEOUT);
    
    const response = await fetch(webhookURL, {
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

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      console.error('Erro na resposta:', response.status, response.statusText);
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data: WhatsAppValidationResponse = await response.json();
    console.log('Resposta do webhook:', data);
    
    // Converter exists para boolean se vier como string
    const exists = typeof data.exists === 'string' ? data.exists === 'true' : !!data.exists;
    
    return {
      exists: exists,
      whatsappId: exists ? data.whatsapp : undefined
    };
  } catch (error) {
    console.error('Erro na validação do WhatsApp:', error);
    
    // Para desenvolvimento/teste, você pode comentar essa linha e retornar sempre true
    throw new Error('Não foi possível validar o número do WhatsApp. Verifique a conexão com o N8N.');
    
    // Para desabilitar temporariamente a validação (apenas para teste):
    // return { exists: true, whatsappId: phoneNumber + '@c.us' };
  }
}
