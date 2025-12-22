/*
  Warnings:

  - You are about to drop the column `ghost` on the `Pilot` table. All the data in the column will be lost.
  - You are about to drop the column `route` on the `Pilot` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Pilot" DROP COLUMN "ghost",
DROP COLUMN "route";
