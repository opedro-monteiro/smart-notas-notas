import { prisma } from "../../shared/plugins/prisma.js";
import type { CreateDebtDTO, UpdateDebtStatusDTO } from "./debt.schema.js";

export async function findDebtsByClientId(clientId: string) {
  return prisma.debt.findMany({ where: { clientId } });
}

export async function findDebtById(id: string) {
  return prisma.debt.findUnique({ where: { id } });
}

export async function createDebt(data: CreateDebtDTO) {
  return prisma.debt.create({ data });
}

export async function updateDebtStatus(id: string, data: UpdateDebtStatusDTO) {
  return prisma.debt.update({ where: { id }, data });
}

export async function deleteDebt(id: string) {
  return prisma.debt.delete({ where: { id } });
}

export async function findDebtsDueTomorrow() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(tomorrow.getDate() + 1);

  return prisma.debt.findMany({
    where: {
      status: "PENDING",
      dueDate: { gte: tomorrow, lt: dayAfter },
    },
    include: { client: { include: { user: true } } },
  });
}

export async function findDebtWithClient(id: string) {
  return prisma.debt.findUniqueOrThrow({
    where: { id },
    include: { client: { include: { user: true } } },
  });
}
