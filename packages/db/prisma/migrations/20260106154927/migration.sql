/*
  Warnings:

  - The `live` column on the `Pilot` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PilotLiveStatus" AS ENUM ('pre', 'live', 'off');

-- AlterTable
ALTER TABLE "Pilot" DROP COLUMN "live",
ADD COLUMN     "live" "PilotLiveStatus" NOT NULL DEFAULT 'off';

-- CreateIndex
CREATE INDEX "pilots_live_last_idx" ON "Pilot"("live", "last_update");
