/*
  Warnings:

  - The primary key for the `Pilot` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `pilot_id` on the `Pilot` table. All the data in the column will be lost.
  - The primary key for the `Trackpoint` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `pilot_id` on the `Trackpoint` table. All the data in the column will be lost.
  - Added the required column `id` to the `Pilot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id` to the `Trackpoint` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Trackpoint" DROP CONSTRAINT "Trackpoint_pilot_id_fkey";

-- DropIndex
DROP INDEX "pilots_arr_idx";

-- DropIndex
DROP INDEX "pilots_dep_idx";

-- DropIndex
DROP INDEX "Trackpoint_pilot_id_idx";

-- AlterTable
ALTER TABLE "Pilot" DROP CONSTRAINT "Pilot_pkey",
DROP COLUMN "pilot_id",
ADD COLUMN     "id" CHAR(10) NOT NULL,
ADD CONSTRAINT "Pilot_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Trackpoint" DROP CONSTRAINT "Trackpoint_pkey",
DROP COLUMN "pilot_id",
ADD COLUMN     "id" CHAR(10) NOT NULL,
ADD CONSTRAINT "Trackpoint_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "pilots_dep_idx" ON "Pilot"("dep_icao", "sched_off_block", "id");

-- CreateIndex
CREATE INDEX "pilots_arr_idx" ON "Pilot"("arr_icao", "sched_on_block", "id");

-- CreateIndex
CREATE INDEX "Trackpoint_id_idx" ON "Trackpoint"("id");

-- AddForeignKey
ALTER TABLE "Trackpoint" ADD CONSTRAINT "Trackpoint_id_fkey" FOREIGN KEY ("id") REFERENCES "Pilot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
