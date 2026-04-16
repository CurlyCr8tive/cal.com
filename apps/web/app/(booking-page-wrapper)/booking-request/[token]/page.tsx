"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";

export default function BookingRequestPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLocale();
  const token = params?.token as string;

  const [state, setState] = useState<"idle" | "accepted" | "declined">("idle");

  const { data, isLoading, error } = trpc.viewer.bookings.getBookingRequestByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const acceptMutation = trpc.viewer.bookings.acceptBookingRequest.useMutation({
    onSuccess: (result) => {
      setState("accepted");
      // After a short delay, navigate to the booking confirmation page with the token
      setTimeout(() => {
        router.push(`/booking/${result.bookingUid}?token=${result.oneTimePassword}`);
      }, 2000);
    },
  });

  const declineMutation = trpc.viewer.bookings.declineBookingRequest.useMutation({
    onSuccess: () => setState("declined"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-subtle text-sm">{t("loading")}</div>
      </div>
    );
  }

  if (error || !data) {
    const message =
      error?.data?.code === "NOT_FOUND"
        ? t("booking_request_not_found")
        : error?.data?.code === "BAD_REQUEST"
          ? t("booking_request_expired")
          : t("error_booking_request");

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="bg-default border-subtle mx-auto max-w-md rounded-lg border p-8 text-center shadow-sm">
          <div className="bg-error mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <span className="text-white text-xl">✕</span>
          </div>
          <h1 className="text-emphasis mb-2 text-xl font-semibold">{message}</h1>
        </div>
      </div>
    );
  }

  if (state === "accepted") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="bg-default border-subtle mx-auto max-w-md rounded-lg border p-8 text-center shadow-sm">
          <div className="bg-success mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <span className="text-white text-xl">✓</span>
          </div>
          <h1 className="text-emphasis mb-2 text-xl font-semibold">{t("booking_request_accepted")}</h1>
          <p className="text-subtle text-sm">{t("booking_request_accepted_description")}</p>
        </div>
      </div>
    );
  }

  if (state === "declined") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="bg-default border-subtle mx-auto max-w-md rounded-lg border p-8 text-center shadow-sm">
          <div className="bg-subtle mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <span className="text-emphasis text-xl">✕</span>
          </div>
          <h1 className="text-emphasis mb-2 text-xl font-semibold">{t("booking_request_declined")}</h1>
          <p className="text-subtle text-sm">{t("booking_request_declined_description")}</p>
        </div>
      </div>
    );
  }

  const { bookingRequest } = data;
  const alreadyResponded = bookingRequest.status !== "PENDING";

  const timeZone = dayjs.tz.guess();
  const startTime = dayjs(bookingRequest.startTime).tz(timeZone);
  const endTime = dayjs(bookingRequest.endTime).tz(timeZone);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="bg-default border-subtle mx-auto w-full max-w-md rounded-lg border shadow-sm">
        {/* Header */}
        <div className="border-subtle border-b px-8 py-6">
          <h1 className="text-emphasis text-xl font-semibold">
            {t("booking_request_invite_title", { hostName: bookingRequest.host.name ?? bookingRequest.host.email })}
          </h1>
          <p className="text-subtle mt-1 text-sm">{t("booking_request_invite_subtitle")}</p>
        </div>

        {/* Details */}
        <div className="space-y-4 px-8 py-6">
          {/* Event type */}
          <div>
            <p className="text-subtle text-xs font-medium uppercase tracking-wide">{t("event_type")}</p>
            <p className="text-emphasis mt-1 font-medium">{bookingRequest.eventType.title}</p>
          </div>

          {/* Proposed time */}
          <div>
            <p className="text-subtle text-xs font-medium uppercase tracking-wide">
              {t("proposed_meeting_time")}
            </p>
            <p className="text-emphasis mt-1 font-medium">{startTime.format("dddd, MMMM D, YYYY")}</p>
            <p className="text-default mt-0.5 text-sm">
              {startTime.format("h:mm A")} – {endTime.format("h:mm A")} ({timeZone})
            </p>
          </div>

          {/* Notes */}
          {bookingRequest.notes && (
            <div>
              <p className="text-subtle text-xs font-medium uppercase tracking-wide">{t("additional_notes")}</p>
              <p className="text-default mt-1 text-sm">{bookingRequest.notes}</p>
            </div>
          )}

          {/* Invited as */}
          <div>
            <p className="text-subtle text-xs font-medium uppercase tracking-wide">{t("invited_as")}</p>
            <p className="text-default mt-1 text-sm">{bookingRequest.guestEmail}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-subtle border-t px-8 py-5">
          {alreadyResponded ? (
            <p className="text-subtle text-center text-sm">
              {t("booking_request_already_responded")}
            </p>
          ) : (
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => acceptMutation.mutate({ token, timeZone })}
                loading={acceptMutation.isPending}
                disabled={declineMutation.isPending}>
                {acceptMutation.isPending ? t("accepting_booking") : t("accept_booking")}
              </Button>
              <Button
                className="flex-1"
                color="secondary"
                onClick={() => declineMutation.mutate({ token })}
                loading={declineMutation.isPending}
                disabled={acceptMutation.isPending}>
                {declineMutation.isPending ? t("declining_booking") : t("decline_booking")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
