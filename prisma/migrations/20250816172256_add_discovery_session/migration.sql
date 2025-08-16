-- CreateTable
CREATE TABLE "DiscoverySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "clientName" TEXT,
    "primaryDob" TEXT,
    "zip" TEXT,
    "state" TEXT,
    "county" TEXT,
    "jsonPayload" JSONB NOT NULL,
    "yamlPayload" TEXT NOT NULL DEFAULT '',
    "rapport" JSONB NOT NULL DEFAULT [],
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscoverySession_sessionId_key" ON "DiscoverySession"("sessionId");

-- CreateIndex
CREATE INDEX "DiscoverySession_sessionId_idx" ON "DiscoverySession"("sessionId");

-- CreateIndex
CREATE INDEX "DiscoverySession_createdAt_idx" ON "DiscoverySession"("createdAt");
