import sgMail from "@sendgrid/mail";

import { MessageStatus } from "../../../../generated/prisma/enums.js";
import type { ClientModel, DebtModel } from "../../../../generated/prisma/models.js";
import type { IMessageProvider } from "./message-provider.interface.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY ?? "");

export class EmailProvider implements IMessageProvider {
  async send(debt: DebtModel & { client: ClientModel }) {
    if (!debt.client.email) {
      throw new Error(`Client ${debt.client.id} has no email for Email channel`);
    }

    await sgMail.send({
      to: debt.client.email,
      from: process.env.SENDGRID_FROM_EMAIL ?? "",
      subject: "Lembrete de vencimento de dívida",
      text: `Olá ${debt.client.name}, sua dívida de R$${debt.amount} vence amanhã (${debt.dueDate.toLocaleDateString("pt-BR")}). Por favor, regularize seu pagamento.`,
    });

    return { status: MessageStatus.SENT };
  }
}
