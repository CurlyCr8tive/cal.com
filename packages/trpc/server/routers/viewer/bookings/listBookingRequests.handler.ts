import type { TRPCContext } from "../../../createContext";
import type { TListBookingRequestsInputSchema } from "./listBookingRequests.schema";

type ListBookingRequestsOptions = {
  ctx: TRPCContext & { user: NonNullable<TRPCContext["user"]> };
  input: TListBookingRequestsInputSchema;
};

export const listBookingRequestsHandler = async ({ ctx, input }: ListBookingRequestsOptions) => {
  // TODO: Replace this stub with the full implementation from ROB_FINAL_COMPLETE_GUIDE.md
  // Steps:
  // 1. Query prisma.bookingRequest.findMany where hostId = ctx.user.id
  // 2. Optionally filter by input.status
  // 3. Include eventType relation
  // 4. Order by createdAt desc
  // 5. Return { bookingRequests }

  return {
    bookingRequests: [],
  };
};
