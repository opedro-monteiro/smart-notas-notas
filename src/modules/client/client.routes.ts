import { getAuth } from "@clerk/fastify";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import {
  ClientSchema,
  CreateClientSchema,
  UpdateClientSchema,
} from "./client.schema.js";
import {
  addClient,
  listClients,
  patchClient,
  removeClient,
} from "./client.service.js";
import { PlanLimitError, NoActiveSubscriptionError } from "../subscription/subscription.errors.js";

export async function clientRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/clients",
    schema: {
      description: "List all clients for the authenticated user",
      tags: ["clients"],
      response: {
        200: z.array(ClientSchema),
        401: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated, userId } = getAuth(request);
      if (!isAuthenticated)
        return reply.code(401).send({ error: "User not authenticated" });

      const clients = await listClients(userId);
      return reply.code(200).send(clients);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/clients",
    schema: {
      description: "Create a new client",
      tags: ["clients"],
      body: CreateClientSchema,
      response: {
        201: ClientSchema,
        401: z.object({ error: z.string() }),
        402: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated, userId } = getAuth(request);
      if (!isAuthenticated)
        return reply.code(401).send({ error: "User not authenticated" });

      try {
        const client = await addClient(userId, request.body);
        return reply.code(201).send(client);
      } catch (err) {
        if (err instanceof PlanLimitError || err instanceof NoActiveSubscriptionError) {
          return reply.code(402).send({ error: err.message });
        }
        throw err;
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "PATCH",
    url: "/clients/:id",
    schema: {
      description:
        "Update client (partial). reminderMessageTemplate: placeholders {{clientName}}, {{amount}}, {{dueDate}}, {{dueDateSpoken}}, {{sender}}, {{companyName}}; null or empty clears custom message (system default).",
      tags: ["clients"],
      params: z.object({ id: z.string() }),
      body: UpdateClientSchema,
      response: {
        200: ClientSchema,
        401: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated, userId } = getAuth(request);
      if (!isAuthenticated || !userId)
        return reply.code(401).send({ error: "User not authenticated" });

      const updated = await patchClient(userId, request.params.id, request.body);
      if (!updated)
        return reply.code(404).send({ error: "Client not found" });

      return reply.code(200).send(updated);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "DELETE",
    url: "/clients/:id",
    schema: {
      description: "Delete a client",
      tags: ["clients"],
      params: z.object({ id: z.string() }),
      response: {
        204: z.null(),
        401: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated } = getAuth(request);
      if (!isAuthenticated)
        return reply.code(401).send({ error: "User not authenticated" });

      await removeClient(request.params.id);
      return reply.code(204).send(null);
    },
  });
}
