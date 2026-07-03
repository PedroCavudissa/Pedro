-- Login com Google: password passa a ser opcional, novos campos de identidade
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'LOCAL';

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- Taxa de late checkout (acrescida a cada 60 minutos, confirmada pela receção)
ALTER TABLE "Reservation" ADD COLUMN "lateFeeAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Reservation" ADD COLUMN "lateFeePaid" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Reservation" ADD COLUMN "lateFeeConfirmed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Reservation" ADD COLUMN "lastLateFeeAt" TIMESTAMP(3);
