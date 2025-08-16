-- AlterTable
ALTER TABLE "DiscoverySession" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE INDEX "DiscoverySession_clientId_idx" ON "DiscoverySession"("clientId");
