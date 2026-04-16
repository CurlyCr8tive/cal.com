"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { TextField, TextArea } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useForm } from "react-hook-form";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  eventTypeId: number;
};

type FormValues = {
  recipientEmail: string;
  recipientName: string;
  startTime: string;
  endTime: string;
  notes: string;
};

export default function RequestBookingModal({ isOpen, onClose, eventTypeId }: Props) {
  const { t } = useLocale();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

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

  const onSubmit = (data: FormValues) => {
    mutation.mutate({
      eventTypeId,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      notes: data.notes || undefined,
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent title={t("send_booking_request")}>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <TextField
            label={t("email")}
            type="email"
            {...register("recipientEmail", { required: true })}
            placeholder="guest@example.com"
          />
          <TextField
            label={t("name")}
            {...register("recipientName", { required: true })}
            placeholder={t("your_name")}
          />
          <TextField
            label={t("start_time")}
            type="datetime-local"
            {...register("startTime", { required: true })}
          />
          <TextField
            label={t("end_time")}
            type="datetime-local"
            {...register("endTime", { required: true })}
          />
          <div>
            <label className="text-default mb-1 block text-sm font-medium">{t("notes")}</label>
            <TextArea
              rows={3}
              placeholder={t("booking_request_notes_placeholder")}
              {...register("notes")}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button color="secondary" type="button" onClick={handleClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {t("send_request")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
