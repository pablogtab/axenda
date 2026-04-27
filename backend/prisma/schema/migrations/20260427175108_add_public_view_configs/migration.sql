-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "publicShowBranchSelection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "publicShowProfessionalSelection" BOOLEAN NOT NULL DEFAULT true;
