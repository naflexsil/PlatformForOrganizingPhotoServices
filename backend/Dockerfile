# =============================================================================
# Backend Dockerfile — Node.js 20 production
# Контекст сборки: папка backend/
# Запуск: docker build -t photoservices-backend ./backend
# =============================================================================

FROM node:20-alpine

# sharp (обработка изображений) требует нативных зависимостей
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Копируем package-файлы отдельным слоем для кэширования
COPY package.json package-lock.json ./

# --omit=dev убирает devDependencies (eslint и т.п.) из продакшен-образа
RUN npm ci --omit=dev

# Prisma: копируем схему и генерируем клиент
COPY prisma/ ./prisma/
RUN npx prisma generate

# Копируем остальной исходный код
COPY src/ ./src/

EXPOSE 3000

CMD ["node", "src/app.js"]
