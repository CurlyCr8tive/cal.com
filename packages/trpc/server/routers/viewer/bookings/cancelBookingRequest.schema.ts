import { z } from "zod";

export const ZCancelBookingRequestInputSchema = z.object({
  bookingRequestId: z.string(),
});

export type TCancelBookingRequestInputSchema = z.infer<typeof ZCancelBookingRequestInputSchema>;
