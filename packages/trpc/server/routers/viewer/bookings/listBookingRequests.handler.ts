import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TListBookingRequestsInputSchema } from "./listBookingRequests.schema";

type ListBookingRequestsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListBookingRequestsInputSchema;
};

const log = logger.getSubLogger({ prefix: ["listBookingRequestsHandler"] });

export const listBookingRequestsHandler = async ({ ctx, input }: ListBookingRequestsOptions) => {
  const { user } = ctx;
  log.debug("Started", safeStringify({ userId: user.id, status: input.status }));

  const bookingRequests = await prisma.bookingRequest.findMany({
    where: {
      hostId: user.id,
      ...(input.status ? { status: input.status } : {}),
    },
    include: {
      eventType: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  log.debug("Completed", safeStringify({ count: bookingRequests.length }));

  return { bookingRequests };
};
