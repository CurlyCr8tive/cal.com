import { sendRescheduleRequestAcceptedEmail, sendRescheduleRequestDeclinedEmail } from "@calcom/emails/email-manager";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TRPCContext } from "../../../createContext";
import type { TRespondToRescheduleRequestInputSchema } from "./respondToRescheduleRequest.schema";

type RespondToRescheduleRequestOptions = {
  ctx: TRPCContext & { user: NonNullable<TRPCContext["user"]> };
  input: TRespondToRescheduleRequestInputSchema;
};

export const respondToRescheduleRequestHandler = async ({
  ctx,
  input,
}: RespondToRescheduleRequestOptions) => {
  const rescheduleRequest = await prisma.rescheduleRequest.findUnique({
    where: { id: input.rescheduleRequestId },
    include: {
      booking: {
        include: {
          attendees: true,
          user: { select: { id: true, email: true, name: true, locale: true } },
          eventType: { select: { title: true } },
        },
      },
    },
  });

  if (!rescheduleRequest) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Reschedule request not found" });
  }

  if (rescheduleRequest.booking.userId !== ctx.user.id) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You don't have permission to respond to this request" });
  }

  if (rescheduleRequest.status !== "PENDING") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot respond to a request with status: ${rescheduleRequest.status}`,
    });
  }

  const updated = await prisma.rescheduleRequest.update({
    where: { id: input.rescheduleRequestId },
    data: {
      status: input.response,
      counterProposalStartTime: input.counterProposalStartTime ?? null,
      counterProposalEndTime: input.counterProposalEndTime ?? null,
      respondedAt: new Date(),
    },
  });

  // If accepted with a counter-proposal, update the booking times
  if (input.response === "ACCEPTED" && input.counterProposalStartTime && input.counterProposalEndTime) {
    await prisma.booking.update({
      where: { id: rescheduleRequest.bookingId },
      data: {
        startTime: input.counterProposalStartTime,
        endTime: input.counterProposalEndTime,
      },
    });
  }

  // Send notification email to the attendee
  const attendee = rescheduleRequest.booking.attendees[0];
  const booking = rescheduleRequest.booking;

  if (attendee) {
    const language = booking.user?.locale ?? "en";
    const hostName = ctx.user.name ?? ctx.user.email;
    const eventTypeName = booking.eventType?.title ?? booking.title;

    if (input.response === "ACCEPTED") {
      await sendRescheduleRequestAcceptedEmail({
        to: attendee.email,
        guestName: attendee.name,
        hostName,
        eventTypeName,
        originalStartTime: booking.startTime,
        newStartTime: input.counterProposalStartTime ?? rescheduleRequest.proposedStartTime ?? undefined,
        language,
      });
    } else {
      await sendRescheduleRequestDeclinedEmail({
        to: attendee.email,
        guestName: attendee.name,
        hostName,
        eventTypeName,
        language,
      });
    }
  }

  return { rescheduleRequest: updated };
};
