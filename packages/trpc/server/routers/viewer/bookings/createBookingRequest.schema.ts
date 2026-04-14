import { z } from "zod";

export const ZCreateBookingRequestInputSchema = z.object({
  eventTypeId: z.number(),
  email: z.string().email(),
  name: z.string().min(1),
  notes: z.string().optional(),
  startTime: z.date(),
  endTime: z.date(),
});

export type TCreateBookingRequestInputSchema = z.infer<typeof ZCreateBookingRequestInputSchema>;
