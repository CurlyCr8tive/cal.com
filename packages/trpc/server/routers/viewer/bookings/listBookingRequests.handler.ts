import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TListBookingRequestsInputSchema } from "./listBookingRequests.schema";

type ListBookingRequestsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
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
