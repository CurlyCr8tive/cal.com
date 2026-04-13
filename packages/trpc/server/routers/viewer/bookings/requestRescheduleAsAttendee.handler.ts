import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { sendRescheduleRequestReceivedEmail } from "@calcom/emails/email-manager";

import { TRPCError } from "@trpc/server";

import type { TRequestRescheduleAsAttendeeInputSchema } from "./requestRescheduleAsAttendee.schema";

type RequestRescheduleAsAttendeeOptions = {
  input: TRequestRescheduleAsAttendeeInputSchema;
};

const log = logger.getSubLogger({ prefix: ["requestRescheduleAsAttendeeHandler"] });

export const requestRescheduleAsAttendeeHandler = async ({ input }: RequestRescheduleAsAttendeeOptions) => {
  log.debug("Started", safeStringify({ bookingId: input.bookingId }));

  // 1. FIND BOOKING
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: {
      attendees: true,
      user: { select: { id: true, email: true, name: true, locale: true } },
      eventType: { select: { id: true, title: true } },
    },
  });

  if (!booking) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }

  // 2. VERIFY ATTENDEE VIA TOKEN
  const decoded = Buffer.from(input.oneTimePassword, "base64").toString("utf-8");
  const [attendeeEmail] = decoded.split(":");
  const attendee = booking.attendees.find(
    (a) => a.email.toLowerCase() === attendeeEmail.toLowerCase()
  );

  if (!attendee) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired token" });
  }

  // 3. CHECK FOR EXISTING PENDING REQUEST
  const existingRequest = await prisma.rescheduleRequest.findFirst({
    where: { bookingId: input.bookingId, status: "PENDING" },
  });

  if (existingRequest) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A reschedule request is already pending for this booking",
    });
  }

  // 4. CREATE RESCHEDULE REQUEST
  const rescheduleRequest = await prisma.rescheduleRequest.create({
    data: {
      bookingId: input.bookingId,
      initiator: "ATTENDEE",
      proposedStartTime: input.proposedStartTime ?? null,
      proposedEndTime: input.proposedEndTime ?? null,
      reason: input.reason ?? null,
      status: "PENDING",
    },
  });

  // 5. SEND EMAIL TO HOST
  if (booking.user) {
    await sendRescheduleRequestReceivedEmail({
      to: booking.user.email,
      hostName: booking.user.name ?? booking.user.email,
      guestName: attendee.name,
      eventTypeName: booking.eventType?.title ?? booking.title,
      currentStartTime: booking.startTime,
      proposedStartTime: input.proposedStartTime,
      reason: input.reason,
      language: booking.user.locale ?? "en",
    });
  }

  log.debug("Completed", safeStringify({ rescheduleRequestId: rescheduleRequest.id }));

  // 6. RETURN
  return { rescheduleRequest };
};
