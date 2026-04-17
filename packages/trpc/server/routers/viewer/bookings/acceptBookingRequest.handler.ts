import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TAcceptBookingRequestInputSchema } from "./acceptBookingRequest.schema";

type AcceptBookingRequestOptions = {
  input: TAcceptBookingRequestInputSchema;
};

export const acceptBookingRequestHandler = async ({ input }: AcceptBookingRequestOptions) => {
  const bookingRequest = await prisma.bookingRequest.findFirst({
    where: { hashedLinkToken: input.token },
    select: {
      id: true,
      guestEmail: true,
      guestName: true,
      startTime: true,
      endTime: true,
      status: true,
      expiresAt: true,
      hostId: true,
      eventTypeId: true,
      eventType: { select: { title: true } },
    },
  });

  if (!bookingRequest) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking request not found" });
  }

  if (bookingRequest.expiresAt < new Date()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This booking request has expired" });
  }

  if (bookingRequest.status !== "PENDING") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `This booking request has already been ${bookingRequest.status.toLowerCase()}`,
    });
  }

  // oneTimePassword lets the guest later open RescheduleRequestModal on their booking page
  const oneTimePassword = Buffer.from(`${bookingRequest.guestEmail}:${input.token}`).toString("base64");

  const [booking] = await prisma.$transaction([
    prisma.booking.create({
      data: {
        uid: uuidv4(),
        title: bookingRequest.eventType?.title ?? "Meeting",
        startTime: bookingRequest.startTime,
        endTime: bookingRequest.endTime,
        status: BookingStatus.ACCEPTED,
        oneTimePassword,
        user: { connect: { id: bookingRequest.hostId } },
        eventType: { connect: { id: bookingRequest.eventTypeId } },
        attendees: {
          create: {
            email: bookingRequest.guestEmail,
            name: bookingRequest.guestName,
            timeZone: input.timeZone,
          },
        },
      },
      select: { uid: true, id: true },
    }),
    prisma.bookingRequest.update({
      where: { id: bookingRequest.id },
      data: { status: "ACCEPTED" },
    }),
    prisma.hashedLink.updateMany({
      where: { link: input.token },
      data: { usageCount: { increment: 1 } },
    }),
  ]);

  return { bookingUid: booking.uid, oneTimePassword };
};
