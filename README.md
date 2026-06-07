# PhotoServices (psyshe.art)

Платформа для поиска фотографов, размещения портфолио и организации съёмок: профили, лента вдохновения с персонализацией на CLIP-эмбеддингах, чаты с системой сделок, статистика для фотографов.

## Архитектура

| Слой             | Технологии                                                   |
| :--------------- | :----------------------------------------------------------- |
| Фронтенд         | React + Vite + CSS Modules, Socket.IO client                 |
| Бэкенд           | Node.js (Express 5), Prisma 7, PostgreSQL, Socket.IO         |
| AI-сервис        | Python FastAPI, fine-tuned CLIP ViT-B/32 (SupCon)            |
| Авторизация      | VK ID OAuth 2.0 + PKCE, JWT (access 1ч / refresh 30д)        |
| Хранилище файлов | Garage S3 (self-hosted, совместим с AWS S3 API)              |
| Векторный поиск  | PostgreSQL + pgvector (`vector(512)`, оператор `<=>`)        |
| Инфраструктура   | Docker (PostgreSQL/pgvector + Garage + backend + ai-service) |

---

## Garage S3 хранилище файлов

**Garage** - это self-hosted объектное хранилище, совместимое с Amazon S3 API.

### Зачем нужен Garage

Все фотографии на платформе хранятся в Garage, а не на диске сервера. Это позволяет:

- хранить файлы отдельно от приложения (можно масштабировать независимо)
- автоматически генерировать WebP-превью без потери оригинала

### Как мы используем Garage

При загрузке любого фото бэкенд выполняет две операции:

```
1. Клиент - POST /api/upload/photo
2. FileService.uploadImage()
    - Оригинал - бакет "originals"  (jpeg/png/webp как есть)
    - Превью   - бакет "previews"   (конвертация в WebP, макс 800px, quality 75)
3. Записывает Photo { urlOriginal, urlPreview } в PostgreSQL
4. Возвращает { photo.id, originalKey, previewKey }
```

Так как Garage не поддерживает анонимный доступ, файлы отдаются **через прокси-эндпоинт** бэкенда:

```
Браузер - GET http://localhost:3000/api/files/originals/1234-photo.jpg
              (бэкенд авторизуется в Garage)
          Garage S3 → файл → браузер
```

Поэтому все URL фото в ответах API имеют вид `http://localhost:3000/api/files/{bucket}/{key}`.

### Бакеты

| Бакет       | Содержит                      | Когда используется              |
| :---------- | :---------------------------- | :------------------------------ |
| `originals` | Оригинальные файлы (jpeg/png) | Просмотр фото в полном качестве |
| `previews`  | WebP, макс 800px              | Лента, карточки постов, превью  |
| `avatars`   | Аватары (оригинал + превью)   | Фото профиля                    |
| `search`    | Превью фото фотографов        | Карточки в поиске               |

### Локальный запуск Garage

```bash
# 1. Поднять контейнер
docker compose up -d garage

# 2. Первый запуск - инициализировать кластер (один раз)
NODE=$(docker exec garage /garage node id 2>/dev/null | head -1)
docker exec garage /garage layout assign -z dc1 -c 10G $NODE
docker exec garage /garage layout apply --version 1

# 3. Создать ключ доступа
docker exec garage /garage key create photoservices-key
# - записать Key ID и Secret key в .env

# 4. Создать бакеты и выдать права
for bucket in originals previews avatars search; do
  docker exec garage /garage bucket create $bucket
  docker exec garage /garage bucket allow --read --write $bucket --key <KEY_ID>
done
```

---

## Запуск проекта

### Требования

- Node.js 18+
- Docker Desktop

### Бэкенд

```bash
cd backend
cp .env.example .env    # заполнить S3_ACCESS_KEY_ID и S3_SECRET_ACCESS_KEY
npm install
docker compose up -d    # PostgreSQL + Garage
npx prisma migrate deploy
npm run dev             # http://localhost:3000
```

### Фронтенд

```bash
# из корня проекта
npm install
npm run dev             # http://localhost:3001
```

---

## Спецификация API

> 🔒 Требует заголовок `Authorization: Bearer <token>`
> 🔓 Токен опциональный — без него ответ не содержит `isLiked` / `isFavorited`

### Авторизация и профиль

