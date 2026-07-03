-- CreateTable
CREATE TABLE "RoomChannelMapping" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomChannelMapping_pkey" PRIMARY KEY ("id")
);
