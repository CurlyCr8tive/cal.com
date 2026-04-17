import { sendBookingRequestInviteEmail } from "@calcom/emails/email-manager";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";
import type { TCreateBookingRequestInputSchema } from "./createBookingRequest.schema";

type CreateBookingRequestOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
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
    select: { id: true },
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

  try {
    await sendBookingRequestInviteEmail({
      to: input.email,
      guestName: input.name,
      hostName: ctx.user.name ?? ctx.user.email,
      eventTypeName: eventType.title,
      bookingLink: `${WEBAPP_URL}/booking-request/${token}`,
      expiresAt,
      language: ctx.user.locale ?? "en",
    });
  } catch (error) {
    await prisma.$transaction([
      prisma.bookingRequest.delete({ where: { id: bookingRequest.id } }),
      prisma.hashedLink.delete({ where: { link: token } }),
    ]);

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Unable to send booking request email",
      cause: error,
    });
  }

  return { bookingRequest };
};
