-- AlterTable
ALTER TABLE "Task" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "Task" ADD COLUMN "label" TEXT;
ALTER TABLE "Task" ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'NEW';

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "Task"("priority");

-- CreateIndex
CREATE INDEX "Task_stage_idx" ON "Task"("stage");