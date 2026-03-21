import { getAuth } from "@clerk/fastify";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { enqueueMessages, listMessages } from "./message.service.js";

const MessageChannelSchema = z.enum(["SMS", "WHATSAPP", "EMAIL", "CALL"]);

export async function messageRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/messages/send",
    schema: {
      description: "Enqueue message jobs for a debt",
      tags: ["messages"],
      body: z.object({
        debtId: z.string(),
        channels: z.array(MessageChannelSchema).optional(),
      }),
      response: {
        200: z.object({ queued: z.number() }),
        400: z.object({ error: z.string() }),
        401: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated } = getAuth(request);
      if (!isAuthenticated) {
        return reply.code(401).send({ error: "User not authenticated" });
      }

      try {
        const result = await enqueueMessages(request.body);
        return reply.code(200).send(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to enqueue messages";
        return reply.code(400).send({ error: message });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/messages/:debtId",
    schema: {
      description: "List messages for a debt",
      tags: ["messages"],
      params: z.object({ debtId: z.string() }),
      response: {
        200: z.array(
          z.object({
            id: z.string(),
            channel: MessageChannelSchema,
            status: z.string(),
            content: z.string().nullable(),
            sentAt: z.coerce.date().nullable(),
            createdAt: z.coerce.date(),
            debtId: z.string(),
          }),
        ),
        401: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated } = getAuth(request);
      if (!isAuthenticated) {
        return reply.code(401).send({ error: "User not authenticated" });
      }

      const messages = await listMessages(request.params.debtId);
      return reply.code(200).send(messages);
    },
  });
}
