import z from "zod";

export const SubscriptionStatusSchema = z.enum([
  "TRIALING",
  "ACTIVE",
  "CANCELED",
  "EXPIRED",
]);

export const PlanTierSchema = z.enum(["STARTER", "GROWTH", "SCALE"]);

export const MessageUsageSchema = z.object({
  channel: z.enum(["SMS", "WHATSAPP", "EMAIL", "CALL"]),
  count: z.number(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export const SubscriptionSchema = z.object({
  id: z.string(),
  status: SubscriptionStatusSchema,
  planTier: PlanTierSchema,
  trialEndsAt: z.coerce.date(),
  currentPeriodStart: z.coerce.date(),
  currentPeriodEnd: z.coerce.date(),
  canceledAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  usage: z.array(MessageUsageSchema),
});

export const CheckoutResponseSchema = z.object({
  checkoutUrl: z.string(),
});

export const CreateCheckoutBodySchema = z.object({
  planTier: PlanTierSchema,
});

export type SubscriptionDTO = z.infer<typeof SubscriptionSchema>;
export type CreateCheckoutBody = z.infer<typeof CreateCheckoutBodySchema>;
