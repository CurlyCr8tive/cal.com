"use client";

import { useState } from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { TextArea } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  oneTimePassword: string;
};

export default function RescheduleRequestModal({ isOpen, onClose, bookingId, oneTimePassword }: Props) {
  const { t } = useLocale();
  const [reason, setReason] = useState("");

  const mutation = trpc.viewer.bookings.requestRescheduleAsAttendee.useMutation({
    onSuccess: () => {
      showToast(t("reschedule_request_sent"), "success");
      setReason("");
      onClose();
    },
    onError: (err) => {
      showToast(err.message || t("reschedule_request_error"), "error");
    },
  });

  const handleSubmit = () => {
    mutation.mutate({
      bookingId,
      oneTimePassword,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent title={t("request_reschedule")}>
        <div className="mt-4">
          <p className="text-subtle mb-4 text-sm">{t("reschedule_request_description")}</p>
          <TextArea
            label={t("reason_optional")}
            placeholder={t("reschedule_request_reason_placeholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="mb-6"
          />
          <div className="flex justify-end gap-2">
            <Button color="secondary" type="button" onClick={onClose} disabled={mutation.isPending}>
              {t("cancel")}
            </Button>
            <Button type="button" loading={mutation.isPending} onClick={handleSubmit}>
              {t("send_request")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
