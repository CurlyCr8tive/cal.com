import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TGetBookingRequestByTokenInputSchema } from "./getBookingRequestByToken.schema";

type GetBookingRequestByTokenOptions = {
  input: TGetBookingRequestByTokenInputSchema;
};

export const getBookingRequestByTokenHandler = async ({ input }: GetBookingRequestByTokenOptions) => {
  const bookingRequest = await prisma.bookingRequest.findFirst({
    where: { hashedLinkToken: input.token },
    select: {
      id: true,
      guestEmail: true,
      guestName: true,
      notes: true,
      startTime: true,
      endTime: true,
      status: true,
      expiresAt: true,
      eventType: {
        select: { id: true, title: true, length: true },
      },
      host: {
        select: { id: true, name: true, email: true, username: true },
      },
    },
  });

  if (!bookingRequest) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking request not found" });
  }

  if (bookingRequest.expiresAt < new Date()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This booking request has expired" });
  }

  return { bookingRequest };
};
