import sgMail from "@sendgrid/mail";

import { MessageStatus } from "../../../../generated/prisma/enums.js";
import type { DebtWithClientAndUser, IMessageProvider } from "./message-provider.interface.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY ?? "");

export class EmailProvider implements IMessageProvider {
  async send(debt: DebtWithClientAndUser) {
    if (!debt.client.email) {
      throw new Error(`Client ${debt.client.id} has no email for Email channel`);
    }

    const { companyName, fullName } = debt.client.user;
    const sender = companyName ?? fullName ?? "SmartNotas";
    const text = companyName
      ? `Essa é uma mensagem automatica da SmartNotas. Sr(a) ${debt.client.name} possui uma dívida no valor de R$${debt.amount} reais, com a empresa ${sender}, que vence amanhã. Por favor, regularize seu pagamento ou entre em contato para mais informações.`
      : `Essa é uma mensagem automatica da SmartNotas. Sr(a) ${debt.client.name} possui uma dívida no valor de R$${debt.amount} reais, com o ${sender}, que vence amanhã. Por favor, regularize seu pagamento ou entre em contato para mais informações.`;

    await sgMail.send({
      to: debt.client.email,
      from: process.env.SENDGRID_FROM_EMAIL ?? "",
      subject: "Lembrete de vencimento de dívida",
      text,
    });

    return { status: MessageStatus.SENT };
  }
}
