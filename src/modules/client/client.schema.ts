import { z } from "zod";

import { MAX_REMINDER_MESSAGE_TEMPLATE_LENGTH } from "../../shared/utils/resolve-reminder-message.js";

export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  reminderMessageTemplate: z.string().nullable(),
  createdAt: z.coerce.date(),
  userId: z.string(),
});

export const CreateClientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  reminderMessageTemplate: z
    .string()
    .max(MAX_REMINDER_MESSAGE_TEMPLATE_LENGTH)
    .optional(),
});

export const UpdateClientSchema = z
  .object({
    name: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    reminderMessageTemplate: z
      .string()
      .max(MAX_REMINDER_MESSAGE_TEMPLATE_LENGTH)
      .nullable()
      .optional(),
  })
  .refine(
    (fields) =>
      fields.name !== undefined ||
      fields.phone !== undefined ||
      fields.email !== undefined ||
      fields.reminderMessageTemplate !== undefined,
    { message: "At least one field is required" },
  );

export type ClientDTO = z.infer<typeof ClientSchema>;
export type CreateClientDTO = z.infer<typeof CreateClientSchema>;
export type UpdateClientDTO = z.infer<typeof UpdateClientSchema>;
