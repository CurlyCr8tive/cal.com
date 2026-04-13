import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCancelBookingRequestInputSchema } from "./cancelBookingRequest.schema";

type CancelBookingRequestOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCancelBookingRequestInputSchema;
};

const log = logger.getSubLogger({ prefix: ["cancelBookingRequestHandler"] });

export const cancelBookingRequestHandler = async ({ ctx, input }: CancelBookingRequestOptions) => {
  const { user } = ctx;
  log.debug("Started", safeStringify({ bookingRequestId: input.bookingRequestId }));

  // 1. FIND & OWNERSHIP CHECK
  const bookingRequest = await prisma.bookingRequest.findFirst({
    where: { id: input.bookingRequestId, hostId: user.id },
    include: { eventType: { select: { title: true } } },
  });

  if (!bookingRequest) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking request not found" });
  }

  // 2. STATUS CHECK
  if (bookingRequest.status !== "PENDING") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot cancel a booking request with status: ${bookingRequest.status}`,
    });
  }

  // 3. UPDATE STATUS
  await prisma.bookingRequest.update({
    where: { id: input.bookingRequestId },
    data: { status: "CANCELLED" },
  });

  log.debug("Completed", safeStringify({ bookingRequestId: input.bookingRequestId }));

  // 4. RETURN
  return { success: true };
};
