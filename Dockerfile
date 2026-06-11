FROM node:20-alpine

# Instalar dependencias necesarias para better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Copiar configuración de dependencias
COPY package.json package-lock.json* ./
RUN npm install

# Copiar el código fuente
COPY . .

# Construir Next.js (La web)
RUN npm run build

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Exponer el puerto de la web
EXPOSE 3000

# Levantar la web y el bot juntos
CMD ["npm", "run", "start:prod"]
