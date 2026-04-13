import type { TFunction } from "i18next";

import { BaseEmailHtml } from "../components";

export type RescheduleRequestAcceptedEmailProps = {
  guestName: string;
  hostName: string;
  eventTypeName: string;
  originalStartTime: Date;
  newStartTime?: Date;
  t: TFunction;
};

export const RescheduleRequestAcceptedEmail = (props: RescheduleRequestAcceptedEmailProps) => {
  const { guestName, hostName, eventTypeName, originalStartTime, newStartTime, t } = props;

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
    <BaseEmailHtml subject={t("reschedule_request_accepted_subject")}>
      <p>
        {t("hi_user_name", { name: guestName }) || `Hi ${guestName},`}
      </p>
      <p>
        {t("reschedule_request_accepted_body", {
          eventTypeName,
          hostName,
        })}
      </p>
      <div style={{ padding: "12px", backgroundColor: "#f3f4f6", borderRadius: "8px", margin: "16px 0" }}>
        <p style={{ margin: "4px 0", textDecoration: "line-through", color: "#888888" }}>
          <strong>Original time:</strong> {formatDateTime(originalStartTime)}
        </p>
        {newStartTime && (
          <p style={{ margin: "4px 0" }}>
            <strong>New time:</strong> {formatDateTime(newStartTime)}
          </p>
        )}
      </div>
    </BaseEmailHtml>
  );
};
