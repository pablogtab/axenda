/*
  Warnings:

  - A unique constraint covering the columns `[externalPaymentId]` on the table `subscription_invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_externalPaymentId_key" ON "subscription_invoices"("externalPaymentId");
