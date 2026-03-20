import {
  MessageChannel,
  MessageStatus,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../shared/plugins/prisma.js";
export async function findMessagesByDebtId(debtId: string) {
  return prisma.messageLog.findMany({ where: { debtId } });
}

export async function createMessageLog(data: {
  debtId: string;
  channel: MessageChannel;
  status: MessageStatus;
  content?: string;
  sentAt?: Date;
}) {
  return prisma.messageLog.create({ data });
}
