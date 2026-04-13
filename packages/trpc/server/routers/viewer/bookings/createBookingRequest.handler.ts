import { HashedLinkService } from "@calcom/features/hashedLink/lib/service/HashedLinkService";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { sendBookingRequestInviteEmail } from "@calcom/emails/email-manager";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateBookingRequestInputSchema } from "./createBookingRequest.schema";

type CreateBookingRequestOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateBookingRequestInputSchema;
};

const hashedLinkService = new HashedLinkService();
const log = logger.getSubLogger({ prefix: ["createBookingRequestHandler"] });

export const createBookingRequestHandler = async ({ ctx, input }: CreateBookingRequestOptions) => {
  const { user } = ctx;
  log.debug("Started", safeStringify({ eventTypeId: input.eventTypeId, guestEmail: input.email }));

  // 1. OWNERSHIP CHECK
  const eventType = await prisma.eventType.findFirst({
    where: { id: input.eventTypeId, userId: user.id },
    select: { id: true, title: true },
  });

  if (!eventType) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });
  }

  // 2. DUPLICATE CHECK
  const existing = await prisma.bookingRequest.findFirst({
    where: {
      eventTypeId: input.eventTypeId,
      guestEmail: input.email,
      status: "PENDING",
    },
  });

  if (existing) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A pending booking request already exists for this guest",
    });
  }

  // 3. GENERATE HASHED LINK
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const hashedLink = await hashedLinkService.createLinkForEventType(input.eventTypeId, {
    link: crypto.randomUUID(),
    expiresAt,
    maxUsageCount: 1,
  });

  // 4. CREATE RECORD
  const bookingRequest = await prisma.bookingRequest.create({
    data: {
      eventTypeId: input.eventTypeId,
      hostId: user.id,
      guestEmail: input.email,
      guestName: input.name,
      notes: input.notes ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      status: "PENDING",
      hashedLinkToken: hashedLink.link,
      expiresAt,
    },
  });

  // 5. SEND EMAIL
  await sendBookingRequestInviteEmail({
    to: input.email,
    guestName: input.name,
    hostName: user.name ?? user.email,
    eventTypeName: eventType.title,
    bookingLink: `${WEBAPP_URL}/booking-request/${hashedLink.link}`,
    expiresAt,
    language: user.locale ?? "en",
  });

  log.debug("Completed", safeStringify({ bookingRequestId: bookingRequest.id }));

  // 6. RETURN
  return { bookingRequest };
};
