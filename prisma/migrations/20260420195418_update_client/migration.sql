/*
  Warnings:

  - You are about to drop the column `loginSequence` on the `RefreshToken` table. All the data in the column will be lost.
  - You are about to drop the `SystemCounter` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "profileImageUrl" TEXT;

-- AlterTable
ALTER TABLE "RefreshToken" DROP COLUMN "loginSequence";

-- DropTable
DROP TABLE "SystemCounter";
