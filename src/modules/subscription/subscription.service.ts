import { clerkClient } from "@clerk/fastify";
import type { MessageChannel, PlanTier } from "../../../generated/prisma/enums.js";
import { PLAN_LIMITS, isAtLimit } from "../../core/plan-limits.js";
import {
  NoActiveSubscriptionError,
  PlanLimitError,
} from "./subscription.errors.js";
import {
  countClientsByUserId,
  createSubscription,
  findSubscriptionByUserId,
  getChannelUsageCount,
  getOrCreateMessageUsage,
  incrementMessageUsage,
  updateSubscription,
} from "./subscription.repository.js";

export async function createTrial(userId: string) {
  const existing = await findSubscriptionByUserId(userId);
  if (existing) return existing;

  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  const sub = await createSubscription({
    userId,
    planTier: "STARTER",
    status: "TRIALING",
    trialEndsAt,
    currentPeriodStart: now,
    currentPeriodEnd: trialEndsAt,
  });

  await syncClerkMetadata(userId, {
    subscriptionStatus: "TRIALING",
    planTier: "STARTER",
    trialEndsAt: trialEndsAt.toISOString(),
    periodEnd: trialEndsAt.toISOString(),
  });

  return sub;
}

export async function getSubscription(userId: string) {
  const sub = await findSubscriptionByUserId(userId);
  if (!sub) return null;

  if (sub.status === "TRIALING" && sub.trialEndsAt < new Date()) {
    const updated = await updateSubscription(sub.id, { status: "EXPIRED" });
    await syncClerkMetadata(userId, {
      subscriptionStatus: "EXPIRED",
      planTier: sub.planTier,
      trialEndsAt: sub.trialEndsAt.toISOString(),
      periodEnd: sub.currentPeriodEnd.toISOString(),
    });
    return { ...updated, usage: sub.usage };
  }

  return sub;
}

export async function createCheckout(
  _userId: string,
  _planTier: PlanTier,
  _returnUrl: string,
  _completionUrl: string,
): Promise<{ checkoutUrl: string }> {
  throw new Error("Payment provider not configured");
}

export async function cancelSubscription(userId: string) {
  const sub = await findSubscriptionByUserId(userId);
  if (!sub) return null;

  const updated = await updateSubscription(sub.id, {
    status: "CANCELED",
    canceledAt: new Date(),
  });

  await syncClerkMetadata(userId, {
    subscriptionStatus: "CANCELED",
    planTier: sub.planTier,
    trialEndsAt: sub.trialEndsAt.toISOString(),
    periodEnd: sub.currentPeriodEnd.toISOString(),
  });

  return updated;
}

export async function assertClientLimit(userId: string) {
  const sub = await findSubscriptionByUserId(userId);
  assertActiveSubscription(sub);

  const clientCount = await countClientsByUserId(userId);
  if (isAtLimit(sub!.planTier, "clients", clientCount)) {
    throw new PlanLimitError("clients");
  }
}

export async function assertAndIncrementMessageUsage(
  userId: string,
  channel: MessageChannel,
) {
  const sub = await findSubscriptionByUserId(userId);
  assertActiveSubscription(sub);

  const periodStart = sub!.currentPeriodStart;
  const periodEnd = sub!.currentPeriodEnd;

  await getOrCreateMessageUsage(sub!.id, channel, periodStart, periodEnd);
  const current = await getChannelUsageCount(sub!.id, channel, periodStart);

  if (isAtLimit(sub!.planTier, channel, current)) {
    throw new PlanLimitError(channel);
  }

  await incrementMessageUsage(sub!.id, channel, periodStart);
}

function assertActiveSubscription(
  sub: Awaited<ReturnType<typeof findSubscriptionByUserId>>,
) {
  if (!sub) throw new NoActiveSubscriptionError();
  const now = new Date();
  const isTrialing = sub.status === "TRIALING" && sub.trialEndsAt > now;
  const isActive = sub.status === "ACTIVE" && sub.currentPeriodEnd > now;
  if (!isTrialing && !isActive) throw new NoActiveSubscriptionError();
}

async function syncClerkMetadata(
  userId: string,
  meta: {
    subscriptionStatus: string;
    planTier: string;
    trialEndsAt: string;
    periodEnd: string;
  },
) {
  try {
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: meta,
    });
  } catch {
    // Non-fatal: middleware will fall back to DB on next sync
  }
}
