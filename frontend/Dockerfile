# frontend/Dockerfile
# --- Stage 1: Build ---
FROM node:20-alpine AS build

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copiamos el resto del código y buildeamos la aplicación
COPY . .
RUN npm run build

# --- Stage 2: Serve ---
FROM nginx:stable-alpine

# Copiamos los archivos estáticos generados por Angular
# Angular 17+ con 'application' builder genera la salida en dist/frontend/browser
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Copiamos nuestra configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
