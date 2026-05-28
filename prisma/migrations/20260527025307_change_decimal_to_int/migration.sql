/*
  Warnings:

  - You are about to alter the column `amount` on the `BookingPayment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `UnsignedInt`.
  - You are about to alter the column `amount` on the `SubscriptionPayment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `UnsignedInt`.

*/
-- AlterTable
ALTER TABLE `BookingPayment` MODIFY `amount` INTEGER UNSIGNED NOT NULL;

-- AlterTable
ALTER TABLE `SubscriptionPayment` MODIFY `amount` INTEGER UNSIGNED NOT NULL;
