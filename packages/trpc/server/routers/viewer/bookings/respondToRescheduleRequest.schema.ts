import { z } from "zod";

export const ZRespondToRescheduleRequestInputSchema = z.object({
  rescheduleRequestId: z.string(),
  response: z.enum(["ACCEPTED", "DECLINED"]),
  counterProposalStartTime: z.date().optional(),
  counterProposalEndTime: z.date().optional(),
});

export type TRespondToRescheduleRequestInputSchema = z.infer<typeof ZRespondToRescheduleRequestInputSchema>;
