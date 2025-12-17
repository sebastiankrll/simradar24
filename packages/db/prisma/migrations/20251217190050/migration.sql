/*
  Warnings:

  - You are about to drop the `UserSettings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserSettings" DROP CONSTRAINT "UserSettings_userCid_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "settings" JSONB;

-- DropTable
DROP TABLE "UserSettings";
