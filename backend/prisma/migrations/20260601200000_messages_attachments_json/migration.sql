-- Replace single attachmentUrl with attachments JSONB array (supports multi-photo messages)
ALTER TABLE "messages" ADD COLUMN "attachments" JSONB;
ALTER TABLE "messages" DROP COLUMN "attachmentUrl";
