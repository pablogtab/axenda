-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "cancellationLimit" TEXT NOT NULL DEFAULT '24h';
