import { getAuth } from "@clerk/fastify";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { AnalyticsSummarySchema, PeriodSchema } from "./analytics.schema.js";
import { getAnalyticsSummary } from "./analytics.repository.js";

export async function analyticsRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/analytics/summary",
    schema: {
      description: "Get financial KPI summary for the authenticated user",
      tags: ["analytics"],
      querystring: z.object({
        period: PeriodSchema.default("30d"),
      }),
      response: {
        200: AnalyticsSummarySchema,
        401: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated, userId } = getAuth(request);
      if (!isAuthenticated || !userId)
        return reply.code(401).send({ error: "User not authenticated" });

      const summary = await getAnalyticsSummary(userId, request.query.period);
      return reply.code(200).send(summary);
    },
  });
}
