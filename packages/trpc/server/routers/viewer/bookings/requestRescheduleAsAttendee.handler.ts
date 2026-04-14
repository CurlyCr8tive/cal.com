import type { TRequestRescheduleAsAttendeeInputSchema } from "./requestRescheduleAsAttendee.schema";

type RequestRescheduleAsAttendeeOptions = {
  input: TRequestRescheduleAsAttendeeInputSchema;
};

export const requestRescheduleAsAttendeeHandler = async ({ input }: RequestRescheduleAsAttendeeOptions) => {
  // TODO: Replace this stub with the full implementation from ROB_FINAL_COMPLETE_GUIDE.md
  // NOTE: This route has NO ctx.user — the guest authenticates via oneTimePassword (base64 token)
  // Steps:
  // 1. Find booking by bookingId (include attendees, user, eventType)
  // 2. Decode oneTimePassword (base64 -> "email:xxx") and validate attendee
  // 3. Check no existing PENDING reschedule request for this bookingId
  // 4. Create RescheduleRequest record
  // 5. Send reschedule request received email to host
  // 6. Return { rescheduleRequest }

  return {
    rescheduleRequest: {
      id: "stub-reschedule-id",
      bookingId: input.bookingId,
      initiator: "ATTENDEE",
      proposedStartTime: input.proposedStartTime ?? null,
      proposedEndTime: input.proposedEndTime ?? null,
      reason: input.reason ?? null,
      status: "PENDING",
      createdAt: new Date(),
    },
  };
};
