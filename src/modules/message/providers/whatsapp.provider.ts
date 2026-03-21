import twilio from "twilio";

import { twilioStatusMap } from "../../../shared/utils/message-status-labels.js";
import type { ClientModel, DebtModel } from "../../../../generated/prisma/models.js";
import type { IMessageProvider } from "./message-provider.interface.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

export class WhatsappProvider implements IMessageProvider {
  async send(debt: DebtModel & { client: ClientModel }) {
    if (!debt.client.phone) {
      throw new Error(`Client ${debt.client.id} has no phone number for WhatsApp`);
    }

    const response = await twilioClient.messages.create({
      body: `🔔 Lembrete: sua dívida de R$${debt.amount} vence amanhã (${debt.dueDate.toLocaleDateString("pt-BR")}).`,
      from: process.env.TWILIO_WHATSAPP_NUMBER ?? "",
      to: `whatsapp:${debt.client.phone}`,
    });

    return { status: twilioStatusMap[response.status] };
  }
}
