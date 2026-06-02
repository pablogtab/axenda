-- AlterTable
ALTER TABLE "booking_invitations" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "professionalId" TEXT;

-- AddForeignKey
ALTER TABLE "booking_invitations" ADD CONSTRAINT "booking_invitations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_invitations" ADD CONSTRAINT "booking_invitations_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
