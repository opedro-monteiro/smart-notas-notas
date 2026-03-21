import twilio from "twilio";
import type { CallInstance } from "twilio/lib/rest/api/v2010/account/call.js";

import { MessageStatus } from "../../../../generated/prisma/enums.js";
import type { ClientModel, DebtModel } from "../../../../generated/prisma/models.js";
import type { IMessageProvider } from "./message-provider.interface.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

type CallStatus = CallInstance["status"];

const callStatusMap: Record<CallStatus, MessageStatus> = {
  queued: MessageStatus.QUEUED,
  ringing: MessageStatus.SENDING,
  "in-progress": MessageStatus.SENDING,
  completed: MessageStatus.DELIVERED,
  busy: MessageStatus.FAILED,
  failed: MessageStatus.FAILED,
  "no-answer": MessageStatus.FAILED,
  canceled: MessageStatus.CANCELED,
};

export class CallProvider implements IMessageProvider {
  async send(debt: DebtModel & { client: ClientModel }) {
    if (!debt.client.phone) {
      throw new Error(`Client ${debt.client.id} has no phone number for Call`);
    }

    const twiml = `<Response><Say language="pt-BR">Olá. Você possui uma dívida de ${debt.amount} reais que vence amanhã. Por favor, regularize seu pagamento.</Say></Response>`;

    const response = await twilioClient.calls.create({
      twiml,
      from: process.env.TWILIO_PHONE_NUMBER ?? "",
      to: debt.client.phone,
    });

    return { status: callStatusMap[response.status] };
  }
}
