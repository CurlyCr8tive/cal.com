import type { TFunction } from "i18next";

import { BaseEmailHtml } from "../components";

export type RescheduleRequestDeclinedEmailProps = {
  guestName: string;
  hostName: string;
  eventTypeName: string;
  t: TFunction;
};

export const RescheduleRequestDeclinedEmail = (props: RescheduleRequestDeclinedEmailProps) => {
  const { guestName, hostName, eventTypeName, t } = props;

  return (
    <BaseEmailHtml subject={t("reschedule_request_declined_subject")}>
      <p>
        {t("hi_user_name", { name: guestName }) || `Hi ${guestName},`}
      </p>
      <p>
        {t("reschedule_request_declined_body", {
          eventTypeName,
          hostName,
        })}
      </p>
    </BaseEmailHtml>
  );
};
