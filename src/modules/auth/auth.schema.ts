import { z } from "zod";

export const AuthResponseSchema = z.object({
  message: z.string(),
  userId: z.string(),
});

export type AuthResponseDTO = z.infer<typeof AuthResponseSchema>;
