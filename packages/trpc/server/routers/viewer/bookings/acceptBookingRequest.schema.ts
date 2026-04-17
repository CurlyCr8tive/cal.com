import { z } from "zod";

export const ZAcceptBookingRequestInputSchema = z.object({
  token: z.string(),
  timeZone: z.string().default("UTC"),
});

export type TAcceptBookingRequestInputSchema = z.infer<typeof ZAcceptBookingRequestInputSchema>;
