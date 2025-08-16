-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "imported" INTEGER NOT NULL,
    "errors" INTEGER NOT NULL,
    "note" TEXT
);
