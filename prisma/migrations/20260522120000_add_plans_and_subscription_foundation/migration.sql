-- CreateTable
CREATE TABLE `Plan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `maxStaff` INTEGER NULL,
    `maxServices` INTEGER NULL,
    `loyaltyEnabled` BOOLEAN NOT NULL DEFAULT false,
    `offersEnabled` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Plan_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- SeedDefaultPlansForBackfill
INSERT INTO `Plan` (
    `name`,
    `price`,
    `maxStaff`,
    `maxServices`,
    `loyaltyEnabled`,
    `offersEnabled`,
    `isActive`,
    `updatedAt`
) VALUES
    ('Starter', 199.00, 3, 10, false, false, true, CURRENT_TIMESTAMP(3)),
    ('Pro', 499.00, 15, 50, true, true, true, CURRENT_TIMESTAMP(3)),
    ('Enterprise', 1499.00, NULL, NULL, true, true, true, CURRENT_TIMESTAMP(3));

-- AlterTable
ALTER TABLE `BranchAdmin`
    ADD COLUMN `planId` INTEGER NULL,
    ADD COLUMN `isSubscriptionActive` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `subscriptionStartedAt` DATETIME(3) NULL;

-- BackfillExistingBranches
UPDATE `BranchAdmin`
SET `planId` = (SELECT `id` FROM `Plan` WHERE `name` = 'Starter' LIMIT 1)
WHERE `planId` IS NULL;

-- RequirePlanForBranches
ALTER TABLE `BranchAdmin` MODIFY `planId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `BranchAdmin_planId_idx` ON `BranchAdmin`(`planId`);

-- AddForeignKey
ALTER TABLE `BranchAdmin` ADD CONSTRAINT `BranchAdmin_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
