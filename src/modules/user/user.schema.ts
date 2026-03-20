import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  fullName: z.string().nullable(),
  imageUrl: z.string().optional(),
  email: z.email().nullable(),
  createdAt: z.coerce.date(),
});

export type UserDTO = z.infer<typeof UserSchema>;
