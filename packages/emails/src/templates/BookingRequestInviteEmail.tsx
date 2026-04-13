import type { TFunction } from "i18next";

import { CallToAction, CallToActionTable } from "../components";
import { BaseEmailHtml } from "../components";

export type BookingRequestInviteEmailProps = {
  guestName: string;
  hostName: string;
  eventTypeName: string;
  bookingLink: string;
  expiresAt: Date;
  t: TFunction;
};

export const BookingRequestInviteEmail = (props: BookingRequestInviteEmailProps) => {
  const { guestName, hostName, eventTypeName, bookingLink, expiresAt, t } = props;
  const expiresAtFormatted = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <BaseEmailHtml subject={t("booking_request_invite_subject", { hostName, eventTypeName })}>
      <p>
        {t("hi_user_name", { name: guestName }) || `Hi ${guestName},`}
      </p>
      <p>
        {t("booking_request_invite_body", {
          hostName,
          eventTypeName,
          expiresAt: expiresAtFormatted,
        })}
      </p>
      <CallToActionTable>
        <CallToAction label="Book your time" href={bookingLink} endIconName="linkIcon" />
      </CallToActionTable>
      <p style={{ color: "#888888", fontSize: "12px", marginTop: "16px" }}>
        This link expires on {expiresAtFormatted}.
      </p>
    </BaseEmailHtml>
  );
};
