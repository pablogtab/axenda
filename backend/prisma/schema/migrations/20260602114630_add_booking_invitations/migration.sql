-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "invitationId" TEXT;

-- CreateTable
CREATE TABLE "booking_invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxUses" INTEGER,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "startDate" DATE,
    "endDate" DATE,
    "schedule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_invitations_token_key" ON "booking_invitations"("token");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "booking_invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_invitations" ADD CONSTRAINT "booking_invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
