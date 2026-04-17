import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/i18n/server";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type RescheduleRequestDeclinedEmailProps = {
  to: string;
  guestName: string;
  hostName: string;
  eventTypeName: string;
  language: string;
};

export default class RescheduleRequestDeclinedEmail extends BaseEmail {
  private props: RescheduleRequestDeclinedEmailProps;

  constructor(props: RescheduleRequestDeclinedEmailProps) {
    super();
    this.name = "SEND_RESCHEDULE_REQUEST_DECLINED";
    this.props = props;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const t = await getTranslation(this.props.language, "common");

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.props.to,
      subject: t("reschedule_request_declined_subject"),
      html: await renderEmail("RescheduleRequestDeclinedEmail", {
        guestName: this.props.guestName,
        hostName: this.props.hostName,
        eventTypeName: this.props.eventTypeName,
        t,
      }),
    };
  }
}
