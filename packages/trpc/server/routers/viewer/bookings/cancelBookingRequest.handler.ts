import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TRPCContext } from "../../../createContext";
import type { TCancelBookingRequestInputSchema } from "./cancelBookingRequest.schema";

type CancelBookingRequestOptions = {
  ctx: TRPCContext & { user: NonNullable<TRPCContext["user"]> };
  input: TCancelBookingRequestInputSchema;
};

export const cancelBookingRequestHandler = async ({ ctx, input }: CancelBookingRequestOptions) => {
  const bookingRequest = await prisma.bookingRequest.findFirst({
    where: { id: input.bookingRequestId, hostId: ctx.user.id },
    select: { id: true, status: true },
  });

  if (!bookingRequest) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking request not found" });
  }

  if (bookingRequest.status !== "PENDING") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot cancel a booking request with status: ${bookingRequest.status}`,
    });
  }

  await prisma.bookingRequest.update({
    where: { id: input.bookingRequestId },
    data: { status: "CANCELLED" },
  });

  return { success: true };
};
