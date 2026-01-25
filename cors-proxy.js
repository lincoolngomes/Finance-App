// Proxy CORS para Supabase - Resolve o problema de CORS do Easypanel
import { createServer } from 'http';
import { request as httpsRequest } from 'https';
import { parse } from 'url';

const SUPABASE_URL = 'finance-app-supabase.rcnehy.easypanel.host';
const PORT = 8084;

const server = createServer((req, res) => {
  // CORS headers - permitir TUDO
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL
  const parsedUrl = parse(req.url || '');
  
  // Proxy options
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: parsedUrl.path,
    method: req.method,
    headers: {
      ...req.headers,
      host: SUPABASE_URL,
    },
  };

  // Remove headers que podem causar problemas
  delete options.headers['origin'];
  delete options.headers['referer'];

  console.log(`[PROXY] ${req.method} ${parsedUrl.path}`);

  // Fazer requisição
  const proxyReq = httpsRequest(options, (proxyRes) => {
    // Copiar headers da resposta
    Object.keys(proxyRes.headers).forEach((key) => {
      res.setHeader(key, proxyRes.headers[key]);
    });

    // Adicionar CORS novamente
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    res.writeHead(proxyRes.statusCode || 500);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[PROXY ERROR]', err.message);
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'Proxy Error', message: err.message }));
  });

  // Pipe request body
  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`\n✅ Proxy CORS rodando em http://localhost:${PORT}`);
  console.log(`📡 Proxying para: https://${SUPABASE_URL}`);
  console.log(`\n🔧 Configure seu app para usar: http://localhost:${PORT}\n`);
});
