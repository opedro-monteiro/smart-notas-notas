import z from "zod";

export const PeriodSchema = z.enum(["7d", "30d", "90d", "current-month"]);

export const AnalyticsSummarySchema = z.object({
  totalReceivable: z.number(),
  totalCollected: z.number(),
  totalOverdue: z.number(),
  collectionRate: z.number(),
  defaultRate: z.number(),
  totalClients: z.number(),
  totalDelinquentClients: z.number(),
  debtsByStatus: z.object({
    PENDING: z.number(),
    PAID: z.number(),
    OVERDUE: z.number(),
  }),
  period: PeriodSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
});
