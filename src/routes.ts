import { analyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { clientRoutes } from "./modules/client/client.routes.js";
import { debtRoutes } from "./modules/debt/debt.routes.js";
import { messageRoutes } from "./modules/message/message.routes.js";
import { webhookRoutes } from "./modules/webhooks/routes.js";
import type { FastifyTypedInstance } from "./types/index.js";

export async function routes(app: FastifyTypedInstance) {
  app.register(analyticsRoutes, { prefix: "/api" });
  app.register(clientRoutes, { prefix: "/api" });
  app.register(debtRoutes, { prefix: "/api" });
  app.register(authRoutes, { prefix: "/api" });
  app.register(messageRoutes, { prefix: "/api" });
  app.register(webhookRoutes, { prefix: "/api" });
}
