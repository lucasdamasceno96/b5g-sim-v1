# Base Node LTS (Leve)
FROM node:22-alpine

WORKDIR /app

# Instalação eficiente de dependências (cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código fonte
COPY . .

# Expor porta do Vite
EXPOSE 5173

# Rodar em modo host para ser acessível externamente
CMD ["npm", "run", "dev", "--", "--host"]