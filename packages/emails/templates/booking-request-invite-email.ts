import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/i18n/server";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type BookingRequestInviteEmailProps = {
  to: string;
  guestName: string;
  hostName: string;
  eventTypeName: string;
  bookingLink: string;
  expiresAt: Date;
  language: string;
};

export default class BookingRequestInviteEmail extends BaseEmail {
  private props: BookingRequestInviteEmailProps;

  constructor(props: BookingRequestInviteEmailProps) {
    super();
    this.name = "SEND_BOOKING_REQUEST_INVITE";
    this.props = props;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const t = await getTranslation(this.props.language, "common");

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.props.to,
      subject: t("booking_request_invite_subject", {
        hostName: this.props.hostName,
        eventTypeName: this.props.eventTypeName,
      }),
      html: await renderEmail("BookingRequestInviteEmail", {
        guestName: this.props.guestName,
        hostName: this.props.hostName,
        eventTypeName: this.props.eventTypeName,
        bookingLink: this.props.bookingLink,
        expiresAt: this.props.expiresAt,
        t,
      }),
    };
  }
}
