import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/i18n/server";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type RescheduleRequestReceivedEmailProps = {
  to: string;
  hostName: string;
  guestName: string;
  eventTypeName: string;
  currentStartTime: Date;
  proposedStartTime?: Date;
  reason?: string;
  language: string;
};

export default class RescheduleRequestReceivedEmail extends BaseEmail {
  private props: RescheduleRequestReceivedEmailProps;

  constructor(props: RescheduleRequestReceivedEmailProps) {
    super();
    this.name = "SEND_RESCHEDULE_REQUEST_RECEIVED";
    this.props = props;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const t = await getTranslation(this.props.language, "common");

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.props.to,
      subject: t("reschedule_request_received_subject", {
        guestName: this.props.guestName,
        eventTypeName: this.props.eventTypeName,
      }),
      html: await renderEmail("RescheduleRequestReceivedEmail", {
        hostName: this.props.hostName,
        guestName: this.props.guestName,
        eventTypeName: this.props.eventTypeName,
        currentStartTime: this.props.currentStartTime,
        proposedStartTime: this.props.proposedStartTime,
        reason: this.props.reason,
        t,
      }),
    };
  }
}
