import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/i18n/server";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type RescheduleCounterProposalEmailProps = {
  to: string;
  guestName: string;
  hostName: string;
  eventTypeName: string;
  originalStartTime: Date;
  counterProposalStartTime?: Date;
  language: string;
};

export default class RescheduleCounterProposalEmail extends BaseEmail {
  private props: RescheduleCounterProposalEmailProps;

  constructor(props: RescheduleCounterProposalEmailProps) {
    super();
    this.name = "SEND_RESCHEDULE_COUNTER_PROPOSAL";
    this.props = props;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const t = await getTranslation(this.props.language, "common");

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.props.to,
      subject: t("reschedule_counter_proposal_subject", {
        hostName: this.props.hostName,
        eventTypeName: this.props.eventTypeName,
      }),
      html: await renderEmail("RescheduleCounterProposalEmail", {
        guestName: this.props.guestName,
        hostName: this.props.hostName,
        eventTypeName: this.props.eventTypeName,
        originalStartTime: this.props.originalStartTime,
        counterProposalStartTime: this.props.counterProposalStartTime,
        t,
      }),
    };
  }
}
