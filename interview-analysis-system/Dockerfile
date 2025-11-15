# Interview Analysis Service Container
FROM node:20-alpine

WORKDIR /app

# Copier package.json et installer les dépendances (incluant tsx pour TypeScript)
COPY package.json ./
RUN npm ci --only=production

# Copier tout le code (modules + point d'entrée)
COPY . .

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Exposer le port WebSocket
EXPOSE 8080

# Démarrer le service avec tsx pour exécuter TypeScript directement
CMD ["npx", "tsx", "index.js"]

