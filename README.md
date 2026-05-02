still in progress

## Спецификация API

> Эндпоинты, помеченные 🔒, требуют заголовок `Authorization: Bearer <token>`.

### Авторизация и профиль

| Метод    | Путь                                 | Описание                                                                                                                            |
| :------- | :----------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/auth/login`                    | Редирект на VK ID (?role=USER\ PHOTOGRAPHER)                                                                                        |
| `GET`    | `/api/auth/callback`                 | Callback от VK после авторизации                                                                                                    |
| `POST`   | `/api/auth/vk`                       | Вход через VK токен (code + codeVerifier в теле)                                                                                    |
| `GET`    | `/api/auth/mock-login`               | Быстрый вход для тестов (?role=PHOTOGRAPHER\|USER&id=1)                                                                             |
| `GET`    | `/api/auth/me` 🔒                    | Профиль текущего пользователя                                                                                                       |
| `POST`   | `/api/auth/complete-registration` 🔒 | Завершение регистрации (firstName, lastName, tag, role, gender, birthDate)                                                          |
| `PATCH`  | `/api/users/me` 🔒                   | Редактирование личных данных (firstName, lastName, bio, tag, gender, birthDate, city)                                               |
| `PATCH`  | `/api/users/me/photographer` 🔒      | Редактирование профиля фотографа (pricePerHour, additionalPriceInfo, experienceYears, experienceMonths, deliveryTime, searchPhotos) |
| `DELETE` | `/api/users/me` 🔒                   | Мягкое удаление аккаунта (скрывает профиль из поиска и списков)                                                                     |
| `PATCH`  | `/api/users/me/restore` 🔒           | Восстановление доступа к аккаунту                                                                                                   |

### Посты и контент

| Метод    | Путь                         | Описание                                                       |
| :------- | :--------------------------- | :------------------------------------------------------------- |
| `GET`    | `/api/posts`                 | Лента (сначала закреплённые)                                   |
| `GET`    | `/api/posts/:id`             | Детальная информация о конкретном посте                        |
| `POST`   | `/api/posts` 🔒              | Создание нового поста (description?, images[])                 |
| `PUT`    | `/api/posts/:id` 🔒          | Редактирование описания поста (только автор)                   |
| `PATCH`  | `/api/posts/:id/pin` 🔒      | Закрепить / открепить пост (только автор, макс 3 закреплённых) |
| `DELETE` | `/api/posts/:id` 🔒          | Полное удаление поста из базы (только автор)                   |
| `POST`   | `/api/posts/:id/like` 🔒     | Поставить / убрать лайк                                        |
| `POST`   | `/api/posts/:id/favorite` 🔒 | Добавить / убрать из избранного                                |

### Портфолио

| Метод    | Путь                           | Описание                                                            |
| :------- | :----------------------------- | :------------------------------------------------------------------ |
| `GET`    | `/api/portfolio/:userId`       | Все папки портфолио пользователя                                    |
| `POST`   | `/api/portfolio` 🔒            | Создание новой папки (name)                                         |
| `PATCH`  | `/api/portfolio/:id` 🔒        | Переименование папки или замена всего массива фото (name?, images?) |
| `DELETE` | `/api/portfolio/:id` 🔒        | Удаление папки со всем содержимым                                   |
| `POST`   | `/api/portfolio/:id/photos` 🔒 | Добавление фото в папку (images[] — массив URL)                     |
| `DELETE` | `/api/portfolio/:id/photos` 🔒 | Удаление конкретных фото из папки (images[] — массив URL)           |

### Подписки

| Метод  | Путь                                     | Описание                                                               |
| :----- | :--------------------------------------- | :--------------------------------------------------------------------- |
| `POST` | `/api/subscriptions/:targetId/toggle` 🔒 | Подписаться / отписаться (toggle). Ответ: `{ subscribed: true/false }` |
| `GET`  | `/api/subscriptions/me` 🔒               | Мои подписки (сначала взаимные — «друзья», затем остальные)            |
| `GET`  | `/api/subscriptions/me/subscribers` 🔒   | Мои подписчики                                                         |
| `GET`  | `/api/subscriptions/:targetId/check` 🔒  | Проверка: подписан ли я на пользователя. Ответ: `{ subscribed: bool }` |

### Поиск и медиа

| Метод    | Путь                          | Описание                                                                  |
| :------- | :---------------------------- | :------------------------------------------------------------------------ |
| `GET`    | `/api/search?q=...`           | Поиск по имени, фамилии или `@тегу`                                       |
| `POST`   | `/api/upload/image` 🔒        | Загрузка фото для поста → возвращает URL                                  |
| `POST`   | `/api/upload/avatar` 🔒       | Загрузка аватара → сохраняет URL в профиле пользователя                   |
| `POST`   | `/api/upload/search-photo` 🔒 | Загрузка фото для поиска (только фотограф, макс 5) → добавляет в массив   |
| `DELETE` | `/api/upload/search-photo` 🔒 | Удаление фото для поиска (body: `{ url }`) → убирает из массива и с диска |
