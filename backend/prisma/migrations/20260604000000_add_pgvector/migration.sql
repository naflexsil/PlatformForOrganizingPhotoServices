-- Подключаем расширение pgvector для хранения и поиска векторов
CREATE EXTENSION IF NOT EXISTS vector;

-- Заменяем Float[] на нативный vector(512) тип pgvector
ALTER TABLE "photos" DROP COLUMN IF EXISTS "embeddingVector";
ALTER TABLE "photos" ADD COLUMN "embeddingVector" vector(512);
