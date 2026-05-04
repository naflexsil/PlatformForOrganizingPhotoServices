-- Создаём join-таблицу для связи многие-ко-многим Post <-> Photo
-- Prisma именует по алфавиту: Photo (A) → Post (B)
CREATE TABLE "_PhotoToPost" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PhotoToPost_AB_unique" UNIQUE ("A", "B")
);

CREATE INDEX "_PhotoToPost_B_index" ON "_PhotoToPost"("B");

ALTER TABLE "_PhotoToPost"
    ADD CONSTRAINT "_PhotoToPost_A_fkey"
    FOREIGN KEY ("A") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_PhotoToPost"
    ADD CONSTRAINT "_PhotoToPost_B_fkey"
    FOREIGN KEY ("B") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Переносим существующие связи из postId в join-таблицу
INSERT INTO "_PhotoToPost" ("A", "B")
SELECT "id", "postId" FROM "photos"
WHERE "postId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Меняем onDelete у folderId: теперь при удалении папки фото остаётся (SetNull)
ALTER TABLE "photos" DROP CONSTRAINT IF EXISTS "photos_folderId_fkey";
ALTER TABLE "photos"
    ADD CONSTRAINT "photos_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "portfolio_folders"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Удаляем старый FK и колонку postId
ALTER TABLE "photos" DROP CONSTRAINT IF EXISTS "photos_postId_fkey";
ALTER TABLE "photos" DROP COLUMN IF EXISTS "postId";
