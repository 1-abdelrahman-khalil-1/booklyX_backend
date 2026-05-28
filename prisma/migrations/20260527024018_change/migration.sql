/*
  Warnings:

  - You are about to alter the column `price` on the `Plan` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `UnsignedInt`.

*/
-- AlterTable
ALTER TABLE `Plan` MODIFY `price` INTEGER UNSIGNED NOT NULL;
