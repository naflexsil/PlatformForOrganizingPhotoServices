CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE');

CREATE TABLE "chats" (
  "id" TEXT NOT NULL,
  "user1Id" TEXT NOT NULL,
  "user2Id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "text" TEXT,
  "attachmentUrl" TEXT,
  "attachmentType" "MessageType" NOT NULL DEFAULT 'TEXT',
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chats_user1Id_user2Id_key" ON "chats"("user1Id", "user2Id");
CREATE INDEX "chats_user1Id_idx" ON "chats"("user1Id");
CREATE INDEX "chats_user2Id_idx" ON "chats"("user2Id");

CREATE INDEX "messages_chatId_idx" ON "messages"("chatId");
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

ALTER TABLE "chats"
ADD CONSTRAINT "chats_user1Id_fkey"
FOREIGN KEY ("user1Id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chats"
ADD CONSTRAINT "chats_user2Id_fkey"
FOREIGN KEY ("user2Id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
ADD CONSTRAINT "messages_chatId_fkey"
FOREIGN KEY ("chatId") REFERENCES "chats"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
ADD CONSTRAINT "messages_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;