import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import {
  sendRescheduleRequestAcceptedEmail,
  sendRescheduleRequestDeclinedEmail,
} from "@calcom/emails/email-manager";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TRespondToRescheduleRequestInputSchema } from "./respondToRescheduleRequest.schema";

type RespondToRescheduleRequestOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRespondToRescheduleRequestInputSchema;
};

const log = logger.getSubLogger({ prefix: ["respondToRescheduleRequestHandler"] });

export const respondToRescheduleRequestHandler = async ({
  ctx,
  input,
}: RespondToRescheduleRequestOptions) => {
  const { user } = ctx;
  log.debug("Started", safeStringify({ rescheduleRequestId: input.rescheduleRequestId }));

  // 1. FIND RESCHEDULE REQUEST
  const rescheduleRequest = await prisma.rescheduleRequest.findFirst({
    where: { id: input.rescheduleRequestId },
    include: {
      booking: {
        include: {
          attendees: true,
          user: { select: { id: true, email: true, name: true, locale: true } },
          eventType: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!rescheduleRequest) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Reschedule request not found" });
  }

  // 2. OWNERSHIP CHECK
  if (rescheduleRequest.booking.userId !== user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to respond to this reschedule request",
    });
  }

  // 3. STATUS CHECK
  if (rescheduleRequest.status !== "PENDING") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot respond to a reschedule request with status: ${rescheduleRequest.status}`,
    });
  }

  // 4. UPDATE RESCHEDULE REQUEST
  const updated = await prisma.rescheduleRequest.update({
    where: { id: input.rescheduleRequestId },
    data: {
      status: input.response,
      counterProposalStartTime: input.counterProposalStartTime ?? null,
      counterProposalEndTime: input.counterProposalEndTime ?? null,
      respondedAt: new Date(),
    },
  });

  // 5. IF ACCEPTED WITH COUNTER PROPOSAL, UPDATE BOOKING TIMES
  if (
    input.response === "ACCEPTED" &&
    input.counterProposalStartTime &&
    input.counterProposalEndTime
  ) {
    await prisma.booking.update({
      where: { id: rescheduleRequest.bookingId },
      data: {
        startTime: input.counterProposalStartTime,
        endTime: input.counterProposalEndTime,
      },
    });
  }

  // 6. SEND EMAIL TO ATTENDEE
  const attendee = rescheduleRequest.booking.attendees[0];
  const booking = rescheduleRequest.booking;

  if (attendee) {
    if (input.response === "ACCEPTED") {
      await sendRescheduleRequestAcceptedEmail({
        to: attendee.email,
        guestName: attendee.name,
        hostName: user.name ?? user.email,
        eventTypeName: booking.eventType?.title ?? booking.title,
        originalStartTime: booking.startTime,
        newStartTime: input.counterProposalStartTime ?? rescheduleRequest.proposedStartTime,
        language: booking.user?.locale ?? "en",
      });
    } else {
      await sendRescheduleRequestDeclinedEmail({
        to: attendee.email,
        guestName: attendee.name,
        hostName: user.name ?? user.email,
        eventTypeName: booking.eventType?.title ?? booking.title,
        language: booking.user?.locale ?? "en",
      });
    }
  }

  log.debug("Completed", safeStringify({ rescheduleRequestId: input.rescheduleRequestId }));

  // 7. RETURN
  return { rescheduleRequest: updated };
};
