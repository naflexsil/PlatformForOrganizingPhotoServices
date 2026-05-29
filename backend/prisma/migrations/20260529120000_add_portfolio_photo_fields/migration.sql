-- Добавляем поля для портфолио к таблице photos

ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "userId"      TEXT;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "position"    INTEGER NOT NULL DEFAULT 0;

-- FK: userId → users.id (SET NULL при удалении пользователя)
ALTER TABLE "photos"
    ADD CONSTRAINT "photos_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Меняем onDelete у folderId: SET NULL → CASCADE (удаление папки удаляет фото)
ALTER TABLE "photos" DROP CONSTRAINT IF EXISTS "photos_folderId_fkey";
ALTER TABLE "photos"
    ADD CONSTRAINT "photos_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "portfolio_folders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
