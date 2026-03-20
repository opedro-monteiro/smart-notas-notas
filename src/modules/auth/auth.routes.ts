import { getAuth } from "@clerk/fastify";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { AuthResponseSchema } from "./auth.schema.js";

export async function authRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/auth/me",
    schema: {
      description: "Get authenticated user info",
      tags: ["auth"],
      response: {
        200: AuthResponseSchema,
        401: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated, userId } = getAuth(request);

      if (!isAuthenticated) {
        return reply.code(401).send({ error: "User not authenticated" });
      }

      return reply.code(200).send({ message: "Authenticated", userId });
    },
  });
}
