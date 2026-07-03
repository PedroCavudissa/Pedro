/*
  Warnings:

  - You are about to drop the column `amountPaid` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `checkInReal` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `checkOutReal` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `earlyCheckoutReason` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `extraCharge` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `refundAmount` on the `Reservation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "amountPaid",
DROP COLUMN "checkInReal",
DROP COLUMN "checkOutReal",
DROP COLUMN "earlyCheckoutReason",
DROP COLUMN "extraCharge",
DROP COLUMN "refundAmount";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetExpires" TIMESTAMP(3),
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "EarlyCheckoutReason";
