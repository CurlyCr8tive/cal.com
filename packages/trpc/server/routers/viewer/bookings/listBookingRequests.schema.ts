import { z } from "zod";

export const ZListBookingRequestsInputSchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"]).optional(),
});

export type TListBookingRequestsInputSchema = z.infer<typeof ZListBookingRequestsInputSchema>;
