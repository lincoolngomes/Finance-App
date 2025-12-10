# Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar TODAS as dependências (incluindo devDependencies)
RUN npm ci --legacy-peer-deps

# Copiar código fonte
COPY . .

# Build
RUN npm run build

# Imagem final de produção
FROM node:20-alpine

WORKDIR /app

# Instalar serve
RUN npm install -g serve

# Copiar apenas o build
COPY --from=builder /app/dist ./dist

# Expor porta
EXPOSE 80

# Start
CMD ["serve", "-s", "dist", "-l", "80"]