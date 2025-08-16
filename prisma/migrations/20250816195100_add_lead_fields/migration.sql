-- AlterTable
-- Add new columns for Lead model (only missing ones)
-- Note: columns might already exist from prior migrations
-- ALTER TABLE "Contact" ADD COLUMN "lastContacted" DATETIME;
-- ALTER TABLE "Contact" ADD COLUMN "archivedAt" DATETIME;
-- ALTER TABLE "Contact" ADD COLUMN "noShowAt" DATETIME;

-- Update stage values to new LeadStage enum values
UPDATE "Contact" SET "stage" = 'NEW' WHERE "stage" = 'NEW_LEAD';
UPDATE "Contact" SET "stage" = 'WORKING' WHERE "stage" = 'DISCOVERY';
UPDATE "Contact" SET "stage" = 'QUALIFIED' WHERE "stage" = 'QUOTE' OR "stage" = 'PRESENTATION';
UPDATE "Contact" SET "stage" = 'BOOKED' WHERE "stage" = 'APP';
UPDATE "Contact" SET "stage" = 'CLOSED' WHERE "stage" = 'SOLD' OR "stage" = 'ONBOARD' OR "stage" = 'RENEWAL';

-- Ensure all null stages are set to NEW
UPDATE "Contact" SET "stage" = 'NEW' WHERE "stage" IS NULL;