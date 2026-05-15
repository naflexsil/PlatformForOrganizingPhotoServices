still in progress

## Архитектура

| Слой | Технологии |
| :--- | :--------- |
| Бэкенд | Node.js (Express 5), Prisma 7, PostgreSQL |
| Авторизация | VK ID OAuth 2.0 + PKCE, JWT (access 1ч / refresh 30д) |
| Хранилище файлов | Garage S3 (self-hosted, совместим с AWS S3 API) |
| Инфраструктура | Docker (PostgreSQL + Garage) |

---

## Garage S3 — хранилище файлов

**Garage** — это self-hosted объектное хранилище, совместимое с Amazon S3 API. Мы используем его вместо облачного AWS S3 для локальной разработки.

### Зачем нужен Garage

Все фотографии на платформе хранятся в Garage, а не на диске сервера. Это позволяет:
- хранить файлы отдельно от приложения (можно масштабировать независимо)
- автоматически генерировать WebP-превью без потери оригинала
- при необходимости заменить Garage на настоящий AWS S3, изменив только переменные окружения

### Как мы используем Garage

При загрузке любого фото бэкенд выполняет две операции:

```
Клиент → POST /api/upload/photo
    ↓
FileService.uploadImage()
    ├── Оригинал → бакет "originals"  (jpeg/png/webp как есть)
    └── Превью   → бакет "previews"   (конвертация в WebP, макс 800px, quality 75)
    ↓
Записывает Photo { urlOriginal, urlPreview } в PostgreSQL
    ↓
Возвращает { photo.id, originalKey, previewKey }
```

Так как Garage не поддерживает анонимный доступ, файлы отдаются **через прокси-эндпоинт** бэкенда:
```
Браузер → GET http://localhost:3000/api/files/originals/1234-photo.jpg
              ↓ (бэкенд авторизуется в Garage)
          Garage S3 → файл → браузер
```

Поэтому все URL фото в ответах API имеют вид `http://localhost:3000/api/files/{bucket}/{key}`.

### Бакеты

| Бакет | Содержит | Когда используется |
| :---- | :------- | :----------------- |
| `originals` | Оригинальные файлы (jpeg/png) | Просмотр фото в полном качестве |
| `previews` | WebP, макс 800px | Лента, карточки постов, превью |
| `avatars` | Аватары (оригинал + превью) | Фото профиля |
| `search` | Превью фото фотографов | Карточки в поиске |

### Локальный запуск Garage

