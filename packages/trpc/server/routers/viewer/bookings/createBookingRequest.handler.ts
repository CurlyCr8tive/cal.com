import { v4 as uuidv4 } from "uuid";

import { sendBookingRequestInviteEmail } from "@calcom/emails/email-manager";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TRPCContext } from "../../../createContext";
import type { TCreateBookingRequestInputSchema } from "./createBookingRequest.schema";

type CreateBookingRequestOptions = {
  ctx: TRPCContext & { user: NonNullable<TRPCContext["user"]> };
  input: TCreateBookingRequestInputSchema;
};

export const createBookingRequestHandler = async ({ ctx, input }: CreateBookingRequestOptions) => {
  // Verify the host owns this event type
  const eventType = await prisma.eventType.findFirst({
    where: { id: input.eventTypeId, userId: ctx.user.id },
    select: { id: true, title: true },
  });

  if (!eventType) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });
  }

  // Prevent duplicate pending requests for the same guest
  const existing = await prisma.bookingRequest.findFirst({
    where: { eventTypeId: input.eventTypeId, guestEmail: input.email, status: "PENDING" },
  });

  if (existing) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A pending booking request already exists for this guest",
    });
  }

  // Generate a one-time link token (expires in 7 days, single use)
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.hashedLink.create({
    data: {
      eventTypeId: input.eventTypeId,
      link: token,
      expiresAt,
      maxUsageCount: 1,
      type: "BOOKING_REQUEST",
    },
  });

  const bookingRequest = await prisma.bookingRequest.create({
    data: {
      eventTypeId: input.eventTypeId,
      hostId: ctx.user.id,
      guestEmail: input.email,
      guestName: input.name,
      notes: input.notes ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      status: "PENDING",
      hashedLinkToken: token,
      expiresAt,
    },
  });

  await sendBookingRequestInviteEmail({
    to: input.email,
    guestName: input.name,
    hostName: ctx.user.name ?? ctx.user.email,
    eventTypeName: eventType.title,
    bookingLink: `${WEBAPP_URL}/booking-request/${token}`,
    expiresAt,
    language: ctx.user.locale ?? "en",
  });

  return { bookingRequest };
};
