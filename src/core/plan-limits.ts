import type { PlanTier } from "../../generated/prisma/enums.js";

export type PlanLimits = {
  clients: number | null;
  WHATSAPP: number | null;
  SMS: number | null;
  EMAIL: number | null;
  CALL: number | null;
};

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  STARTER: {
    clients: 50,
    WHATSAPP: 50,
    SMS: 50,
    EMAIL: null,
    CALL: 0,
  },
  GROWTH: {
    clients: 500,
    WHATSAPP: 150,
    SMS: 150,
    EMAIL: 150,
    CALL: 0,
  },
  SCALE: {
    clients: null,
    WHATSAPP: 2000,
    SMS: 1500,
    EMAIL: null,
    CALL: 500,
  },
};

export function isAtLimit(
  tier: PlanTier,
  resource: keyof PlanLimits,
  current: number,
): boolean {
  const limit = PLAN_LIMITS[tier][resource];
  if (limit === null) return false;
  return current >= limit;
}
