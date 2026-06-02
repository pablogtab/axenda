-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "whatsappReminder" SET DEFAULT true;
UPDATE "tenants" SET "whatsappReminder" = true;