FROM node:20-alpine AS build

WORKDIR /app

# Aumentar memória para Node
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Production stage - Nginx Alpine
FROM nginx:alpine

# Copiar arquivos buildados
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração do nginx
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
