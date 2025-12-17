import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // Habilita CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Responde OPTIONS para preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    console.log('🏛️ Proxy: Buscando CSV do Tesouro Direto...');
    
    const response = await fetch(
      'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv'
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();
    console.log(`✅ Proxy: CSV recebido com ${csvText.length} caracteres`);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/csv; charset=utf-8',
      },
      body: csvText,
    };
  } catch (error) {
    console.error('❌ Proxy: Erro ao buscar Tesouro Direto:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro ao buscar dados do Tesouro Direto',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
    };
  }
};
