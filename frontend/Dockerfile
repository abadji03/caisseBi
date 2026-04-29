# 1. Build Angular avec Node
FROM node:20 AS build

# 2. Créer un dossier de travail dans le container
WORKDIR /app

# 3. Copier package.json et package-lock.json
COPY package*.json ./

# 4. Installer les dépendances
RUN npm install

# 5. Copier tout le code
COPY . .

RUN npm run build --prod

# 2. Servir avec Nginx
FROM nginx:alpine
COPY --from=build /app/dist/frontend /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
