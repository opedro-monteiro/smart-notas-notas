import {
  createClient,
  deleteClient,
  findClientById,
  findClientsByUserId,
  updateClient,
} from "./client.repository.js";
import type { CreateClientDTO, UpdateClientDTO } from "./client.schema.js";

export async function listClients(userId: string) {
  return findClientsByUserId(userId);
}

export async function getClient(id: string) {
  return findClientById(id);
}

export async function addClient(userId: string, data: CreateClientDTO) {
  return createClient(userId, data);
}

export async function patchClient(
  userId: string,
  clientId: string,
  data: UpdateClientDTO,
) {
  const existing = await findClientById(clientId);
  if (!existing || existing.userId !== userId) return null;
  return updateClient(clientId, data);
}

export async function removeClient(id: string) {
  return deleteClient(id);
}
