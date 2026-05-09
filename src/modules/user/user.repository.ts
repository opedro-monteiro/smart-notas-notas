import { prisma } from "../../shared/plugins/prisma.js";
import type { CreatedUserClerkResponse } from "../webhooks/types.js";

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function upsertUser(data: {
  id: string;
  email: string;
  username?: string | null;
  fullName?: string | null;
  imageUrl?: string | null;
}) {
  return prisma.user.upsert({
    where: { id: data.id },
    create: data,
    update: data,
  });
}

export async function createUserByClerk({ data }: CreatedUserClerkResponse) {
  return prisma.user.create({
    data: {
      id: data.id,
      username: data.username as string | null,
      fullName: `${data.first_name} ${data.last_name}`,
      email: data.email_addresses[0].email_address,
      imageUrl: data.image_url,
    },
  });
}
