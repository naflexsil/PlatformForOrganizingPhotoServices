# =============================================================================
# Backend Dockerfile — Node.js 20 production
# Контекст сборки: папка backend/
# Запуск: docker build -t photoservices-backend ./backend
# =============================================================================

FROM node:20-slim

WORKDIR /app

# Копируем package-файлы отдельным слоем для кэширования
COPY package.json package-lock.json ./

# --omit=dev убирает devDependencies (eslint и т.п.) из продакшен-образа
RUN npm ci --omit=dev

# Prisma: копируем схему и генерируем клиент
COPY prisma/ ./prisma/
COPY migrate.sh ./
RUN chmod +x ./migrate.sh
RUN npx prisma generate

# Копируем остальной исходный код
COPY src/ ./src/

EXPOSE 3000

CMD ["node", "src/app.js"]
