import { z } from "zod";

export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  createdAt: z.coerce.date(),
  userId: z.string(),
});

export const CreateClientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export type ClientDTO = z.infer<typeof ClientSchema>;
export type CreateClientDTO = z.infer<typeof CreateClientSchema>;
