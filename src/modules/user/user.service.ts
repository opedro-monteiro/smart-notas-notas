import type { CreatedUserClerkResponse } from "../webhooks/types.js";
import { createUserByClerk } from "./user.repository.js";

export async function registerUserFromClerk(payload: CreatedUserClerkResponse) {
  return createUserByClerk(payload);
}