```bash
# 1. Поднять контейнер
docker compose up -d garage

# 2. Первый запуск — инициализировать кластер (один раз)
NODE=$(docker exec garage /garage node id 2>/dev/null | head -1)
docker exec garage /garage layout assign -z dc1 -c 10G $NODE
docker exec garage /garage layout apply --version 1

# 3. Создать ключ доступа
docker exec garage /garage key create photoservices-key
# → запиши Key ID и Secret key в .env

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

| Метод    | Путь                                 | Описание |
| :------- | :----------------------------------- | :------- |
| `GET`    | `/api/auth/login`                    | Редирект на VK ID (?role=USER\|PHOTOGRAPHER) |
| `GET`    | `/api/auth/callback`                 | Callback от VK после авторизации |
| `POST`   | `/api/auth/vk`                       | Вход через VK токен (code + codeVerifier в теле) |
| `GET`    | `/api/auth/mock-login`               | Быстрый вход для тестов (?role=PHOTOGRAPHER\|USER&id=1) |
| `GET`    | `/api/auth/me` 🔒                    | Профиль пользователя. Фотограф получает `avatarUrl` (превью) и `avatarUrlOriginal` |
| `POST`   | `/api/auth/complete-registration` 🔒 | Завершение регистрации. Body: `firstName, lastName, tag, role, gender, birthDate` |
| `PATCH`  | `/api/users/me` 🔒                   | Редактирование личных данных: `firstName, lastName, bio, tag, gender, birthDate, city` |
| `PATCH`  | `/api/users/me/photographer` 🔒      | Данные фотографа: `pricePerHour, additionalPriceInfo, experienceYears, experienceMonths, deliveryTime, searchPhotos` |
| `DELETE` | `/api/users/me` 🔒                   | Мягкое удаление аккаунта |
| `PATCH`  | `/api/users/me/restore` 🔒           | Восстановление аккаунта |

### Посты

> Каждый пост содержит два уровня лайков:
> - `isLiked` / `isFavorited` на уровне **поста** (через `Like` / `Favorite`)
> - `photos[].isLiked` / `photos[].isFavorited` на уровне **отдельного фото** (через `PhotoLike` / `PhotoFavorite`)
>
> Одно фото может использоваться в нескольких постах одновременно (связь многие-ко-многим).

| Метод    | Путь                         | Описание |
| :------- | :--------------------------- | :------- |
| `GET`    | `/api/posts` 🔒              | Лента постов (закреплённые первыми) с фото, счётчиками и статусом лайков |
| `GET`    | `/api/posts/:id` 🔒          | Пост с полным набором фото (urlPreview + urlOriginal) |
| `POST`   | `/api/posts` 🔒              | Создать пост. Body: `{ description?, photoIds: string[] }` (min 1, max 10) |
| `PUT`    | `/api/posts/:id` 🔒          | Изменить пост. Body: `{ description?, addPhotoIds?: string[], removePhotoIds?: string[] }` |
| `PATCH`  | `/api/posts/:id/pin` 🔒      | Закрепить / открепить (только автор, макс 3) |
| `DELETE` | `/api/posts/:id` 🔒          | Удалить пост (только автор) |
| `POST`   | `/api/posts/:id/like` 🔒     | Лайк/дизлайк поста. Ответ: `{ liked: bool, count: number }` |
| `POST`   | `/api/posts/:id/favorite` 🔒 | Избранное поста. Ответ: `{ favorited: bool, count: number }` |

### Фотографии

| Метод  | Путь                          | Описание |
| :----- | :---------------------------- | :------- |
| `POST` | `/api/photos/:id/like` 🔒     | Лайк/дизлайк конкретного фото. Ответ: `{ liked: bool, count: number }` |
| `POST` | `/api/photos/:id/favorite` 🔒 | Избранное конкретного фото. Ответ: `{ favorited: bool, count: number }` |

### Лента вдохновения

> Фото из портфолио фотографов. Для попадания в ленту фото должно быть загружено через `POST /api/upload/photo` с `folderId`.

| Метод  | Путь                    | Описание |
| :----- | :---------------------- | :------- |
| `GET`  | `/api/feed` 🔓          | Лента (?page=1&limit=20). Возвращает `urlPreview` + данные фотографа |
| `GET`  | `/api/feed/:photoId` 🔓 | Одно фото для модального окна: `urlOriginal` + данные фотографа |

### Портфолио

| Метод    | Путь                           | Описание |
| :------- | :----------------------------- | :------- |
| `GET`    | `/api/portfolio/:userId`       | Все папки портфолио пользователя |
| `POST`   | `/api/portfolio` 🔒            | Создать папку. Body: `{ name }` |
| `PATCH`  | `/api/portfolio/:id` 🔒        | Переименовать папку или заменить массив фото. Body: `{ name?, images? }` |
| `DELETE` | `/api/portfolio/:id` 🔒        | Удалить папку |
| `POST`   | `/api/portfolio/:id/photos` 🔒 | Добавить URL в папку. Body: `{ images: string[] }` |
| `DELETE` | `/api/portfolio/:id/photos` 🔒 | Удалить URL из папки. Body: `{ images: string[] }` |

### Подписки

| Метод  | Путь                                     | Описание |
| :----- | :--------------------------------------- | :------- |
| `POST` | `/api/subscriptions/:targetId/toggle` 🔒 | Подписаться / отписаться. Ответ: `{ subscribed: bool }` |
| `GET`  | `/api/subscriptions/me` 🔒               | Мои подписки (взаимные — «друзья» — первыми) |
| `GET`  | `/api/subscriptions/me/subscribers` 🔒   | Мои подписчики |
| `GET`  | `/api/subscriptions/:targetId/check` 🔒  | Подписан ли я на пользователя. Ответ: `{ subscribed: bool }` |

### Поиск, загрузка файлов, прокси

| Метод    | Путь                          | Описание |
| :------- | :---------------------------- | :------- |
| `GET`    | `/api/search?q=...`           | Поиск по имени, фамилии или `@тегу` |
| `GET`    | `/api/files/:bucket/:key`     | Прокси-эндпоинт для файлов из Garage S3 |
| `POST`   | `/api/upload/photo` 🔒        | Загрузить фото → S3 (оригинал + WebP-превью) + создать Photo. Body: `folderId?` |
| `POST`   | `/api/upload/image` 🔒        | Загрузить фото → S3, вернуть URL оригинала (для `Post.images[]`) |
| `POST`   | `/api/upload/avatar` 🔒       | Загрузить аватар (оригинал + превью). Старый аватар удаляется из S3 автоматически |
| `POST`   | `/api/upload/search-photo` 🔒 | Загрузить фото для поиска (только фотограф, макс 5). В базе хранится превью-URL |
| `DELETE` | `/api/upload/search-photo` 🔒 | Удалить фото поиска. Body: `{ url }` |
