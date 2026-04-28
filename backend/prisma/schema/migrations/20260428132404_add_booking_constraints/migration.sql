-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "publicMaxBookingDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "publicMinBookingTime" TEXT NOT NULL DEFAULT '1h';
