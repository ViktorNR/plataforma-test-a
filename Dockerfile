FROM node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Sincroniza el esquema, crea el admin inicial y levanta la app.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node prisma/seed.mjs && npm start"]
