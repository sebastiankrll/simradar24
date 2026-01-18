/*
  Warnings:

  - The primary key for the `Pilot` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Trackpoint` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Trackpoint" DROP CONSTRAINT "Trackpoint_id_fkey";

-- AlterTable
ALTER TABLE "Pilot" DROP CONSTRAINT "Pilot_pkey",
ALTER COLUMN "id" SET DATA TYPE CHAR(16),
ADD CONSTRAINT "Pilot_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Trackpoint" DROP CONSTRAINT "Trackpoint_pkey",
ALTER COLUMN "id" SET DATA TYPE CHAR(16),
ADD CONSTRAINT "Trackpoint_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "Trackpoint" ADD CONSTRAINT "Trackpoint_id_fkey" FOREIGN KEY ("id") REFERENCES "Pilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
