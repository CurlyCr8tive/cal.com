import type { TFunction } from "i18next";

import { BaseEmailHtml } from "../components";

export type BookingRequestExpiredEmailProps = {
  guestName: string;
  hostName: string;
  eventTypeName: string;
  t: TFunction;
};

export const BookingRequestExpiredEmail = (props: BookingRequestExpiredEmailProps) => {
  const { guestName, hostName, eventTypeName, t } = props;

  return (
    <BaseEmailHtml subject={t("booking_request_expired_subject")}>
      <p>
        {t("hi_user_name", { name: guestName }) || `Hi ${guestName},`}
      </p>
      <p>
        {t("booking_request_expired_body", {
          hostName,
          eventTypeName,
        })}
      </p>
    </BaseEmailHtml>
  );
};
