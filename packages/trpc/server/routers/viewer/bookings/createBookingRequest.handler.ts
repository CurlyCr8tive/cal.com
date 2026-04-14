import type { TRPCContext } from "../../../createContext";
import type { TCreateBookingRequestInputSchema } from "./createBookingRequest.schema";

type CreateBookingRequestOptions = {
  ctx: TRPCContext & { user: NonNullable<TRPCContext["user"]> };
  input: TCreateBookingRequestInputSchema;
};

export const createBookingRequestHandler = async ({ ctx, input }: CreateBookingRequestOptions) => {
  // TODO: Replace this stub with the full implementation from ROB_FINAL_COMPLETE_GUIDE.md
  // Steps:
  // 1. Ownership check — verify ctx.user owns the eventTypeId
  // 2. Duplicate check — no existing PENDING request for same guestEmail + eventTypeId
  // 3. Generate hashed link via HashedLinkService
  // 4. Create BookingRequest record in DB
  // 5. Send booking request invite email
  // 6. Return { bookingRequest }

  return {
    bookingRequest: {
      id: "stub-id",
      eventTypeId: input.eventTypeId,
      hostId: ctx.user.id,
      guestEmail: input.email,
      guestName: input.name,
      notes: input.notes ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      status: "PENDING",
      hashedLinkToken: "stub-token",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    },
  };
};
