import type { RouterInputs, RouterOutputs } from "@calcom/trpc/react";

export type BookingListingStatus = NonNullable<
  RouterInputs["viewer"]["bookings"]["get"]["filters"]["statuses"]
>[number];

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

export type PendingRescheduleRequest = {
  id: string;
  reason?: string | null;
  proposedStartTime?: Date | null;
  proposedEndTime?: Date | null;
  guestName: string;
};

export type BookingItemProps = BookingItem & {
  listingStatus: BookingListingStatus;
  recurringInfo: RouterOutputs["viewer"]["bookings"]["get"]["recurringInfo"][number] | undefined;
  loggedInUser: {
    userId: number | undefined;
    userTimeZone: string | undefined;
    userTimeFormat: number | null | undefined;
    userEmail: string | undefined;
  };
  isToday: boolean;
  onClick?: () => void;
  pendingRescheduleRequest?: PendingRescheduleRequest;
};
