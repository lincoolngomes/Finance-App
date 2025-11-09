// Configurações da Evolution API para validação interna
export const EVOLUTION_CONFIG = {
  // URL da sua Evolution API
  BASE_URL: 'https://evolution.tidi.com.br', // SUBSTITUA pela URL da sua Evolution API
  
  // Nome da instância
  INSTANCE_NAME: 'FinanceApp',
  
  // Token de acesso da Evolution API
  API_KEY: 'SEU_TOKEN_EVOLUTION_AQUI', // SUBSTITUA pelo seu token
  
  // Timeout para requisições
  TIMEOUT: 10000
};

// Função para validar WhatsApp diretamente na Evolution API
export async function validateWhatsAppDirect(phoneNumber: string): Promise<{ exists: boolean; whatsappId?: string }> {
  try {
    const url = `${EVOLUTION_CONFIG.BASE_URL}/chat/whatsappNumbers/${EVOLUTION_CONFIG.INSTANCE_NAME}`;
    
    console.log('Validando WhatsApp diretamente na Evolution API:', phoneNumber);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EVOLUTION_CONFIG.TIMEOUT);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_CONFIG.API_KEY,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        numbers: [phoneNumber]
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('Erro na Evolution API:', response.status, response.statusText);
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Resposta da Evolution API:', data);
    
    // A Evolution API retorna um array com os números validados
    const phoneData = data?.[0];
    
    if (phoneData && phoneData.exists) {
      return {
        exists: true,
        whatsappId: phoneData.jid || `${phoneNumber}@c.us`
      };
    }
    
    return {
      exists: false,
      whatsappId: undefined
    };
    
  } catch (error) {
    console.error('Erro na validação direta do WhatsApp:', error);
    throw new Error('Não foi possível validar o número do WhatsApp na Evolution API');
  }
}