| Метод    | Путь                                 | Описание                                                                                                             |
| :------- | :----------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/auth/login`                    | Редирект на VK ID (?role=USER\|PHOTOGRAPHER)                                                                         |
| `GET`    | `/api/auth/callback`                 | Callback от VK после авторизации                                                                                     |
| `POST`   | `/api/auth/vk`                       | Вход через VK PKCE (code + codeVerifier в теле)                                                                      |
| `POST`   | `/api/auth/vk-sdk`                   | Вход через VK SDK. Body: `{ idToken, firstName?, lastName?, avatarUrl? }`                                            |
| `GET`    | `/api/auth/mock-login`               | Быстрый вход для тестов (?role=PHOTOGRAPHER\|USER&id=1)                                                              |
| `GET`    | `/api/auth/me` 🔒                    | Профиль пользователя. Фотограф получает `avatarUrl` (превью) и `avatarUrlOriginal`                                   |
| `POST`   | `/api/auth/complete-registration` 🔒 | Завершение регистрации. Body: `firstName, lastName, tag, role, gender, birthDate`                                    |
| `DELETE` | `/api/auth/cancel-registration` 🔒   | Удаление незавершённого аккаунта (тег ещё начинается с `vk_`)                                                        |
| `GET`    | `/api/users/check-tag?tag=` 🔓       | Проверить доступность тега. Ответ: `{ available: bool }`                                                             |
| `GET`    | `/api/users/by-tag/:tag` 🔓          | Получить публичный профиль по @тегу                                                                                  |
| `PATCH`  | `/api/users/me` 🔒                   | Редактирование личных данных: `firstName, lastName, bio, tag, gender, birthDate, city`                               |
| `PATCH`  | `/api/users/me/photographer` 🔒      | Данные фотографа: `pricePerHour, additionalPriceInfo, experienceYears, experienceMonths, deliveryTime, searchPhotos` |
| `DELETE` | `/api/users/me` 🔒                   | Мягкое удаление аккаунта                                                                                             |
| `PATCH`  | `/api/users/me/restore` 🔒           | Восстановление аккаунта                                                                                              |

### Посты

> Каждый пост содержит два уровня лайков:
>
> - `isLiked` / `isFavorited` на уровне **поста** (через `Like` / `Favorite`)
> - `photos[].isLiked` / `photos[].isFavorited` на уровне **отдельного фото** (через `PhotoLike` / `PhotoFavorite`)
>
> Одно фото может использоваться в нескольких постах одновременно (связь многие-ко-многим).

| Метод    | Путь                         | Описание                                                                                   |
| :------- | :--------------------------- | :----------------------------------------------------------------------------------------- |
| `GET`    | `/api/posts` 🔒              | Лента постов (закреплённые первыми) с фото, счётчиками и статусом лайков                   |
| `GET`    | `/api/posts/:id` 🔒          | Пост с полным набором фото (urlPreview + urlOriginal)                                      |
| `POST`   | `/api/posts` 🔒              | Создать пост. Body: `{ description?, photoIds: string[] }` (min 1, max 10)                 |
| `PUT`    | `/api/posts/:id` 🔒          | Изменить пост. Body: `{ description?, addPhotoIds?: string[], removePhotoIds?: string[] }` |
| `PATCH`  | `/api/posts/:id/pin` 🔒      | Закрепить / открепить (только автор, макс 3)                                               |
| `DELETE` | `/api/posts/:id` 🔒          | Удалить пост (только автор)                                                                |
| `POST`   | `/api/posts/:id/like` 🔒     | Лайк/дизлайк поста. Ответ: `{ liked: bool, count: number }`                                |
| `POST`   | `/api/posts/:id/favorite` 🔒 | Избранное поста. Ответ: `{ favorited: bool, count: number }`                               |

### Фотографии

| Метод    | Путь                          | Описание                                                                |
| :------- | :---------------------------- | :---------------------------------------------------------------------- |
| `GET`    | `/api/photos` 🔓              | Список фотографий (фильтрация по folderId и др.)                        |
| `PATCH`  | `/api/photos/:id` 🔒          | Обновить метаданные фото                                                |
| `DELETE` | `/api/photos/:id` 🔒          | Удалить фото из портфолио и S3                                          |
| `POST`   | `/api/photos/:id/like` 🔒     | Лайк/дизлайк конкретного фото. Ответ: `{ liked: bool, count: number }`  |
| `POST`   | `/api/photos/:id/favorite` 🔒 | Избранное конкретного фото. Ответ: `{ favorited: bool, count: number }` |

### Лента вдохновения

> Фото из портфолио фотографов. Для попадания в ленту фото должно быть загружено через `POST /api/upload/photo` с `folderId`.

| Метод | Путь                    | Описание                                                             |
| :---- | :---------------------- | :------------------------------------------------------------------- |
| `GET` | `/api/feed` 🔓          | Лента (?page=1&limit=20). Возвращает `urlPreview` + данные фотографа |
| `GET` | `/api/feed/:photoId` 🔓 | Одно фото для модального окна: `urlOriginal` + данные фотографа      |

### Портфолио

| Метод    | Путь                           | Описание                                                                 |
| :------- | :----------------------------- | :----------------------------------------------------------------------- |
| `GET`    | `/api/portfolio/:userId`       | Все папки портфолио пользователя                                         |
| `POST`   | `/api/portfolio` 🔒            | Создать папку. Body: `{ name }`                                          |
| `PATCH`  | `/api/portfolio/:id` 🔒        | Переименовать папку или заменить массив фото. Body: `{ name?, images? }` |
| `DELETE` | `/api/portfolio/:id` 🔒        | Удалить папку                                                            |
| `POST`   | `/api/portfolio/:id/photos` 🔒 | Добавить URL в папку. Body: `{ images: string[] }`                       |
| `DELETE` | `/api/portfolio/:id/photos` 🔒 | Удалить URL из папки. Body: `{ images: string[] }`                       |

### Подписки

| Метод  | Путь                                          | Описание                                                                    |
| :----- | :-------------------------------------------- | :-------------------------------------------------------------------------- |
| `POST` | `/api/subscriptions/:targetId/toggle` 🔒      | Подписаться / отписаться. Ответ: `{ subscribed: bool }`                     |
| `GET`  | `/api/subscriptions/me` 🔒                    | Мои подписки (взаимные — «друзья» — первыми)                                |
| `GET`  | `/api/subscriptions/me/subscribers` 🔒        | Мои подписчики                                                              |
| `GET`  | `/api/subscriptions/:targetId/check` 🔒       | Подписан ли я на пользователя. Ответ: `{ subscribed: bool }`                |
| `GET`  | `/api/subscriptions/:userId/subscribers` 🔓   | Подписчики пользователя (для модалки на чужом профиле), с флагом `isFriend` |
| `GET`  | `/api/subscriptions/:userId/subscriptions` 🔓 | Подписки пользователя, с флагом `isFriend`                                  |

### Избранное

| Метод | Путь                | Описание                                     |
| :---- | :------------------ | :------------------------------------------- |
| `GET` | `/api/favorites` 🔒 | Избранные посты и фото текущего пользователя |

### Чаты и сообщения

> Двусторонняя связь идёт через REST (история, старт чата, файлы) и Socket.IO (сообщения в реальном времени, статусы прочтения, онлайн-статусы, печатает/не печатает). Подробности — в разделе [Socket.IO](#socketio).

| Метод  | Путь                                    | Описание                                                                  |
| :----- | :-------------------------------------- | :------------------------------------------------------------------------ |
| `GET`  | `/api/chats` 🔒                         | Список чатов текущего пользователя (только с сообщениями) + `unreadCount` |
| `POST` | `/api/chats/start` 🔒                   | Создать/получить чат с `companionId`                                      |
| `GET`  | `/api/chats/:chatId/messages` 🔒        | История сообщений чата (пагинация)                                        |
| `GET`  | `/api/chats/files/:chatId/:filename` 🔒 | Защищённый доступ к вложению (проверка участия в чате)                    |
| `POST` | `/api/upload/chat-attachment` 🔒        | Загрузить фото (до 20 МБ) или архив `.zip/.rar` (до 100 МБ) в чат         |

### Сделки

> Состояния сделки описаны как конечный автомат с проверкой роли на каждом переходе (инициатор = заказчик, второй участник = исполнитель).

| Метод   | Путь                                 | Описание                                                       |
| :------ | :----------------------------------- | :------------------------------------------------------------- |
| `GET`   | `/api/deals` 🔒                      | Все сделки текущего пользователя                               |
| `POST`  | `/api/deals` 🔒                      | Предложить сделку. Body: `{ chatId, conditions }`              |
| `PATCH` | `/api/deals/:id/accept` 🔒           | Принять предложение (исполнитель)                              |
| `PATCH` | `/api/deals/:id/reject` 🔒           | Отклонить предложение (исполнитель)                            |
| `PATCH` | `/api/deals/:id/paid` 🔒             | Подтвердить оплату (клиент)                                    |
| `PATCH` | `/api/deals/:id/payment-received` 🔒 | Подтвердить получение оплаты (исполнитель)                     |
| `PATCH` | `/api/deals/:id/complete` 🔒         | Сдать работу (исполнитель)                                     |
| `PATCH` | `/api/deals/:id/approve` 🔒          | Принять работу - `COMPLETED` (клиент)                          |
| `PATCH` | `/api/deals/:id/revision` 🔒         | Отправить на доработку (клиент)                                |
| `POST`  | `/api/deals/:id/rating` 🔒           | Поставить оценку 1–5 + комментарий (клиент, после `COMPLETED`) |

### Уведомления

| Метод   | Путь                                 | Описание                                 |
| :------ | :----------------------------------- | :--------------------------------------- |
| `GET`   | `/api/notifications` 🔒              | Список уведомлений текущего пользователя |
| `GET`   | `/api/notifications/unread-count` 🔒 | Количество непрочитанных                 |
| `PATCH` | `/api/notifications/:id/read` 🔒     | Отметить уведомление прочитанным         |
| `PATCH` | `/api/notifications/read-all` 🔒     | Отметить все прочитанными                |

### Статистика (только для фотографов)

| Метод | Путь                    | Описание                                                                          |
| :---- | :---------------------- | :-------------------------------------------------------------------------------- |
| `GET` | `/api/stats/content` 🔒 | Эффективность контента: топ постов/фото, тренд за 8 недель, посты vs портфолио    |
| `GET` | `/api/stats/deals` 🔒   | Аналитика сделок: индекс надёжности, средний рейтинг, тренд за 6 месяцев, статусы |

> Оба эндпоинта принимают `?period=7d|30d|90d|all` — влияет на summary и топ-листы; трендовые графики всегда строятся по фиксированному окну (8 недель / 6 месяцев). Доступ только для роли `PHOTOGRAPHER` (403 для остальных).

### Поддержка и админка

| Метод  | Путь                           | Описание                                                               |
| :----- | :----------------------------- | :--------------------------------------------------------------------- |
| `POST` | `/api/support/tickets` 🔒      | Создать обращение в поддержку                                          |
| `GET`  | `/api/admin/tickets`           | Список тикетов (заголовок `X-Admin-Token`, см. `ADMIN_TOKEN` в `.env`) |
| `POST` | `/api/admin/tickets/:id/reply` | Ответить на тикет (заголовок `X-Admin-Token`)                          |

### Поиск, загрузка файлов, прокси

| Метод    | Путь                          | Описание                                                                              |
| :------- | :---------------------------- | :------------------------------------------------------------------------------------ |
| `GET`    | `/api/search?q=...`           | Поиск по имени, фамилии или `@тегу`                                                   |
| `POST`   | `/api/search/by-image` 🔓     | Визуальный поиск похожих фото портфолио по загруженному изображению (CLIP + pgvector) |
| `GET`    | `/api/files/:bucket/:key`     | Прокси-эндпоинт для файлов из Garage S3                                               |
| `POST`   | `/api/upload/photo` 🔒        | Загрузить фото → S3 (оригинал + WebP-превью) + создать Photo. Body: `folderId?`       |
| `POST`   | `/api/upload/image` 🔒        | Загрузить фото → S3, вернуть URL оригинала (для `Post.images[]`)                      |
| `POST`   | `/api/upload/avatar` 🔒       | Загрузить аватар (оригинал + превью). Старый аватар удаляется из S3 автоматически     |
| `POST`   | `/api/upload/search-photo` 🔒 | Загрузить фото для поиска (только фотограф, макс 5). В базе хранится превью-URL       |
| `DELETE` | `/api/upload/search-photo` 🔒 | Удалить фото поиска. Body: `{ url }`                                                  |

---

## Socket.IO

Сервер инициализируется в `backend/src/socket/index.js` поверх общего HTTP-сервера (`initSocket(httpServer)`).

**Комнаты:** `chat:{chatId}` (участники чата), `user:{userId}` (личные уведомления и онлайн-статусы).

**Клиент → сервер:** `send-message`, `typing`, `stop-typing`, `mark-read`
**Сервер → клиент:** `new-message`, `messages-read`, `user-typing`, `user-stop-typing`, `user-online`, `user-offline`, `deal-updated`

Безопасность: JWT-аутентификация в `io.use()`, проверка участия в чате на каждое `send-message`/`mark-read`, rate limit 10 сообщений / 10 секунд на сокет.

---

## AI-сервис и визуальный поиск

Python FastAPI-сервис (`ai-service/`, порт 8001) на дообученной модели CLIP ViT-B/32:

- Базовая модель `openai/clip-vit-base-patch32`, дообучена на фотографических данных в два этапа: сначала на Triplet Loss, а позже на Supervised Contrastive Loss (SupCon). Метрика P@5 выросла с 0.379 (baseline) до 0.542 (fine-tuned).
- Эндпоинты: `/health`, `/embed`, `/embed-upload`, `/embed-batch`, `/personalize`.
- При загрузке фото в портфолио (`folderId IS NOT NULL`) бэкенд асинхронно вызывает AI `/embed` и сохраняет вектор `512d` в `Photo.embeddingVector` (pgvector, `vector(512)`).
- `POST /api/search/by-image` принимает изображение, получает его эмбеддинг и ищет ближайшие фото портфолио оператором `<=>` (косинусная дистанция).
- Лента вдохновения для авторизованных пользователей персонализируется гибридным скорингом.

---
