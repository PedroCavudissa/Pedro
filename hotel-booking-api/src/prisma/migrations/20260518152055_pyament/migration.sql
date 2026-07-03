/*
  Warnings:

  - You are about to drop the column `status` on the `Room` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RoomState" AS ENUM ('VACANT_CLEAN', 'VACANT_DIRTY', 'OCCUPIED', 'CLEANING', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "MaintenanceState" AS ENUM ('NONE', 'OUT_OF_ORDER', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "InspectionState" AS ENUM ('NOT_INSPECTED', 'INSPECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "status",
ADD COLUMN     "floor" INTEGER,
ADD COLUMN     "inspection" "InspectionState" NOT NULL DEFAULT 'NOT_INSPECTED',
ADD COLUMN     "maintenance" "MaintenanceState" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "state" "RoomState" NOT NULL DEFAULT 'VACANT_CLEAN';

-- DropEnum
DROP TYPE "RoomStatus";
