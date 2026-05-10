import { getAuth } from "@clerk/fastify";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import {
  CheckoutResponseSchema,
  CreateCheckoutBodySchema,
  SubscriptionSchema,
} from "./subscription.schema.js";
import {
  cancelSubscription,
  createCheckout,
  getSubscription,
} from "./subscription.service.js";

export async function subscriptionRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/subscription/me",
    schema: {
      description: "Get current user subscription and usage",
      tags: ["subscription"],
      response: {
        200: SubscriptionSchema.nullable(),
        401: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated, userId } = getAuth(request);
      if (!isAuthenticated || !userId)
        return reply.code(401).send({ error: "User not authenticated" });

      const sub = await getSubscription(userId);
      return reply.code(200).send(sub);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/subscription/checkout",
    schema: {
      description: "Create a subscription checkout URL",
      tags: ["subscription"],
      body: CreateCheckoutBodySchema,
      response: {
        200: CheckoutResponseSchema,
        401: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated, userId } = getAuth(request);
      if (!isAuthenticated || !userId)
        return reply.code(401).send({ error: "User not authenticated" });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const { checkoutUrl } = await createCheckout(
        userId,
        request.body.planTier,
        `${baseUrl}/dashboard/billing`,
        `${baseUrl}/dashboard/billing?success=true`,
      );

      return reply.code(200).send({ checkoutUrl });
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/subscription/cancel",
    schema: {
      description: "Cancel active subscription",
      tags: ["subscription"],
      response: {
        200: z.object({ ok: z.boolean() }),
        401: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated, userId } = getAuth(request);
      if (!isAuthenticated || !userId)
        return reply.code(401).send({ error: "User not authenticated" });

      const result = await cancelSubscription(userId);
      if (!result)
        return reply.code(404).send({ error: "Assinatura não encontrada" });

      return reply.code(200).send({ ok: true });
    },
  });
}
