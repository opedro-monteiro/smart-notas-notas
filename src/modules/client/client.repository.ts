import { prisma } from "../../shared/plugins/prisma.js";
import type { CreateClientDTO } from "./client.schema.js";

export async function findClientsByUserId(userId: string) {
  return prisma.client.findMany({ where: { userId } });
}

export async function findClientById(id: string) {
  return prisma.client.findUnique({ where: { id } });
}

export async function createClient(userId: string, data: CreateClientDTO) {
  return prisma.client.create({ data: { ...data, userId } });
}

export async function deleteClient(id: string) {
  return prisma.client.delete({ where: { id } });
}
