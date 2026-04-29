# backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos archivos de configuración y dependencias
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Instalamos dependencias y generamos el cliente de Prisma
RUN --mount=type=cache,target=/root/.npm \
    npm install
RUN npx prisma generate

# Copiamos el resto del código y compilamos
COPY . .
RUN npm run build

# --- Stage de Producción ---
FROM node:20-alpine

WORKDIR /app

# Solo copiamos lo necesario para correr la app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Iniciamos la aplicación
CMD ["node", "dist/src/main"]
