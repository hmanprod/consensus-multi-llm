-- AlterTable
ALTER TABLE "OrchestrationConfiguration" ADD COLUMN "configJson" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "activeConfig" JSONB;
