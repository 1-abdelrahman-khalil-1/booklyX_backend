-- AlterTable
ALTER TABLE `BookingPayment` ADD COLUMN `appliedOfferId` INTEGER NULL,
    ADD COLUMN `discountAmount` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    ADD COLUMN `originalAmount` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    MODIFY `status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `SubscriptionPayment` MODIFY `status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL;

-- CreateTable
CREATE TABLE `FavoriteBranch` (
    `clientId` INTEGER NOT NULL,
    `branchId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FavoriteBranch_clientId_idx`(`clientId`),
    INDEX `FavoriteBranch_branchId_idx`(`branchId`),
    PRIMARY KEY (`clientId`, `branchId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FavoriteStaff` (
    `clientId` INTEGER NOT NULL,
    `staffId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FavoriteStaff_clientId_idx`(`clientId`),
    INDEX `FavoriteStaff_staffId_idx`(`staffId`),
    PRIMARY KEY (`clientId`, `staffId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `BookingPayment_appliedOfferId_idx` ON `BookingPayment`(`appliedOfferId`);

-- AddForeignKey
ALTER TABLE `BookingPayment` ADD CONSTRAINT `BookingPayment_appliedOfferId_fkey` FOREIGN KEY (`appliedOfferId`) REFERENCES `Offer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FavoriteBranch` ADD CONSTRAINT `FavoriteBranch_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FavoriteBranch` ADD CONSTRAINT `FavoriteBranch_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BranchAdmin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FavoriteStaff` ADD CONSTRAINT `FavoriteStaff_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FavoriteStaff` ADD CONSTRAINT `FavoriteStaff_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
