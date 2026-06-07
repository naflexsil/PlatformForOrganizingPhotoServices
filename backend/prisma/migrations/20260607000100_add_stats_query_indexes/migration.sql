CREATE INDEX IF NOT EXISTS "posts_authorId_idx" ON "posts"("authorId");
CREATE INDEX IF NOT EXISTS "photos_userId_idx" ON "photos"("userId");
CREATE INDEX IF NOT EXISTS "photos_folderId_idx" ON "photos"("folderId");
CREATE INDEX IF NOT EXISTS "deals_photographerId_idx" ON "deals"("photographerId");
CREATE INDEX IF NOT EXISTS "deals_clientId_idx" ON "deals"("clientId");
