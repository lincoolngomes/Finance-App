# Dockerfile simplificado para Easypanel
FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Instalar serve globalmente
RUN npm install -g serve

# Expor porta
EXPOSE 80

# Iniciar aplicação
CMD ["serve", "-s", "dist", "-l", "80"]