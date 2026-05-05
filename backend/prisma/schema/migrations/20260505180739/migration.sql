/*
  Warnings:

  - A unique constraint covering the columns `[name,wabaId]` on the table `whatsapp_templates` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "whatsapp_templates_name_key";

-- AlterTable
ALTER TABLE "whatsapp_templates" ADD COLUMN     "replaces" TEXT,
ADD COLUMN     "wabaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_templates_name_wabaId_key" ON "whatsapp_templates"("name", "wabaId");
