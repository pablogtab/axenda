-- AlterTable
ALTER TABLE "services" ADD COLUMN     "customPriceLabel" TEXT,
ADD COLUMN     "isBookablePublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showDuration" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showPrice" BOOLEAN NOT NULL DEFAULT true;
