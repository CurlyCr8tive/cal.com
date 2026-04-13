import type { TFunction } from "i18next";

import { BaseEmailHtml } from "../components";

export type RescheduleCounterProposalEmailProps = {
  guestName: string;
  hostName: string;
  eventTypeName: string;
  originalStartTime: Date;
  counterProposalStartTime?: Date;
  t: TFunction;
};

export const RescheduleCounterProposalEmail = (props: RescheduleCounterProposalEmailProps) => {
  const { guestName, hostName, eventTypeName, originalStartTime, counterProposalStartTime, t } = props;

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
      subject={t("reschedule_counter_proposal_subject", { hostName, eventTypeName })}>
      <p>
        {t("hi_user_name", { name: guestName }) || `Hi ${guestName},`}
      </p>
      <p>
        {t("reschedule_counter_proposal_body", {
          hostName,
          eventTypeName,
        })}
      </p>
      <div style={{ padding: "12px", backgroundColor: "#f3f4f6", borderRadius: "8px", margin: "16px 0" }}>
        <p style={{ margin: "4px 0", textDecoration: "line-through", color: "#888888" }}>
          <strong>Original time:</strong> {formatDateTime(originalStartTime)}
        </p>
        {counterProposalStartTime && (
          <p style={{ margin: "4px 0" }}>
            <strong>Proposed new time:</strong> {formatDateTime(counterProposalStartTime)}
          </p>
        )}
      </div>
    </BaseEmailHtml>
  );
};
