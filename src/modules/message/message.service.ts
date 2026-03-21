import twilio from "twilio";

import { MessageChannel } from "../../../generated/prisma/enums.js";
import { twilioStatusMap } from "../../shared/utils/message-status-labels.js";
import {
  createMessageLog,
  findMessagesByDebtId,
} from "./message.repository.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.PHONE_NUMBER;
const client = twilio(accountSid, authToken);

export async function listMessages(debtId: string) {
  return findMessagesByDebtId(debtId);
}

export async function sendMessage(data: {
  debtId: string;
  channel: MessageChannel;
  content?: string;
}) {
  const twilloResponse = await client.messages.create({
    body: data.content,
    from: phoneNumber,
    to: "+18777804236",
  });

  return createMessageLog({
    ...data,
    status: twilioStatusMap[twilloResponse.status],
    sentAt: new Date(),
  });
}
