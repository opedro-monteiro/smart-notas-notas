import {
  createClient,
  deleteClient,
  findClientById,
  findClientsByUserId,
} from "./client.repository.js";
import type { CreateClientDTO } from "./client.schema.js";

export async function listClients(userId: string) {
  return findClientsByUserId(userId);
}

export async function getClient(id: string) {
  return findClientById(id);
}

export async function addClient(userId: string, data: CreateClientDTO) {
  return createClient(userId, data);
}

export async function removeClient(id: string) {
  return deleteClient(id);
}
