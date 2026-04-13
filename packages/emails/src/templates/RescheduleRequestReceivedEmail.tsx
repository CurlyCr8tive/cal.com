import type { TFunction } from "i18next";

import { BaseEmailHtml } from "../components";

export type RescheduleRequestReceivedEmailProps = {
  hostName: string;
  guestName: string;
  eventTypeName: string;
  currentStartTime: Date;
  proposedStartTime?: Date;
  reason?: string;
  t: TFunction;
};

export const RescheduleRequestReceivedEmail = (props: RescheduleRequestReceivedEmailProps) => {
  const { hostName, guestName, eventTypeName, currentStartTime, proposedStartTime, reason, t } = props;

  const formatDateTime = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <BaseEmailHtml
      subject={t("reschedule_request_received_subject", { guestName, eventTypeName })}>
      <p>
        {t("hi_user_name", { name: hostName }) || `Hi ${hostName},`}
      </p>
      <p>
        {t("reschedule_request_received_body", {
          guestName,
          eventTypeName,
        })}
      </p>
      <div style={{ padding: "12px", backgroundColor: "#f3f4f6", borderRadius: "8px", margin: "16px 0" }}>
        <p style={{ margin: "4px 0" }}>
          <strong>Current time:</strong> {formatDateTime(currentStartTime)}
        </p>
        {proposedStartTime && (
          <p style={{ margin: "4px 0" }}>
            <strong>Proposed new time:</strong> {formatDateTime(proposedStartTime)}
          </p>
        )}
        {reason && (
          <p style={{ margin: "4px 0" }}>
            <strong>Reason:</strong> {reason}
          </p>
        )}
      </div>
    </BaseEmailHtml>
  );
};
