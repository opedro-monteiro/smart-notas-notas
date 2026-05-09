import type { MessageStatus } from "../../../../generated/prisma/enums.js";
import type { DebtReminderContext } from "../../../shared/utils/resolve-reminder-message.js";

export type DebtWithClientAndUser = DebtReminderContext;

export interface IMessageProvider {
  send(
    debt: DebtWithClientAndUser,
  ): Promise<{ status: MessageStatus; content: string }>;
}
