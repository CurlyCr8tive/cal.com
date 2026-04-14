"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

type Props = {
  rescheduleRequestUid: string;
  guestName: string;
  originalTime: string;
  reason?: string;
  proposedTimes?: string[];
  onResponded: () => void;
};

export default function RescheduleRequestCard({
  rescheduleRequestUid,
  guestName,
  originalTime,
  reason,
  proposedTimes,
  onResponded,
}: Props) {
  const { t } = useLocale();
  const [loading, setLoading] = useState<"ACCEPT" | "DECLINE" | null>(null);

  const handleAction = async (action: "ACCEPT" | "DECLINE") => {
    try {
      setLoading(action);
      // TODO: wire to trpc.viewer.bookings.respondToRescheduleRequest once Person 1 registers the route
      showToast(
        action === "ACCEPT" ? t("reschedule_request_accepted") : t("reschedule_request_declined"),
        "success"
      );
      onResponded();
    } catch (e) {
      showToast(t("reschedule_request_error"), "error");
    } finally {
      setLoading(null);
    }
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
          loading={loading === "ACCEPT"}
          disabled={!!loading}
          onClick={() => handleAction("ACCEPT")}>
          {t("accept")}
        </Button>
        <Button
          color="secondary"
          loading={loading === "DECLINE"}
          disabled={!!loading}
          onClick={() => handleAction("DECLINE")}>
          {t("decline")}
        </Button>
      </div>
    </div>
  );
}
