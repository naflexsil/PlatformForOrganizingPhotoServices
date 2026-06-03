-- Add proposerId to deals to track who initiated the deal
ALTER TABLE "deals" ADD COLUMN "proposerId" TEXT NOT NULL DEFAULT '';
UPDATE "deals" SET "proposerId" = "clientId";
ALTER TABLE "deals" ALTER COLUMN "proposerId" DROP DEFAULT;
