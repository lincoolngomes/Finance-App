FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN echo 'server{listen 80;listen 8080;root /usr/share/nginx/html;index index.html;location /{try_files $uri /index.html;}}' > /etc/nginx/conf.d/default.conf
EXPOSE 80 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1
CMD ["nginx","-g","daemon off;"]