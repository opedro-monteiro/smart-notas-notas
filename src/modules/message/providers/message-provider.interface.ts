import type { ClientModel, DebtModel } from "../../../../generated/prisma/models.js";
import type { MessageStatus } from "../../../../generated/prisma/enums.js";

export interface IMessageProvider {
  send(debt: DebtModel & { client: ClientModel }): Promise<{ status: MessageStatus }>;
}
