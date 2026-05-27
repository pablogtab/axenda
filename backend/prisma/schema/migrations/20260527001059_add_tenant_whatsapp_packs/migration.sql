-- CreateTable
CREATE TABLE "tenant_whatsapp_packs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_whatsapp_packs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_whatsapp_packs_tenantId_idx" ON "tenant_whatsapp_packs"("tenantId");

-- AddForeignKey
ALTER TABLE "tenant_whatsapp_packs" ADD CONSTRAINT "tenant_whatsapp_packs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
