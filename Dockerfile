# Dockerfile otimizado - usa dist pré-compilado
FROM nginx:alpine

# Copiar arquivos já buildados
COPY dist /usr/share/nginx/html

# Copiar configuração do nginx
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
