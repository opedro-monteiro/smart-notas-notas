import type { MessageStatus } from "../../../../generated/prisma/enums.js";
import type {
  ClientModel,
  DebtModel,
  UserModel,
} from "../../../../generated/prisma/models.js";

export type DebtWithClientAndUser = DebtModel & {
  client: ClientModel & { user: UserModel };
};

export interface IMessageProvider {
  send(debt: DebtWithClientAndUser): Promise<{ status: MessageStatus }>;
}
