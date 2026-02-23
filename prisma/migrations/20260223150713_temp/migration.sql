/*
  Warnings:

  - You are about to drop the column `crNumber` on the `BusinessApplication` table. All the data in the column will be lost.
  - Added the required column `commercialRegisterNumber` to the `BusinessApplication` table without a default value. This is not possible if the table is not empty.
  - Made the column `taxId` on table `BusinessApplication` required. This step will fail if there are existing NULL values in that column.
  - Made the column `district` on table `BusinessApplication` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "BusinessApplication" DROP COLUMN "crNumber",
ADD COLUMN     "commercialRegisterNumber" TEXT NOT NULL,
ADD COLUMN     "commercialRegisterUrl" TEXT,
ADD COLUMN     "facilityLicenseUrl" TEXT,
ADD COLUMN     "nationalIdUrl" TEXT,
ADD COLUMN     "taxCertificateUrl" TEXT,
ALTER COLUMN "taxId" SET NOT NULL,
ALTER COLUMN "district" SET NOT NULL;
