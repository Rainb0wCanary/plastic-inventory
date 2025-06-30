# Этап 1: сборка фронтенда
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build


# Этап 2: запуск через nginx
FROM nginx:alpine

# Копируем наш Nginx конфиг
COPY nginx.conf /etc/nginx/nginx.conf

# Копируем собранные файлы из Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8000

CMD ["nginx", "-g", "daemon off;"]
