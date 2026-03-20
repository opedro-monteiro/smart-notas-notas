import { getAuth } from "@clerk/fastify";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import {
  CreateDebtSchema,
  DebtSchema,
  UpdateDebtStatusSchema,
} from "./debt.schema.js";
import {
  addDebt,
  listDebts,
  removeDebt,
  updateStatus,
} from "./debt.service.js";

export async function debtRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/clients/:clientId/debts",
    schema: {
      description: "List all debts for a client",
      tags: ["debts"],
      params: z.object({ clientId: z.string() }),
      response: {
        200: z.array(DebtSchema),
        401: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated } = getAuth(request);
      if (!isAuthenticated)
        return reply.code(401).send({ error: "User not authenticated" });

      const debts = await listDebts(request.params.clientId);
      return reply.code(200).send(debts);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/debts",
    schema: {
      description: "Create a new debt",
      tags: ["debts"],
      body: CreateDebtSchema,
      response: {
        201: DebtSchema,
        401: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated } = getAuth(request);
      if (!isAuthenticated)
        return reply.code(401).send({ error: "User not authenticated" });

      const debt = await addDebt(request.body);
      return reply.code(201).send(debt);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "PATCH",
    url: "/debts/:id/status",
    schema: {
      description: "Update debt status",
      tags: ["debts"],
      params: z.object({ id: z.string() }),
      body: UpdateDebtStatusSchema,
      response: {
        200: DebtSchema,
        401: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated } = getAuth(request);
      if (!isAuthenticated)
        return reply.code(401).send({ error: "User not authenticated" });

      const debt = await updateStatus(request.params.id, request.body);
      return reply.code(200).send(debt);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "DELETE",
    url: "/debts/:id",
    schema: {
      description: "Delete a debt",
      tags: ["debts"],
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

      await removeDebt(request.params.id);
      return reply.code(204).send(null);
    },
  });
}
