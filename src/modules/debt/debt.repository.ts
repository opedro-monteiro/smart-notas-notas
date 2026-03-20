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
