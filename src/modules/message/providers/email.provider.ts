import sgMail from "@sendgrid/mail";

import { MessageStatus } from "../../../../generated/prisma/enums.js";
import { resolveTextChannelBody } from "../../../shared/utils/resolve-reminder-message.js";
import type { DebtWithClientAndUser, IMessageProvider } from "./message-provider.interface.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY ?? "");

export class EmailProvider implements IMessageProvider {
  async send(debt: DebtWithClientAndUser) {
    if (!debt.client.email) {
      throw new Error(`Client ${debt.client.id} has no email for Email channel`);
    }

    const text = resolveTextChannelBody(debt);

    await sgMail.send({
      to: debt.client.email,
      from: process.env.SENDGRID_FROM_EMAIL ?? "",
      subject: "Lembrete de vencimento de dívida",
      text,
    });

    return { status: MessageStatus.SENT, content: text };
  }
}
