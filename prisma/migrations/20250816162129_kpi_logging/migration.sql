-- AlterTable
ALTER TABLE "Setting" ADD COLUMN "chromeProfileDir" TEXT;
ALTER TABLE "Setting" ADD COLUMN "dashboardLayout" JSONB;
ALTER TABLE "Setting" ADD COLUMN "ghlOppsUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactId" TEXT,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "direction" TEXT,
    "outcome" TEXT,
    "count" INTEGER,
    "revenue" REAL,
    "notes" TEXT,
    "voicemail" BOOLEAN NOT NULL DEFAULT false,
    "smsSent" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Activity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Activity" ("contactId", "createdAt", "details", "direction", "id", "outcome", "revenue", "summary", "type") SELECT "contactId", "createdAt", "details", "direction", "id", "outcome", "revenue", "summary", "type" FROM "Activity";
DROP TABLE "Activity";
ALTER TABLE "new_Activity" RENAME TO "Activity";
CREATE INDEX "Activity_contactId_idx" ON "Activity"("contactId");
CREATE INDEX "Activity_date_idx" ON "Activity"("date");
CREATE INDEX "Activity_type_idx" ON "Activity"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
