import { z } from "zod";

export const ZRequestRescheduleAsAttendeeInputSchema = z.object({
  bookingId: z.string(),
  oneTimePassword: z.string(),
  proposedStartTime: z.date().optional(),
  proposedEndTime: z.date().optional(),
  reason: z.string().optional(),
});

export type TRequestRescheduleAsAttendeeInputSchema = z.infer<typeof ZRequestRescheduleAsAttendeeInputSchema>;
