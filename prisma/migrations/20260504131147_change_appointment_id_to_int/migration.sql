/*
  Warnings:

  - The primary key for the `appointment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `appointment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `appointmentId` on the `review` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `appointmentId` on the `serviceexecution` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `Review_appointmentId_fkey`;

-- DropForeignKey
ALTER TABLE `serviceexecution` DROP FOREIGN KEY `ServiceExecution_appointmentId_fkey`;

-- AlterTable
ALTER TABLE `appointment` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `review` MODIFY `appointmentId` INTEGER NULL;

-- AlterTable
ALTER TABLE `serviceexecution` MODIFY `appointmentId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `ServiceExecution` ADD CONSTRAINT `ServiceExecution_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
