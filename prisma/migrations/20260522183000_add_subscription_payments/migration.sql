-- CreateTable
CREATE TABLE `SubscriptionPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branchId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED') NOT NULL,
    `paymentMethod` ENUM('CARD', 'CASH', 'WALLET') NOT NULL DEFAULT 'CARD',
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `SubscriptionPayment_branchId_idx` ON `SubscriptionPayment`(`branchId`);

-- CreateIndex
CREATE INDEX `SubscriptionPayment_planId_idx` ON `SubscriptionPayment`(`planId`);

-- CreateIndex
CREATE INDEX `SubscriptionPayment_status_idx` ON `SubscriptionPayment`(`status`);

-- CreateIndex
CREATE INDEX `SubscriptionPayment_paidAt_idx` ON `SubscriptionPayment`(`paidAt`);

-- AddForeignKey
ALTER TABLE `SubscriptionPayment` ADD CONSTRAINT `SubscriptionPayment_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BranchAdmin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionPayment` ADD CONSTRAINT `SubscriptionPayment_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
