import { z } from "zod";

export const DebtStatusSchema = z.enum(["PENDING", "PAID", "OVERDUE"]);

export const DebtSchema = z.object({
  id: z.string(),
  amount: z.number(),
  dueDate: z.coerce.date(),
  status: DebtStatusSchema,
  createdAt: z.coerce.date(),
  clientId: z.string(),
});

export const CreateDebtSchema = z.object({
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
  clientId: z.string(),
});

export const UpdateDebtStatusSchema = z.object({
  status: DebtStatusSchema,
});

export type DebtDTO = z.infer<typeof DebtSchema>;
export type CreateDebtDTO = z.infer<typeof CreateDebtSchema>;
export type UpdateDebtStatusDTO = z.infer<typeof UpdateDebtStatusSchema>;
