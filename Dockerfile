FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# Instalar apenas dependências necessárias, ignorando opcionais de plataforma
RUN npm ci --legacy-peer-deps --omit=optional || npm install --legacy-peer-deps --omit=optional
COPY . .
RUN npm run build && ls -la dist/

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf && \
    echo 'server { listen 80 default_server; listen [::]:80 default_server; server_name _; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html =404; } location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { expires 1y; add_header Cache-Control "public, immutable"; } }' > /etc/nginx/conf.d/default.conf && \
    ls -la /usr/share/nginx/html/ && \
    nginx -t
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]