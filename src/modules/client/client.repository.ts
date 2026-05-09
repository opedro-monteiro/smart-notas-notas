import { prisma } from "../../shared/plugins/prisma.js";
import type { CreateClientDTO, UpdateClientDTO } from "./client.schema.js";

function normalizeReminderTemplateInput(
  v: string | null | undefined,
): string | null {
  if (v === null || v === undefined || v === "") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export async function findClientsByUserId(userId: string) {
  return prisma.client.findMany({ where: { userId } });
}

export async function findClientById(id: string) {
  return prisma.client.findUnique({ where: { id } });
}

export async function createClient(userId: string, data: CreateClientDTO) {
  return prisma.client.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      userId,
      reminderMessageTemplate: normalizeReminderTemplateInput(
        data.reminderMessageTemplate,
      ),
    },
  });
}

export async function updateClient(id: string, data: UpdateClientDTO) {
  const payload: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    reminderMessageTemplate?: string | null;
  } = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.phone !== undefined)
    payload.phone = data.phone && data.phone.trim() !== "" ? data.phone : null;
  if (data.email !== undefined)
    payload.email = data.email && data.email.trim() !== "" ? data.email : null;
  if (data.reminderMessageTemplate !== undefined) {
    payload.reminderMessageTemplate = normalizeReminderTemplateInput(
      data.reminderMessageTemplate,
    );
  }
  return prisma.client.update({ where: { id }, data: payload });
}

export async function deleteClient(id: string) {
  return prisma.client.delete({ where: { id } });
}
