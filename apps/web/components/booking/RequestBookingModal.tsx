"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { TextArea, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useForm } from "react-hook-form";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  eventTypeId?: number;
  eventTypeOptions?: { id: number; label: string }[];
};

type FormValues = {
  eventTypeId?: string;
  email: string;
  name: string;
  startTime: string;
  endTime: string;
  notes: string;
};

export default function RequestBookingModal({ isOpen, onClose, eventTypeId, eventTypeOptions }: Props) {
  const { t } = useLocale();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      eventTypeId:
        eventTypeId !== undefined
          ? String(eventTypeId)
          : eventTypeOptions && eventTypeOptions.length === 1
            ? String(eventTypeOptions[0].id)
            : undefined,
    },
  });

  const selectedEventTypeId =
    eventTypeId ?? (eventTypeOptions && eventTypeOptions.length === 1 ? eventTypeOptions[0].id : undefined);

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
    const resolvedEventTypeId = selectedEventTypeId ?? Number(data.eventTypeId);

    if (!resolvedEventTypeId) {
      showToast(t("please_select_event_type_first"), "error");
      return;
    }

    mutation.mutate({
      eventTypeId: resolvedEventTypeId,
      email: data.email,
      name: data.name,
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
          {eventTypeId === undefined && eventTypeOptions && eventTypeOptions.length > 0 && (
            <div>
              <label className="text-default mb-1 block text-sm font-medium" htmlFor="eventTypeId">
                {t("event_type")}
              </label>
              <select
                id="eventTypeId"
                className="border-default bg-default text-default focus:ring-brand-default block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                {...register("eventTypeId", { required: true })}>
                <option value="">{t("event_type")}</option>
                {eventTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.eventTypeId && (
                <p className="mt-1 text-sm text-error">{t("please_select_event_type_first")}</p>
              )}
            </div>
          )}
          <TextField
            label={t("email")}
            type="email"
            {...register("email", { required: true })}
            placeholder="guest@example.com"
          />
          <TextField
            label={t("name")}
            {...register("name", { required: true })}
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
          <DialogFooter noSticky>
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
