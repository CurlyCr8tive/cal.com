import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TRPCContext } from "../../../createContext";
import type { TListBookingRequestsInputSchema } from "./listBookingRequests.schema";

type ListBookingRequestsOptions = {
  ctx: TRPCContext & { user: NonNullable<TRPCContext["user"]> };
  input: TListBookingRequestsInputSchema;
};

export const listBookingRequestsHandler = async ({ ctx, input }: ListBookingRequestsOptions) => {
  const bookingRequests = await prisma.bookingRequest.findMany({
    where: {
      hostId: ctx.user.id,
      ...(input.status ? { status: input.status } : {}),
    },
    select: {
      id: true,
      guestEmail: true,
      guestName: true,
      notes: true,
      startTime: true,
      endTime: true,
      status: true,
      hashedLinkToken: true,
      expiresAt: true,
      createdAt: true,
      eventType: {
        select: { id: true, title: true, slug: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { bookingRequests };
};
