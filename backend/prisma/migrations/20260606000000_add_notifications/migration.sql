CREATE TYPE "NotificationType" AS ENUM (
  'DEAL_PROPOSED', 'DEAL_ACCEPTED', 'DEAL_REJECTED', 'DEAL_COMPLETED',
  'DEAL_REVISION_REQUESTED', 'NEW_SUBSCRIBER', 'LIKE_POST', 'LIKE_PHOTO',
  'FRIEND_DEAL_COMPLETED', 'SYSTEM_REPLY'
);

CREATE TABLE "notifications" (
  "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"     TEXT         NOT NULL,
  "type"       "NotificationType" NOT NULL,
  "fromUserId" TEXT,
  "postId"     TEXT,
  "photoId"    TEXT,
  "dealId"     TEXT,
  "metadata"   JSONB,
  "isRead"     BOOLEAN      NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_userId_fkey"     FOREIGN KEY ("userId")     REFERENCES "users"("id")  ON DELETE CASCADE,
  CONSTRAINT "notifications_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id")  ON DELETE SET NULL,
  CONSTRAINT "notifications_postId_fkey"     FOREIGN KEY ("postId")     REFERENCES "posts"("id")  ON DELETE SET NULL,
  CONSTRAINT "notifications_photoId_fkey"    FOREIGN KEY ("photoId")    REFERENCES "photos"("id") ON DELETE SET NULL,
  CONSTRAINT "notifications_dealId_fkey"     FOREIGN KEY ("dealId")     REFERENCES "deals"("id")  ON DELETE SET NULL
);

CREATE INDEX "notifications_userId_idx"        ON "notifications"("userId");
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "adminReply" TEXT;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
