import { z } from "zod";

export const ZGetBookingRequestByTokenInputSchema = z.object({
  token: z.string(),
});

export type TGetBookingRequestByTokenInputSchema = z.infer<typeof ZGetBookingRequestByTokenInputSchema>;
