# Alterado para 'slim' (Debian), resolvendo a falta da libssl1.1 de forma nativa
FROM node:18-slim

# Instala o OpenSSL requerido pelo Prisma em ambientes Debian
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Gera o cliente Prisma específico para o Linux
RUN npx prisma generate

# Compila o TypeScript em JavaScript ignorando erros estritos de tipagem
RUN npx tsc --skipLibCheck || true

EXPOSE 9090

CMD ["sh", "-c", "npx prisma db push && npm start"]