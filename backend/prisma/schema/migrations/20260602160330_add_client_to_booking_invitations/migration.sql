-- AlterTable
ALTER TABLE "booking_invitations" ADD COLUMN     "clientId" TEXT;

-- AddForeignKey
ALTER TABLE "booking_invitations" ADD CONSTRAINT "booking_invitations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
