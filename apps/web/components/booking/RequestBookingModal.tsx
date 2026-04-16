"use client";

import { useForm } from "react-hook-form";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { TextField, TextAreaField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type FormValues = {
  recipientEmail: string;
  recipientName: string;
  notes: string;
  startTime: string;
  endTime: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  eventTypeId: number;
};

export default function RequestBookingModal({ isOpen, onClose, eventTypeId }: Props) {
  const { t } = useLocale();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>();

  const mutation = trpc.viewer.bookings.createBookingRequest.useMutation({
    onSuccess: () => {
      showToast(t("booking_request_sent"), "success");
      reset();
      onClose();
    },
    onError: (err) => {
      showToast(err.message || t("booking_request_error"), "error");
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({
      eventTypeId,
      email: data.recipientEmail,
      name: data.recipientName,
      notes: data.notes || undefined,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    });
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
            <TextField
              label={t("name")}
              placeholder={t("guest_name_placeholder")}
              {...register("recipientName", { required: t("name_required") })}
              className="mb-4"
            />
            {errors.recipientName && (
              <p className="text-error mb-4 text-sm">{errors.recipientName.message}</p>
            )}
            <TextField
              label={t("start_time")}
              type="datetime-local"
              {...register("startTime", { required: t("start_time_required") })}
              className="mb-4"
            />
            {errors.startTime && (
              <p className="text-error mb-4 text-sm">{errors.startTime.message}</p>
            )}
            <TextField
              label={t("end_time")}
              type="datetime-local"
              {...register("endTime", { required: t("end_time_required") })}
              className="mb-4"
            />
            {errors.endTime && (
              <p className="text-error mb-4 text-sm">{errors.endTime.message}</p>
            )}
            <TextAreaField
              label={t("message_optional")}
              placeholder={t("booking_request_message_placeholder")}
              {...register("notes")}
              rows={3}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button color="secondary" type="button" onClick={onClose} disabled={mutation.isPending}>
                {t("cancel")}
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                {t("send_request")}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
