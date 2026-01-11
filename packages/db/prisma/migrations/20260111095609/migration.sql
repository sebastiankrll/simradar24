-- DropForeignKey
ALTER TABLE "Trackpoint" DROP CONSTRAINT "Trackpoint_id_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "navigraphToken" JSONB;

-- AddForeignKey
ALTER TABLE "Trackpoint" ADD CONSTRAINT "Trackpoint_id_fkey" FOREIGN KEY ("id") REFERENCES "Pilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
