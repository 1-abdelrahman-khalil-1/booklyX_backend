-- CreateTable
CREATE TABLE `ServiceExecution` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appointmentId` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `attachments` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceExecution_appointmentId_key`(`appointmentId`),
    INDEX `ServiceExecution_appointmentId_idx`(`appointmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ServiceExecution` ADD CONSTRAINT `ServiceExecution_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
