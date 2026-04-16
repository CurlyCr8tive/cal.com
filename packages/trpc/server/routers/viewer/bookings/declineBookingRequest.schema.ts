import { z } from "zod";

export const ZDeclineBookingRequestInputSchema = z.object({
  token: z.string(),
});

export type TDeclineBookingRequestInputSchema = z.infer<typeof ZDeclineBookingRequestInputSchema>;
