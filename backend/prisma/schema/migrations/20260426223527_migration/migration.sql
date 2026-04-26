/*
  Warnings:

  - The values [UNAVAILABLE,BLOCKED] on the enum `ExceptionType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[publicSlug]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'WAITING';

-- AlterEnum
BEGIN;
CREATE TYPE "ExceptionType_new" AS ENUM ('BLOCK', 'HOLIDAY', 'LEAVE', 'OTHER');
ALTER TABLE "availability_exceptions" ALTER COLUMN "type" TYPE "ExceptionType_new" USING ("type"::text::"ExceptionType_new");
ALTER TYPE "ExceptionType" RENAME TO "ExceptionType_old";
ALTER TYPE "ExceptionType_new" RENAME TO "ExceptionType";
DROP TYPE "public"."ExceptionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "publicSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tenants_publicSlug_key" ON "tenants"("publicSlug");
