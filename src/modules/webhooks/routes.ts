import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { registerUserFromClerk } from "../user/user.service.js";
import type { CreatedUserClerkResponse } from "./types.js";

export async function webhookRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/webhooks/clerk/create-user",
    schema: {
      description: "Create a user by clerk in database",
      tags: ["webhook"],
      response: {
        200: z.null(),
        500: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      await registerUserFromClerk(request.body as CreatedUserClerkResponse);
      return reply.code(200);
    },
  });
}
