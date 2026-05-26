-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "allowReschedule" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "confirmEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "whatsappReminder" BOOLEAN NOT NULL DEFAULT false;
