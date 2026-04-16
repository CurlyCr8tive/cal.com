import { sendRescheduleRequestReceivedEmail } from "@calcom/emails/email-manager";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TRequestRescheduleAsAttendeeInputSchema } from "./requestRescheduleAsAttendee.schema";

type RequestRescheduleAsAttendeeOptions = {
  input: TRequestRescheduleAsAttendeeInputSchema;
};

export const requestRescheduleAsAttendeeHandler = async ({ input }: RequestRescheduleAsAttendeeOptions) => {
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

  // Authenticate guest via base64-encoded "email:token"
  const decoded = Buffer.from(input.oneTimePassword, "base64").toString("utf-8");
  const [attendeeEmail] = decoded.split(":");
  const attendee = booking.attendees.find((a) => a.email.toLowerCase() === attendeeEmail.toLowerCase());

  if (!attendee) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired token" });
  }

  const existingRequest = await prisma.rescheduleRequest.findFirst({
    where: { bookingId: input.bookingId, status: "PENDING" },
  });

  if (existingRequest) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A reschedule request is already pending for this booking",
    });
  }

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

  return { rescheduleRequest };
};
