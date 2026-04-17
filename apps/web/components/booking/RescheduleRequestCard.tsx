"use client";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";

type Props = {
  rescheduleRequestId: string;
  guestName: string;
  originalTime: string;
  reason?: string;
  proposedTimes?: string[];
  onResponded: () => void;
};

export default function RescheduleRequestCard({
  rescheduleRequestId,
  guestName,
  originalTime,
  reason,
  proposedTimes,
  onResponded,
}: Props) {
  const { t } = useLocale();

  const mutation = trpc.viewer.bookings.respondToRescheduleRequest.useMutation({
    onSuccess: () => {
      showToast(t("reschedule_request_responded"), "success");
      onResponded();
    },
    onError: (err) => {
      showToast(err.message || t("error_updating_event"), "error");
    },
  });

  const respond = (response: "ACCEPTED" | "DECLINED") => {
    mutation.mutate({ rescheduleRequestId, response });
  };

  const isAccepting = mutation.isPending && mutation.variables?.response === "ACCEPTED";
  const isDeclining = mutation.isPending && mutation.variables?.response === "DECLINED";

  return (
    <div className="bg-muted rounded-md p-3 text-sm">
      <p className="text-emphasis font-medium">
        {t("reschedule_request_from", { name: guestName })}
      </p>
      {reason && (
        <p className="text-subtle mt-1">{reason}</p>
      )}
      {proposedTimes && proposedTimes.length > 0 && (
        <p className="text-subtle mt-1">
          {t("proposed_time")}: {dayjs(proposedTimes[0]).format("LLL")}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          color="secondary"
          loading={isDeclining}
          disabled={mutation.isPending}
          data-testid={`reschedule-request-decline-${rescheduleRequestId}`}
          onClick={() => respond("DECLINED")}>
          {t("decline")}
        </Button>
        <Button
          size="sm"
          loading={isAccepting}
          disabled={mutation.isPending}
          data-testid={`reschedule-request-accept-${rescheduleRequestId}`}
          onClick={() => respond("ACCEPTED")}>
          {t("accept")}
        </Button>
      </div>
    </div>
  );
}
