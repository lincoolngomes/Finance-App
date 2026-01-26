#!/usr/bin/env bash
set -euo pipefail

# Script para copiar a função mercadopago-webhook para o container do Edge Runtime
# e reiniciar o container. Feito para Easypanel/Docker setups.

DOMAIN=${1:-finance-app-supabase.rcnehy.easypanel.host}
REPO_DIR=${2:-/home/finance-app}
FUNCTION_DIR="supabase/functions/mercadopago-webhook"

echo "== Deploy helper para MercadoPago webhook =="
echo "Dominio público: $DOMAIN"

echo "1) Verificando dependências"
if ! command -v docker >/dev/null 2>&1; then
  echo "ERRO: docker não encontrado. Instale ou use usuário com docker." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "Git não encontrado. Tentando instalar git (apt)..."
  if command -v apt >/dev/null 2>&1; then
    sudo apt update && sudo apt install -y git
  else
    echo "Instalação automática do git não está disponível. Instale git manualmente." >&2
    exit 1
  fi
fi

# 2) Clonar repo se necessário
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Repositorio não encontrado em $REPO_DIR. Clonando..."
  sudo rm -rf "$REPO_DIR" || true
  git clone https://github.com/lincoolngomes/Finance-App.git "$REPO_DIR"
fi

cd "$REPO_DIR"

# 3) Verificar se a função existe no repo
if [ ! -d "$FUNCTION_DIR" ]; then
  echo "ERRO: diretório $FUNCTION_DIR não encontrado no repo." >&2
  echo "Verifique se o repositório foi clonado corretamente e contém a função." >&2
  exit 1
fi

# 4) Detectar container do edge runtime
EDGE_CONTAINER=$(docker ps --format '{{.Names}} {{.Image}} {{.Ports}}' | grep -i 'edge-runtime\|supabase-edge-runtime' | awk '{print $1}' | head -n1 || true)
if [ -z "$EDGE_CONTAINER" ]; then
  echo "ERRO: não encontrei o container do Edge Runtime. Saída do docker ps:" >&2
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
  exit 1
fi

echo "Edge Runtime container encontrado: $EDGE_CONTAINER"

# 5) Copiar arquivos para dentro do container
echo "Criando pasta no container..."
docker exec -u root -it "$EDGE_CONTAINER" mkdir -p /home/deno/functions/mercadopago-webhook || true

echo "Copiando arquivos para o container..."
docker cp "$FUNCTION_DIR/." "$EDGE_CONTAINER":/home/deno/functions/mercadopago-webhook/

echo "Ajustando permissões..."
docker exec -u root -it "$EDGE_CONTAINER" chown -R deno:deno /home/deno/functions/mercadopago-webhook || true

# 6) Reiniciar o container
echo "Reiniciando container: $EDGE_CONTAINER"
docker restart "$EDGE_CONTAINER"

sleep 3

# 7) Mostrar logs (últimas 200 linhas)
echo "== Últimos logs do Edge Runtime =="
docker logs --tail 200 "$EDGE_CONTAINER" || true

# 8) Testar a URL pública
echo "== Teste público da função =="
URL="https://${DOMAIN}/functions/v1/mercadopago-webhook"
echo "GET $URL"
set +e
curl -i -X GET "$URL"
CURL_EXIT=$?
set -e

if [ $CURL_EXIT -ne 0 ]; then
  echo "Aviso: curl retornou código $CURL_EXIT — pode ser problema de rede ou TLS. Verifique proxy/traefik." >&2
fi

cat <<EOF

== Feito ==
Se a função respondeu (mesmo 405 ou JSON), você está pronto para registrar a URL como webhook no Mercado Pago.

Importante: configure estas variáveis no painel do Easypanel (app do Edge Runtime) para que a função consiga acessar o Mercado Pago e o Supabase:
  - MERCADOPAGO_ACCESS_TOKEN = (seu access token do Mercado Pago)
  - SUPABASE_SERVICE_ROLE_KEY = (service_role key do Supabase)
  - SUPABASE_URL = https://finance-app-supabase.rcnehy.easypanel.host

Se quiser, cole aqui a saída dos logs ou do curl e eu verifico o próximo passo.
EOF

exit 0
