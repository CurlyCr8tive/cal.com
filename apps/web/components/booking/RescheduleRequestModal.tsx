"use client";

import { useState } from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { TextArea } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number;
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

  const onSubmit = () => {
    if (!oneTimePassword) {
      showToast(t("reschedule_request_token_missing"), "error");
      return;
    }
    mutation.mutate({ bookingId, oneTimePassword, reason: reason || undefined });
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent title={t("request_reschedule")}>
        <div className="mt-4">
          <p className="text-subtle mb-4 text-sm">{t("request_reschedule_description")}</p>
          <TextArea
            rows={4}
            placeholder={t("reschedule_request_reason_placeholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mb-4 w-full"
          />
          <DialogFooter>
            <Button color="secondary" onClick={handleClose}>
              {t("cancel")}
            </Button>
            <Button loading={mutation.isPending} onClick={onSubmit}>
              {t("send_request")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
