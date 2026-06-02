-- Deal system: Deal + DealRevision models

CREATE TYPE "DealStatus" AS ENUM ('PENDING', 'REJECTED', 'AWAITING_PAYMENT', 'IN_PROGRESS', 'AWAITING_REVIEW', 'REVISION', 'COMPLETED');

CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "photographerId" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'PENDING',
    "clientPaid" BOOLEAN NOT NULL DEFAULT false,
    "photographerConfirmedPayment" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "ratingComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deal_revisions" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_revisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deals_chatId_idx" ON "deals"("chatId");
CREATE INDEX "deal_revisions_dealId_idx" ON "deal_revisions"("dealId");

ALTER TABLE "deals" ADD CONSTRAINT "deals_chatId_fkey"
    FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_revisions" ADD CONSTRAINT "deal_revisions_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
