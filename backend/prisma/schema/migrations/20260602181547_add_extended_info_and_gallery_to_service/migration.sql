-- AlterTable
ALTER TABLE "services" ADD COLUMN     "galleryKeys" JSONB,
ADD COLUMN     "includes" JSONB,
ADD COLUMN     "indications" TEXT,
ADD COLUMN     "mainImageKey" TEXT;
