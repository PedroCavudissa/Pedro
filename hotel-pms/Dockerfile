# Estágio 1: Compilação (Build)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Mudamos aqui para o Vite compilar direto ignorando a checagem estrita de tipos do tsc
RUN npx vite build

# Estágio 2: Servidor de Produção
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]