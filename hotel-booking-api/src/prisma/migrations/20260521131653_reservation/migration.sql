/*
  Warnings:

  - You are about to drop the column `resetExpires` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `resetToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tokenVersion` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EarlyCheckoutReason" AS ENUM ('EMERGENCY', 'PERSONAL', 'TRAVEL_CHANGE', 'OTHER');

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "amountPaid" DOUBLE PRECISION,
ADD COLUMN     "checkInReal" TIMESTAMP(3),
ADD COLUMN     "checkOutReal" TIMESTAMP(3),
ADD COLUMN     "earlyCheckoutReason" "EarlyCheckoutReason",
ADD COLUMN     "extraCharge" DOUBLE PRECISION,
ADD COLUMN     "refundAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "resetExpires",
DROP COLUMN "resetToken",
DROP COLUMN "tokenVersion";
