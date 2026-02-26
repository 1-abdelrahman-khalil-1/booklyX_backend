/*
  Warnings:

  - You are about to drop the `BusinessApplication` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('DOCTOR', 'BARBER', 'SPA_SPECIALIST');

-- DropForeignKey
ALTER TABLE "ApplicationDocument" DROP CONSTRAINT "ApplicationDocument_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "ApplicationVerificationCode" DROP CONSTRAINT "ApplicationVerificationCode_applicationId_fkey";

-- DropTable
DROP TABLE "BusinessApplication";

-- CreateTable
CREATE TABLE "BranchAdmin" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "ownerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "category" "BusinessCategory" NOT NULL,
    "description" TEXT,
    "commercialRegisterNumber" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "taxCertificateUrl" TEXT,
    "commercialRegisterUrl" TEXT,
    "nationalIdUrl" TEXT,
    "facilityLicenseUrl" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "staffRole" "StaffRole" NOT NULL,
    "commissionPercentage" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProfessionalProfile" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "bio" TEXT,
    "yearsOfExperience" INTEGER,
    "licenseNumber" TEXT,
    "specialization" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffCertificate" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "fileUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BranchAdmin_userId_key" ON "BranchAdmin"("userId");

-- CreateIndex
CREATE INDEX "BranchAdmin_status_idx" ON "BranchAdmin"("status");

-- CreateIndex
CREATE INDEX "BranchAdmin_email_idx" ON "BranchAdmin"("email");

-- CreateIndex
CREATE INDEX "BranchAdmin_phone_idx" ON "BranchAdmin"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");

-- CreateIndex
CREATE INDEX "Staff_userId_idx" ON "Staff"("userId");

-- CreateIndex
CREATE INDEX "Staff_branchId_idx" ON "Staff"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfessionalProfile_staffId_key" ON "StaffProfessionalProfile"("staffId");

-- CreateIndex
CREATE INDEX "StaffCertificate_staffId_idx" ON "StaffCertificate"("staffId");

-- AddForeignKey
ALTER TABLE "BranchAdmin" ADD CONSTRAINT "BranchAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationVerificationCode" ADD CONSTRAINT "ApplicationVerificationCode_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "BranchAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "BranchAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "BranchAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfessionalProfile" ADD CONSTRAINT "StaffProfessionalProfile_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCertificate" ADD CONSTRAINT "StaffCertificate_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
