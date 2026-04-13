import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/i18n/server";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type RescheduleRequestAcceptedEmailProps = {
  to: string;
  guestName: string;
  hostName: string;
  eventTypeName: string;
  originalStartTime: Date;
  newStartTime?: Date;
  language: string;
};

export default class RescheduleRequestAcceptedEmail extends BaseEmail {
  private props: RescheduleRequestAcceptedEmailProps;

  constructor(props: RescheduleRequestAcceptedEmailProps) {
    super();
    this.name = "SEND_RESCHEDULE_REQUEST_ACCEPTED";
    this.props = props;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const t = await getTranslation(this.props.language, "common");

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.props.to,
      subject: t("reschedule_request_accepted_subject"),
      html: await renderEmail("RescheduleRequestAcceptedEmail", {
        guestName: this.props.guestName,
        hostName: this.props.hostName,
        eventTypeName: this.props.eventTypeName,
        originalStartTime: this.props.originalStartTime,
        newStartTime: this.props.newStartTime,
        t,
      }),
    };
  }
}
