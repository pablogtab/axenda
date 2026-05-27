-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN');

-- CreateTable
CREATE TABLE "client_field_definitions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL,
    "listId" TEXT,
    "order" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "client_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_field_lists" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "client_field_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_field_list_options" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "client_field_list_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_field_values" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "client_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_field_definitions_tenantId_order_key" ON "client_field_definitions"("tenantId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "client_field_list_options_listId_order_key" ON "client_field_list_options"("listId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "client_field_values_clientId_fieldId_key" ON "client_field_values"("clientId", "fieldId");

-- AddForeignKey
ALTER TABLE "client_field_definitions" ADD CONSTRAINT "client_field_definitions_listId_fkey" FOREIGN KEY ("listId") REFERENCES "client_field_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_field_definitions" ADD CONSTRAINT "client_field_definitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_field_lists" ADD CONSTRAINT "client_field_lists_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_field_list_options" ADD CONSTRAINT "client_field_list_options_listId_fkey" FOREIGN KEY ("listId") REFERENCES "client_field_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_field_values" ADD CONSTRAINT "client_field_values_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_field_values" ADD CONSTRAINT "client_field_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "client_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
