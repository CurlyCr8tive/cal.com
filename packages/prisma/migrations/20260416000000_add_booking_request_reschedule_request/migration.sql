-- CreateEnum
CREATE TYPE "HashedLinkType" AS ENUM ('PRIVATE_LINK', 'BOOKING_REQUEST');

-- CreateEnum
CREATE TYPE "BookingRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RescheduleRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "RescheduleInitiator" AS ENUM ('ATTENDEE', 'HOST');

-- AlterTable
ALTER TABLE "HashedLink" ADD COLUMN "type" "HashedLinkType" NOT NULL DEFAULT 'PRIVATE_LINK';

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "hostId" INTEGER NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "notes" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "hashedLinkToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescheduleRequest" (
    "id" TEXT NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "initiator" "RescheduleInitiator" NOT NULL,
    "proposedStartTime" TIMESTAMP(3),
    "proposedEndTime" TIMESTAMP(3),
    "reason" TEXT,
    "status" "RescheduleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "counterProposalStartTime" TIMESTAMP(3),
    "counterProposalEndTime" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RescheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_hashedLinkToken_key" ON "BookingRequest"("hashedLinkToken");

-- CreateIndex
CREATE INDEX "BookingRequest_eventTypeId_idx" ON "BookingRequest"("eventTypeId");

-- CreateIndex
CREATE INDEX "BookingRequest_hostId_idx" ON "BookingRequest"("hostId");

-- CreateIndex
CREATE INDEX "BookingRequest_guestEmail_idx" ON "BookingRequest"("guestEmail");

-- CreateIndex
CREATE INDEX "RescheduleRequest_bookingId_idx" ON "RescheduleRequest"("bookingId");

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
