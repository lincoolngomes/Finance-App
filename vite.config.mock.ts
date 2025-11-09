import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Mock webhook para desenvolvimento local
const mockWebhookPlugin = () => ({
  name: 'mock-webhook',
  configureServer(server) {
    server.middlewares.use('/api/webhook-test/verifica-zap', (req, res, next) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            console.log('Mock webhook recebeu:', data);
            
            // Simular resposta do N8N
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            res.end(JSON.stringify({
              exists: true,
              whatsapp: `${data.whatsapp}@c.us`
            }));
          } catch (error) {
            console.error('Erro no mock webhook:', error);
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
      } else {
        next();
      }
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/webhook': {
        target: 'https://finance-app-n8n-finance-app.rcnehy.easypanel.host',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/webhook/, '/webhook'),
        secure: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'development' && mockWebhookPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));