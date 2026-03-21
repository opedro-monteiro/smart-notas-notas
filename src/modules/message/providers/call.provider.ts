import twilio from "twilio";

import { MessageStatus } from "../../../../generated/prisma/enums.js";
import { twilioStatusMap } from "../../../shared/utils/message-status-labels.js";
import type { ClientModel, DebtModel } from "../../../../generated/prisma/models.js";
import type { IMessageProvider } from "./message-provider.interface.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

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

    // Call statuses overlap with message statuses for common values; cast via shared map or fallback
    const mappedStatus = twilioStatusMap[response.status as keyof typeof twilioStatusMap];
    return { status: mappedStatus ?? MessageStatus.QUEUED };
  }
}
