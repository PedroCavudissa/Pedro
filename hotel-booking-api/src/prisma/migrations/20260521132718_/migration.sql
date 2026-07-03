-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "amountPaid" DOUBLE PRECISION,
ADD COLUMN     "checkInReal" TIMESTAMP(3),
ADD COLUMN     "checkOutReal" TIMESTAMP(3),
ADD COLUMN     "earlyCheckoutReason" TEXT,
ADD COLUMN     "extraCharge" DOUBLE PRECISION,
ADD COLUMN     "refundAmount" DOUBLE PRECISION;
