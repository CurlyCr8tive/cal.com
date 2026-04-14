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
  // TODO: Replace this stub with the full implementation from ROB_FINAL_COMPLETE_GUIDE.md
  // Steps:
  // 1. Find RescheduleRequest by id (include booking.attendees, booking.user, booking.eventType)
  // 2. Ownership check — booking.userId must === ctx.user.id
  // 3. Throw BAD_REQUEST if status !== "PENDING"
  // 4. Update RescheduleRequest with response, counterProposal times, respondedAt
  // 5. If ACCEPTED + counterProposal → update booking startTime/endTime
  // 6. Send accepted/declined email to attendee
  // 7. Return { rescheduleRequest }

  return {
    rescheduleRequest: {
      id: input.rescheduleRequestId,
      status: input.response,
      counterProposalStartTime: input.counterProposalStartTime ?? null,
      counterProposalEndTime: input.counterProposalEndTime ?? null,
      respondedAt: new Date(),
    },
  };
};
