import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TDeclineBookingRequestInputSchema } from "./declineBookingRequest.schema";

type DeclineBookingRequestOptions = {
  input: TDeclineBookingRequestInputSchema;
};

export const declineBookingRequestHandler = async ({ input }: DeclineBookingRequestOptions) => {
  const bookingRequest = await prisma.bookingRequest.findFirst({
    where: { hashedLinkToken: input.token },
    select: { id: true, status: true, expiresAt: true },
  });

  if (!bookingRequest) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking request not found" });
  }

  if (bookingRequest.status !== "PENDING") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `This booking request has already been ${bookingRequest.status.toLowerCase()}`,
    });
  }

  await prisma.bookingRequest.update({
    where: { id: bookingRequest.id },
    data: { status: "DECLINED" },
  });

  return { success: true };
};
