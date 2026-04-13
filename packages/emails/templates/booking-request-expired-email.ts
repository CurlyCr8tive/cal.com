import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/i18n/server";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type BookingRequestExpiredEmailProps = {
  to: string;
  guestName: string;
  hostName: string;
  eventTypeName: string;
  language: string;
};

export default class BookingRequestExpiredEmail extends BaseEmail {
  private props: BookingRequestExpiredEmailProps;

  constructor(props: BookingRequestExpiredEmailProps) {
    super();
    this.name = "SEND_BOOKING_REQUEST_EXPIRED";
    this.props = props;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const t = await getTranslation(this.props.language, "common");

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.props.to,
      subject: t("booking_request_expired_subject"),
      html: await renderEmail("BookingRequestExpiredEmail", {
        guestName: this.props.guestName,
        hostName: this.props.hostName,
        eventTypeName: this.props.eventTypeName,
        t,
      }),
    };
  }
}
