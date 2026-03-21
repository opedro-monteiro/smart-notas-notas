import twilio from "twilio";

import { twilioStatusMap } from "../../../shared/utils/message-status-labels.js";
import type { DebtWithClientAndUser, IMessageProvider } from "./message-provider.interface.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

export class SmsProvider implements IMessageProvider {
  async send(debt: DebtWithClientAndUser) {
    if (!debt.client.phone) {
      throw new Error(`Client ${debt.client.id} has no phone number for SMS`);
    }

    const { companyName, fullName } = debt.client.user;
    const sender = companyName ?? fullName ?? "SmartNotas";
    const body = companyName
      ? `Essa é uma mensagem automatica da SmartNotas. Sr(a) ${debt.client.name} possui uma dívida no valor de R$${debt.amount} reais, com a empresa ${sender}, que vence amanhã. Por favor, regularize seu pagamento ou entre em contato para mais informações.`
      : `Essa é uma mensagem automatica da SmartNotas. Sr(a) ${debt.client.name} possui uma dívida no valor de R$${debt.amount} reais, com o ${sender}, que vence amanhã. Por favor, regularize seu pagamento ou entre em contato para mais informações.`;

    const response = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER ?? "",
      to: debt.client.phone,
    });

    return { status: twilioStatusMap[response.status] };
  }
}
