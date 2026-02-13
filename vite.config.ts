import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8082, // NOVA PORTA PARA FORÇAR REBUILD COMPLETO
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/.netlify\/functions/, ''),
      },
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
      },
      '/api/webhook-test': {
        target: 'https://finance-app-n8n-finance-app.rcnehy.easypanel.host',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/webhook-test/, '/webhook-test'),
        secure: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy TEST error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to TEST Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from TEST Target:', proxyRes.statusCode, req.url);
          });
        }
      },
      '/api/bcb': {
        target: 'https://api.bcb.gov.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          try {
            const url = new URL(`http://localhost${path}`)
            const serie = url.searchParams.get('serie') || '12'
            url.searchParams.delete('serie')
            const query = url.searchParams.toString()
            return `/dados/serie/bcdata.sgs.${serie}/dados${query ? `?${query}` : ''}`
          } catch {
            return path
          }
        },
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('BCB proxy response:', proxyRes.statusCode, req.url);
          })
        }
      },
      '/api/ibov': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => `/v8/finance/chart/%5EBVSP${path.replace(/^\/api\/ibov/, '')}`,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36')
            proxyReq.setHeader('Accept', 'application/json')
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('IBOV proxy response:', proxyRes.statusCode, req.url);
          })
        }
      },
      '/api/ibov-csv': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const query = path.replace(/^\/api\/ibov-csv/, '')
          return `/v7/finance/download/%5EBVSP${query}`
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36')
            proxyReq.setHeader('Accept', 'text/csv')
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('IBOV CSV proxy response:', proxyRes.statusCode, req.url);
          })
        }
      },
      '/api/ibov-stooq': {
        target: 'https://stooq.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const query = path.replace(/^\/api\/ibov-stooq/, '')
          return `/q/d/l/${query || '?s=%5EBVSP&i=d'}`
        },
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('IBOV stooq proxy response:', proxyRes.statusCode, req.url);
          })
        }
      }
    }
  },
  plugins: [
    // react(),
    // mode === 'development' &&
    // componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
