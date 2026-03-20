import { prisma } from "../../shared/plugins/prisma.js";

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
