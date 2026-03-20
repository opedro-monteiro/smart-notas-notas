import { clerkClient } from "@clerk/fastify";

export async function getAuthenticatedUser(userId: string) {
  return clerkClient.users.getUser(userId);
}
