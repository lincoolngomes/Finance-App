import { defineConfig, loadEnv } from "vite";
// import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger";

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

const buildSupabaseTargetList = (primaryUrl: string, fallbackUrls?: string) => {
  const defaults = [
    "https://alqzqapccyclmffdfmlc.supabase.co",
    "https://finance-app-supabase-app.rcnehy.easypanel.host",
    "https://finance-app-supabase.rcnehy.easypanel.host",
    "https://finance-app-supabase-finance-app.rcnehy.easypanel.host",
  ];

  const fromEnv = (fallbackUrls || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const candidates = [primaryUrl, ...fromEnv, ...defaults]
    .map(normalizeBaseUrl)
    .filter(Boolean);

  return [...new Set(candidates)];
};

const readRequestBody = async (req: any) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const createSupabaseSmartProxy = (targets: string[]) => ({
  name: "supabase-smart-proxy",
  configureServer(server: any) {
    server.middlewares.use("/supabase", async (req: any, res: any, next: any) => {
      try {
        const method = req.method || "GET";
        const suffix = req.url?.startsWith("/") ? req.url : `/${req.url || ""}`;
        const body =
          method === "GET" || method === "HEAD" || method === "OPTIONS"
            ? undefined
            : await readRequestBody(req);

        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.headers || {})) {
          if (!value) {
            continue;
          }

          const normalizedKey = key.toLowerCase();
          if (
            normalizedKey === "host" ||
            normalizedKey === "content-length" ||
            normalizedKey === "connection"
          ) {
            continue;
          }

          headers[normalizedKey] = Array.isArray(value) ? value.join(", ") : String(value);
        }

        const urlsToTry = [];
        for (const base of targets) {
          urlsToTry.push(`${base}${suffix}`);
          urlsToTry.push(`${base}/supabase${suffix}`);
        }

        let lastStatus = 502;
        let lastUrl = "";
        let lastBody = "";

        for (const upstreamUrl of [...new Set(urlsToTry)]) {
          try {
            const upstreamResponse = await fetch(upstreamUrl, {
              method,
              headers,
              body,
              redirect: "manual",
            });

            const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
            const responseText = responseBuffer.toString("utf-8");
            const contentType = upstreamResponse.headers.get("content-type")?.toLowerCase() || "";
            const isHtmlErrorResponse =
              contentType.includes("text/html") && upstreamResponse.status >= 400;
            const hasKnownGatewayMarkers =
              responseText.includes("/api/errors/not-started") ||
              responseText.includes("/api/errors/not-found") ||
              responseText.includes("<title>Not Found</title>") ||
              responseText.includes("easypanel.io");

            // Mantém tentando quando cair em páginas de erro conhecidas do gateway.
            if (
              upstreamResponse.status >= 500 ||
              upstreamResponse.status === 404 ||
              isHtmlErrorResponse ||
              hasKnownGatewayMarkers
            ) {
              lastStatus = upstreamResponse.status;
              lastUrl = upstreamUrl;
              lastBody = responseText.slice(0, 800);
              continue;
            }

            res.statusCode = upstreamResponse.status;
            upstreamResponse.headers.forEach((headerValue, headerKey) => {
              if (headerKey.toLowerCase() === "transfer-encoding") {
                return;
              }
              res.setHeader(headerKey, headerValue);
            });
            res.end(responseBuffer);
            return;
          } catch (error: any) {
            lastStatus = 502;
            lastUrl = upstreamUrl;
            lastBody = error?.message || String(error);
          }
        }

        res.statusCode = lastStatus;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(
          JSON.stringify({
            error: "supabase_proxy_failed",
            message: "Nao foi possivel conectar ao Supabase via proxy local.",
            lastUrl,
            lastStatus,
            details: lastBody,
          }),
        );
      } catch (error) {
        next(error);
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseProxyTarget =
    env.VITE_SUPABASE_URL || "https://finance-app-supabase-app.rcnehy.easypanel.host";
  const supabaseTargets = buildSupabaseTargetList(
    supabaseProxyTarget,
    env.VITE_SUPABASE_FALLBACK_URLS,
  );

  return {
    server: {
      host: "::",
      port: 8082, // NOVA PORTA PARA FORÇAR REBUILD COMPLETO
      proxy: {
        "/.netlify/functions": {
          target: "http://localhost:9000",
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/.netlify\/functions/, ""),
        },
        "/api/webhook": {
          target: "https://finance-app-n8n-finance-app.rcnehy.easypanel.host",
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api\/webhook/, "/webhook"),
          secure: true,
          configure: (proxy) => {
            proxy.on("error", (err) => {
              console.log("Proxy error:", err);
            });
            proxy.on("proxyReq", (_proxyReq, req) => {
              console.log("Sending Request to the Target:", req.method, req.url);
            });
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log("Received Response from the Target:", proxyRes.statusCode, req.url);
            });
          },
        },
        "/api/webhook-test": {
          target: "https://finance-app-n8n-finance-app.rcnehy.easypanel.host",
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api\/webhook-test/, "/webhook-test"),
          secure: true,
          configure: (proxy) => {
            proxy.on("error", (err) => {
              console.log("Proxy TEST error:", err);
            });
            proxy.on("proxyReq", (_proxyReq, req) => {
              console.log("Sending Request to TEST Target:", req.method, req.url);
            });
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log("Received Response from TEST Target:", proxyRes.statusCode, req.url);
            });
          },
        },
        "/api/bcb": {
          target: "https://api.bcb.gov.br",
          changeOrigin: true,
          secure: true,
          rewrite: (requestPath) => {
            try {
              const url = new URL(`http://localhost${requestPath}`);
              const serie = url.searchParams.get("serie") || "12";
              url.searchParams.delete("serie");
              const query = url.searchParams.toString();
              return `/dados/serie/bcdata.sgs.${serie}/dados${query ? `?${query}` : ""}`;
            } catch {
              return requestPath;
            }
          },
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log("BCB proxy response:", proxyRes.statusCode, req.url);
            });
          },
        },
        "/api/ibov": {
          target: "https://query2.finance.yahoo.com",
          changeOrigin: true,
          secure: true,
          rewrite: (requestPath) =>
            `/v8/finance/chart/%5EBVSP${requestPath.replace(/^\/api\/ibov/, "")}`,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader(
                "User-Agent",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
              );
              proxyReq.setHeader("Accept", "application/json");
            });
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log("IBOV proxy response:", proxyRes.statusCode, req.url);
            });
          },
        },
        "/api/ibov-csv": {
          target: "https://query1.finance.yahoo.com",
          changeOrigin: true,
          secure: true,
          rewrite: (requestPath) => {
            const query = requestPath.replace(/^\/api\/ibov-csv/, "");
            return `/v7/finance/download/%5EBVSP${query}`;
          },
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader(
                "User-Agent",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
              );
              proxyReq.setHeader("Accept", "text/csv");
            });
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log("IBOV CSV proxy response:", proxyRes.statusCode, req.url);
            });
          },
        },
        "/api/ibov-stooq": {
          target: "https://stooq.com",
          changeOrigin: true,
          secure: true,
          rewrite: (requestPath) => {
            const query = requestPath.replace(/^\/api\/ibov-stooq/, "");
            return `/q/d/l/${query || "?s=%5EBVSP&i=d"}`;
          },
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log("IBOV stooq proxy response:", proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
    plugins: [
      createSupabaseSmartProxy(supabaseTargets),
      // react(),
      // mode === 'development' &&
      // componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: [
        {
          find: /^@\//,
          replacement: `${path.resolve(__dirname, "./src")}/`,
        },
        {
          find: "@",
          replacement: path.resolve(__dirname, "./src"),
        },
      ],
    },
    build: {
      reportCompressedSize: false,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return;
            }

            if (id.includes("react-router-dom")) {
              return "router";
            }

            if (id.includes("@tanstack/react-query")) {
              return "query";
            }

            if (id.includes("@supabase")) {
              return "supabase";
            }

            if (id.includes("recharts")) {
              return "charts";
            }

            if (
              id.includes("jspdf") ||
              id.includes("html2canvas") ||
              id.includes("canvg")
            ) {
              return "pdf-export";
            }

            if (id.includes("pdf-parse") || id.includes("pdfjs-dist")) {
              return "pdf-read";
            }

            if (id.includes("xlsx") || id.includes("papaparse")) {
              return "import-tools";
            }

            if (
              id.includes("@radix-ui") ||
              id.includes("lucide-react") ||
              id.includes("sonner") ||
              id.includes("next-themes")
            ) {
              return "ui";
            }

            if (id.includes("react") || id.includes("scheduler")) {
              return "react-vendor";
            }
          },
        },
      },
    },
  };
});
