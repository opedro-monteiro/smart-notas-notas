import {
  createDebt,
  deleteDebt,
  findDebtById,
  findDebtsByClientId,
  updateDebtStatus,
} from "./debt.repository.js";
import type { CreateDebtDTO, UpdateDebtStatusDTO } from "./debt.schema.js";

export async function listDebts(clientId: string) {
  return findDebtsByClientId(clientId);
}

export async function getDebt(id: string) {
  return findDebtById(id);
}

export async function addDebt(data: CreateDebtDTO) {
  return createDebt(data);
}

export async function updateStatus(id: string, data: UpdateDebtStatusDTO) {
  return updateDebtStatus(id, data);
}

export async function removeDebt(id: string) {
  return deleteDebt(id);
}
