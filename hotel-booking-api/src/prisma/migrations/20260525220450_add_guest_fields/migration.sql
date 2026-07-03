-- AlterTable
ALTER TABLE "User" ADD COLUMN     "country" TEXT,
ADD COLUMN     "idDocument" TEXT,
ADD COLUMN     "isForeigner" BOOLEAN DEFAULT false,
ADD COLUMN     "province" TEXT;
