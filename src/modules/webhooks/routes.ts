import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { createTrial } from "../subscription/subscription.service.js";
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
      const payload = request.body as CreatedUserClerkResponse;
      const user = await registerUserFromClerk(payload);
      await createTrial(user.id);
      return reply.code(200);
    },
  });
}
