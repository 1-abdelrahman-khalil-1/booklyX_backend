-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `role` ENUM('client', 'staff', 'branch_admin', 'super_admin') NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `phoneVerified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `profileImageUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Client_userId_key`(`userId`),
    INDEX `Client_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Staff` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `branchId` INTEGER NOT NULL,
    `profileImageUrl` VARCHAR(191) NULL,
    `age` INTEGER NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `staffRole` ENUM('DOCTOR', 'BARBER', 'SPA_SPECIALIST') NOT NULL,
    `commissionPercentage` DOUBLE NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `averageRating` DOUBLE NOT NULL DEFAULT 0,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Staff_userId_key`(`userId`),
    INDEX `Staff_userId_idx`(`userId`),
    INDEX `Staff_branchId_idx`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BranchAdmin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `ownerName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `businessName` VARCHAR(191) NOT NULL,
    `category` ENUM('SPA', 'CLINIC', 'BARBER') NOT NULL,
    `description` VARCHAR(191) NULL,
    `commercialRegisterNumber` VARCHAR(191) NOT NULL,
    `taxId` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `taxCertificateUrl` VARCHAR(191) NULL,
    `commercialRegisterUrl` VARCHAR(191) NULL,
    `nationalIdUrl` VARCHAR(191) NULL,
    `facilityLicenseUrl` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `operatingHours` VARCHAR(191) NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `status` ENUM('PENDING_VERIFICATION', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `phoneVerified` BOOLEAN NOT NULL DEFAULT false,
    `rejectionReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BranchAdmin_userId_key`(`userId`),
    INDEX `BranchAdmin_status_idx`(`status`),
    INDEX `BranchAdmin_email_idx`(`email`),
    INDEX `BranchAdmin_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationCode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('EMAIL', 'PHONE', 'PASSWORD_RESET') NOT NULL,
    `codeHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VerificationCode_userId_type_idx`(`userId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `loginSequence` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefreshToken_tokenHash_key`(`tokenHash`),
    INDEX `RefreshToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApplicationVerificationCode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicationId` INTEGER NOT NULL,
    `type` ENUM('EMAIL', 'PHONE', 'PASSWORD_RESET') NOT NULL,
    `codeHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApplicationVerificationCode_applicationId_type_idx`(`applicationId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApplicationDocument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicationId` INTEGER NOT NULL,
    `type` ENUM('TAX_CERTIFICATE', 'COMMERCIAL_REGISTER', 'NATIONAL_ID', 'FACILITY_LICENSE') NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApplicationDocument_applicationId_idx`(`applicationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffProfessionalProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staffId` INTEGER NOT NULL,
    `bio` VARCHAR(191) NULL,
    `yearsOfExperience` INTEGER NULL,
    `licenseNumber` VARCHAR(191) NULL,
    `specialization` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StaffProfessionalProfile_staffId_key`(`staffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffCertificate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staffId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `issuer` VARCHAR(191) NOT NULL,
    `issueDate` DATETIME(3) NOT NULL,
    `expiryDate` DATETIME(3) NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StaffCertificate_staffId_idx`(`staffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branchId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceCategory_branchId_idx`(`branchId`),
    UNIQUE INDEX `ServiceCategory_branchId_name_key`(`branchId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffService` (
    `staffId` INTEGER NOT NULL,
    `serviceId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StaffService_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`staffId`, `serviceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branchId` INTEGER NOT NULL,
    `serviceCategoryId` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `durationMinutes` INTEGER NOT NULL,
    `duration` INTEGER NULL,
    `imageUrl` VARCHAR(191) NULL,
    `status` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL',
    `rejectionReason` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Service_branchId_idx`(`branchId`),
    INDEX `Service_status_idx`(`status`),
    INDEX `Service_branchId_status_idx`(`branchId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Offer` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `discountType` ENUM('PERCENTAGE', 'FIXED') NOT NULL,
    `discountValue` DOUBLE NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `usageLimit` INTEGER NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Offer_branchId_idx`(`branchId`),
    INDEX `Offer_branchId_isActive_idx`(`branchId`, `isActive`),
    INDEX `Offer_startDate_endDate_idx`(`startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OfferService` (
    `offerId` VARCHAR(191) NOT NULL,
    `serviceId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OfferService_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`offerId`, `serviceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` INTEGER NULL,
    `reviewerId` INTEGER NOT NULL,
    `serviceId` INTEGER NOT NULL,
    `branchId` INTEGER NOT NULL,
    `staffId` INTEGER NOT NULL,
    `appointmentId` VARCHAR(191) NULL,
    `rating` INTEGER NOT NULL,
    `comment` VARCHAR(191) NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `reviewerRole` ENUM('client', 'staff', 'branch_admin', 'super_admin') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Review_appointmentId_key`(`appointmentId`),
    INDEX `Review_clientId_idx`(`clientId`),
    INDEX `Review_reviewerId_idx`(`reviewerId`),
    INDEX `Review_reviewerRole_idx`(`reviewerRole`),
    INDEX `Review_serviceId_idx`(`serviceId`),
    INDEX `Review_staffId_idx`(`staffId`),
    INDEX `Review_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Appointment` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` INTEGER NOT NULL,
    `staffId` INTEGER NOT NULL,
    `serviceId` INTEGER NOT NULL,
    `branchId` INTEGER NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Appointment_clientId_idx`(`clientId`),
    INDEX `Appointment_staffId_idx`(`staffId`),
    INDEX `Appointment_serviceId_idx`(`serviceId`),
    INDEX `Appointment_branchId_idx`(`branchId`),
    INDEX `Appointment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffAvailability` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staffId` INTEGER NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `status` ENUM('AVAILABLE', 'UNAVAILABLE') NOT NULL DEFAULT 'AVAILABLE',

    UNIQUE INDEX `StaffAvailability_staffId_dayOfWeek_key`(`staffId`, `dayOfWeek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemCounter` (
    `key` VARCHAR(191) NOT NULL,
    `value` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Client` ADD CONSTRAINT `Client_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BranchAdmin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BranchAdmin` ADD CONSTRAINT `BranchAdmin_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationCode` ADD CONSTRAINT `VerificationCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationVerificationCode` ADD CONSTRAINT `ApplicationVerificationCode_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `BranchAdmin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationDocument` ADD CONSTRAINT `ApplicationDocument_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `BranchAdmin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffProfessionalProfile` ADD CONSTRAINT `StaffProfessionalProfile_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffCertificate` ADD CONSTRAINT `StaffCertificate_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceCategory` ADD CONSTRAINT `ServiceCategory_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BranchAdmin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffService` ADD CONSTRAINT `StaffService_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffService` ADD CONSTRAINT `StaffService_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BranchAdmin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_serviceCategoryId_fkey` FOREIGN KEY (`serviceCategoryId`) REFERENCES `ServiceCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BranchAdmin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferService` ADD CONSTRAINT `OfferService_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `Offer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferService` ADD CONSTRAINT `OfferService_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BranchAdmin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BranchAdmin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffAvailability` ADD CONSTRAINT `StaffAvailability_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
