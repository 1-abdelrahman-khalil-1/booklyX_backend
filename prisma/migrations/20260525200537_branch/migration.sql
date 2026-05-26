-- AlterTable
ALTER TABLE `BranchAdmin` ADD COLUMN `allowCancellationBeforeHours` INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN `bookingNotificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `marketingNotificationsEnabled` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `BranchAvailability` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branchAdminId` INTEGER NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `status` ENUM('AVAILABLE', 'UNAVAILABLE') NOT NULL DEFAULT 'AVAILABLE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BranchAvailability_branchAdminId_idx`(`branchAdminId`),
    UNIQUE INDEX `BranchAvailability_branchAdminId_dayOfWeek_key`(`branchAdminId`, `dayOfWeek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branchId` INTEGER NOT NULL,
    `appointmentId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `paymentMethod` ENUM('CARD') NOT NULL DEFAULT 'CARD',
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BookingPayment_appointmentId_key`(`appointmentId`),
    INDEX `BookingPayment_branchId_idx`(`branchId`),
    INDEX `BookingPayment_status_idx`(`status`),
    INDEX `BookingPayment_paidAt_idx`(`paidAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `BranchAdmin_status_isSubscriptionActive_idx` ON `BranchAdmin`(`status`, `isSubscriptionActive`);

-- AddForeignKey
ALTER TABLE `BranchAvailability` ADD CONSTRAINT `BranchAvailability_branchAdminId_fkey` FOREIGN KEY (`branchAdminId`) REFERENCES `BranchAdmin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingPayment` ADD CONSTRAINT `BookingPayment_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BranchAdmin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingPayment` ADD CONSTRAINT `BookingPayment_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
