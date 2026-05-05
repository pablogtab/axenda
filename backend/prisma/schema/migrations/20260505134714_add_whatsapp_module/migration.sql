-- CreateTable
CREATE TABLE "tenant_whatsapp_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "wabaId" TEXT,
    "phoneId" TEXT,
    "accessToken" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "confirmationTemplateId" TEXT,
    "reminderTemplateId" TEXT,
    "cancellationTemplateId" TEXT,
    "messagesSentMonth" INTEGER NOT NULL DEFAULT 0,
    "lastResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_whatsapp_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'UTILITY',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "language" TEXT NOT NULL DEFAULT 'es_AR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_message_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metaMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_whatsapp_configs_tenantId_key" ON "tenant_whatsapp_configs"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_templates_name_key" ON "whatsapp_templates"("name");

-- AddForeignKey
ALTER TABLE "tenant_whatsapp_configs" ADD CONSTRAINT "tenant_whatsapp_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
