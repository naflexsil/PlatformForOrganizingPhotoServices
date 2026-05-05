CREATE TABLE "photo_likes" (
    "userId"    TEXT NOT NULL,
    "photoId"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "photo_likes_pkey" PRIMARY KEY ("userId","photoId")
);

CREATE TABLE "photo_favorites" (
    "userId"    TEXT NOT NULL,
    "photoId"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "photo_favorites_pkey" PRIMARY KEY ("userId","photoId")
);

ALTER TABLE "photo_likes"     ADD CONSTRAINT "photo_likes_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photo_likes"     ADD CONSTRAINT "photo_likes_photoId_fkey"
    FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "photo_favorites" ADD CONSTRAINT "photo_favorites_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photo_favorites" ADD CONSTRAINT "photo_favorites_photoId_fkey"
    FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
