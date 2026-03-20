import { MessageChannel } from "../../../generated/prisma/enums.js";
import {
  createMessageLog,
  findMessagesByDebtId,
} from "./message.repository.js";

export async function listMessages(debtId: string) {
  return findMessagesByDebtId(debtId);
}

export async function sendMessage(data: {
  debtId: string;
  channel: MessageChannel;
  content?: string;
}) {
  return createMessageLog({
    ...data,
    status: "SENT",
    sentAt: new Date(),
  });
}
