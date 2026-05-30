-- Добавляем денормализованный счётчик лайков для быстрой сортировки в ленте вдохновения

ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "likesCount" INTEGER NOT NULL DEFAULT 0;

-- Заполняем реальными значениями из таблицы лайков
UPDATE "photos"
SET "likesCount" = (
  SELECT COUNT(*) FROM "photo_likes" WHERE "photoId" = "photos"."id"
);
