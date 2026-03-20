import { getAuth } from "@clerk/fastify";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { ClientSchema, CreateClientSchema } from "./client.schema.js";
import { addClient, listClients, removeClient } from "./client.service.js";

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
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated, userId } = getAuth(request);
      if (!isAuthenticated)
        return reply.code(401).send({ error: "User not authenticated" });

      const client = await addClient(userId, request.body);
      return reply.code(201).send(client);
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
