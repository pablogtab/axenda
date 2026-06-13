-- CreateEnum
CREATE TYPE "CustomFieldEntity" AS ENUM ('CLIENT', 'APPOINTMENT');

-- Rename tables
ALTER TABLE "client_field_lists" RENAME TO "custom_field_lists";
ALTER TABLE "client_field_list_options" RENAME TO "custom_field_list_options";
ALTER TABLE "client_field_definitions" RENAME TO "custom_field_definitions";
ALTER TABLE "client_field_values" RENAME TO "custom_field_values";

-- Rename primary keys
ALTER TABLE "custom_field_lists" RENAME CONSTRAINT "client_field_lists_pkey" TO "custom_field_lists_pkey";
ALTER TABLE "custom_field_list_options" RENAME CONSTRAINT "client_field_list_options_pkey" TO "custom_field_list_options_pkey";
ALTER TABLE "custom_field_definitions" RENAME CONSTRAINT "client_field_definitions_pkey" TO "custom_field_definitions_pkey";
ALTER TABLE "custom_field_values" RENAME CONSTRAINT "client_field_values_pkey" TO "custom_field_values_pkey";

-- Rename foreign key constraints
ALTER TABLE "custom_field_definitions" RENAME CONSTRAINT "client_field_definitions_listId_fkey" TO "custom_field_definitions_listId_fkey";
ALTER TABLE "custom_field_definitions" RENAME CONSTRAINT "client_field_definitions_tenantId_fkey" TO "custom_field_definitions_tenantId_fkey";
ALTER TABLE "custom_field_lists" RENAME CONSTRAINT "client_field_lists_tenantId_fkey" TO "custom_field_lists_tenantId_fkey";
ALTER TABLE "custom_field_list_options" RENAME CONSTRAINT "client_field_list_options_listId_fkey" TO "custom_field_list_options_listId_fkey";
ALTER TABLE "custom_field_values" RENAME CONSTRAINT "client_field_values_clientId_fkey" TO "custom_field_values_clientId_fkey";
ALTER TABLE "custom_field_values" RENAME CONSTRAINT "client_field_values_fieldId_fkey" TO "custom_field_values_fieldId_fkey";

-- Drop old indices
DROP INDEX "client_field_definitions_tenantId_order_key";
DROP INDEX "client_field_list_options_listId_order_key";
DROP INDEX "client_field_values_clientId_fieldId_key";

-- Add columns to definitions
ALTER TABLE "custom_field_definitions" ADD COLUMN "entityType" "CustomFieldEntity" NOT NULL DEFAULT 'CLIENT';
ALTER TABLE "custom_field_definitions" ADD COLUMN "showInPublicView" BOOLEAN NOT NULL DEFAULT true;

-- Make clientId nullable in values and add appointmentId
ALTER TABLE "custom_field_values" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "custom_field_values" ADD COLUMN "appointmentId" TEXT;

-- Create new indices
CREATE UNIQUE INDEX "custom_field_definitions_tenantId_entityType_order_key" ON "custom_field_definitions"("tenantId", "entityType", "order");
CREATE UNIQUE INDEX "custom_field_list_options_listId_order_key" ON "custom_field_list_options"("listId", "order");
CREATE UNIQUE INDEX "custom_field_values_clientId_fieldId_key" ON "custom_field_values"("clientId", "fieldId");
CREATE UNIQUE INDEX "custom_field_values_appointmentId_fieldId_key" ON "custom_field_values"("appointmentId", "fieldId");

-- Add new foreign key constraint for appointments in values
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
