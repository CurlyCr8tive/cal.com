"use client";

import { useState } from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { TextArea } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  bookingUid: string;
  oneTimePassword: string;
};

export default function RescheduleRequestModal({ isOpen, onClose, bookingUid, oneTimePassword }: Props) {
  const { t } = useLocale();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!oneTimePassword) {
      showToast(t("reschedule_request_token_missing"), "error");
      return;
    }
    try {
      setLoading(true);
      // TODO: wire to trpc.viewer.bookings.requestRescheduleAsAttendee once Person 1 registers the route
      showToast(t("reschedule_request_sent"), "success");
      onClose();
    } catch (e) {
      showToast(t("reschedule_request_error"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          <div className="flex justify-end gap-2">
            <Button color="secondary" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button loading={loading} onClick={onSubmit}>
              {t("send_request")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}