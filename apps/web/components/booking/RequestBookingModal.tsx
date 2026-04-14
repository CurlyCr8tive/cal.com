"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { TextField, TextAreaField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type FormValues = {
  recipientEmail: string;
  message: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  eventTypeId: number;
};

export default function RequestBookingModal({ isOpen, onClose, eventTypeId }: Props) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>();

  const onSubmit = handleSubmit(async (data) => {
    try {
      setLoading(true);
      // TODO: wire to trpc.viewer.bookings.createBookingRequest once Person 1 registers the route
      showToast(t("booking_request_sent"), "success");
      reset();
      onClose();
    } catch (e) {
      showToast(t("booking_request_error"), "error");
    } finally {
      setLoading(false);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent title={t("request_booking")}>
        <div className="mt-4">
          <p className="text-subtle mb-4 text-sm">{t("request_booking_description")}</p>
          <form onSubmit={onSubmit}>
            <TextField
              label={t("recipient_email")}
              type="email"
              placeholder="guest@example.com"
              {...register("recipientEmail", {
                required: t("email_required"),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t("email_invalid"),
                },
              })}
              className="mb-4"
            />
            {errors.recipientEmail && (
              <p className="text-error mb-4 text-sm">{errors.recipientEmail.message}</p>
            )}
            <TextAreaField
              label={t("message_optional")}
              placeholder={t("booking_request_message_placeholder")}
              {...register("message")}
              rows={4}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button color="secondary" type="button" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button type="submit" loading={loading}>
                {t("send_request")}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
