# 1. Choisir l'image Node.js officielle
FROM node:20

# 2. Créer un dossier de travail dans le container
WORKDIR /app

# 3. Copier package.json et package-lock.json
COPY package*.json ./

# 4. Installer les dépendances
RUN npm install

# 5. Copier tout le code
COPY . .

# 6. Exposer le port sur lequel ton app tourne
EXPOSE 5000

# 7. Commande pour démarrer ton backend
CMD ["node", "app.js"]
