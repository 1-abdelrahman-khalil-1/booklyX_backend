-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "loginSequence" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SystemCounter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemCounter_pkey" PRIMARY KEY ("key")
);
