"use client";

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
    onSuccess: (_, variables) => {
      showToast(
        variables.response === "ACCEPTED"
          ? t("reschedule_request_accepted")
          : t("reschedule_request_declined"),
        "success"
      );
      onResponded();
    },
    onError: (err) => {
      showToast(err.message || t("reschedule_request_error"), "error");
    },
  });

  const handleAction = (action: "ACCEPTED" | "DECLINED") => {
    mutation.mutate({
      rescheduleRequestId,
      response: action,
    });
  };

  return (
    <div className="border-subtle bg-default rounded-md border p-4">
      <div className="mb-3">
        <p className="text-emphasis font-semibold">{t("reschedule_request_from", { name: guestName })}</p>
        <p className="text-subtle text-sm">{t("original_time", { time: originalTime })}</p>
      </div>

      {reason && (
        <div className="mb-3">
          <p className="text-default text-sm font-medium">{t("reason")}</p>
          <p className="text-subtle text-sm">{reason}</p>
        </div>
      )}

      {proposedTimes && proposedTimes.length > 0 && (
        <div className="mb-3">
          <p className="text-default text-sm font-medium">{t("proposed_times")}</p>
          <ul className="text-subtle list-disc pl-4 text-sm">
            {proposedTimes.map((time, i) => (
              <li key={i}>{time}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          color="primary"
          loading={mutation.isPending && mutation.variables?.response === "ACCEPTED"}
          disabled={mutation.isPending}
          onClick={() => handleAction("ACCEPTED")}>
          {t("accept")}
        </Button>
        <Button
          color="secondary"
          loading={mutation.isPending && mutation.variables?.response === "DECLINED"}
          disabled={mutation.isPending}
          onClick={() => handleAction("DECLINED")}>
          {t("decline")}
        </Button>
      </div>
    </div>
  );
}
