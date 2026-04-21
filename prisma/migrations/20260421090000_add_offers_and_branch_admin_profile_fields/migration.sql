-- Add Offer discount enum
CREATE TYPE "OfferDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- Add optional operating hours to branch admin profile
ALTER TABLE "BranchAdmin"
ADD COLUMN "operatingHours" TEXT;

-- Create offers table
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "OfferDiscountType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- Create offer-services join table
CREATE TABLE "OfferService" (
    "offerId" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferService_pkey" PRIMARY KEY ("offerId", "serviceId")
);

CREATE INDEX "Offer_branchId_idx" ON "Offer"("branchId");
CREATE INDEX "Offer_branchId_isActive_idx" ON "Offer"("branchId", "isActive");
CREATE INDEX "Offer_startDate_endDate_idx" ON "Offer"("startDate", "endDate");
CREATE INDEX "OfferService_serviceId_idx" ON "OfferService"("serviceId");

ALTER TABLE "Offer"
ADD CONSTRAINT "Offer_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "BranchAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfferService"
ADD CONSTRAINT "OfferService_offerId_fkey"
FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfferService"
ADD CONSTRAINT "OfferService_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
