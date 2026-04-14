import type { TRPCContext } from "../../../createContext";
import type { TCancelBookingRequestInputSchema } from "./cancelBookingRequest.schema";

type CancelBookingRequestOptions = {
  ctx: TRPCContext & { user: NonNullable<TRPCContext["user"]> };
  input: TCancelBookingRequestInputSchema;
};

export const cancelBookingRequestHandler = async ({ ctx, input }: CancelBookingRequestOptions) => {
  // TODO: Replace this stub with the full implementation from ROB_FINAL_COMPLETE_GUIDE.md
  // Steps:
  // 1. Find booking request by id + hostId (ownership check)
  // 2. Throw NOT_FOUND if missing
  // 3. Throw BAD_REQUEST if status !== "PENDING"
  // 4. Update status to "CANCELLED"
  // 5. Return { success: true }

  return { success: true };
};
