-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "urlOriginal" TEXT NOT NULL,
    "urlPreview" TEXT NOT NULL,
    "postId" TEXT,
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "portfolio_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
