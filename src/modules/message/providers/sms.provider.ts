import twilio from "twilio";

import { twilioStatusMap } from "../../../shared/utils/message-status-labels.js";
import { resolveTextChannelBody } from "../../../shared/utils/resolve-reminder-message.js";
import type {
  DebtWithClientAndUser,
  IMessageProvider,
} from "./message-provider.interface.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

export class SmsProvider implements IMessageProvider {
  async send(debt: DebtWithClientAndUser) {
    if (!debt.client.phone) {
      throw new Error(`Client ${debt.client.id} has no phone number for SMS`);
    }

    const body = resolveTextChannelBody(debt);

    const response = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER ?? "",
      to: debt.client.phone,
    });

    return {
      status: twilioStatusMap[response.status],
      content: body,
    };
  }
}
