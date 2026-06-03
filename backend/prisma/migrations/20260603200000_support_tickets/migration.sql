-- Support tickets for user feedback / help requests

CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

CREATE TABLE "support_tickets" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "message"   TEXT NOT NULL,
    "dealId"    TEXT,
    "chatId"    TEXT,
    "status"    "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
