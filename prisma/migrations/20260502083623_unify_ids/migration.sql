/*
  Warnings:

  - The primary key for the `offer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `offer` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `offerservice` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `offerId` on the `offerservice` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- DropForeignKey
ALTER TABLE `offerservice` DROP FOREIGN KEY `OfferService_offerId_fkey`;

-- AlterTable
ALTER TABLE `offer` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `offerservice` DROP PRIMARY KEY,
    MODIFY `offerId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`offerId`, `serviceId`);

-- AddForeignKey
ALTER TABLE `OfferService` ADD CONSTRAINT `OfferService_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `Offer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
