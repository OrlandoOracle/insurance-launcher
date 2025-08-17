/*
  Warnings:

  - You are about to drop the column `howHeard` on the `Contact` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "lastContacted" DATETIME,
    "archivedAt" DATETIME,
    "noShowAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ghlId" TEXT,
    "ghlUrl" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]'
);
INSERT INTO "new_Contact" ("archivedAt", "createdAt", "email", "firstName", "ghlUrl", "id", "lastContacted", "lastName", "noShowAt", "phone", "source", "stage", "tags", "updatedAt") SELECT "archivedAt", "createdAt", "email", "firstName", "ghlUrl", "id", "lastContacted", "lastName", "noShowAt", "phone", "source", "stage", "tags", "updatedAt" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE UNIQUE INDEX "Contact_email_key" ON "Contact"("email");
CREATE UNIQUE INDEX "Contact_ghlId_key" ON "Contact"("ghlId");
CREATE INDEX "Contact_lastName_idx" ON "Contact"("lastName");
CREATE INDEX "Contact_phone_idx" ON "Contact"("phone");
CREATE INDEX "Contact_email_idx" ON "Contact"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
