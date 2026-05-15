# =============================================================================
# Frontend Dockerfile — multi-stage build
# Контекст сборки: КОРЕНЬ проекта (не папка frontend/)
# Запуск: docker build -f frontend/Dockerfile -t photoservices-frontend .
# =============================================================================

# Stage 1: Сборка React-приложения
FROM node:20-alpine AS builder

WORKDIR /app

# Сначала копируем только package-файлы — Docker кэширует этот слой
# и не будет запускать npm ci заново, если зависимости не изменились
COPY package.json package-lock.json ./
COPY frontend/ ./frontend/

RUN npm ci

# Переменные среды, доступные во время СБОРКИ (Vite их встраивает в JS)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build
# Результат: /app/frontend/dist

# =============================================================================
# Stage 2: Отдача статики через Nginx
# =============================================================================
FROM nginx:1.27-alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Конфиг nginx для SPA (React Router)
COPY frontend/nginx.spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
