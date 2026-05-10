import type { MessageChannel, PlanTier, SubscriptionStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../shared/plugins/prisma.js";

export async function findSubscriptionByUserId(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
    include: { usage: true },
  });
}

export async function createSubscription(data: {
  userId: string;
  planTier: PlanTier;
  status: SubscriptionStatus;
  trialEndsAt: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}) {
  return prisma.subscription.create({ data });
}

export async function updateSubscription(
  id: string,
  data: Partial<{
    status: SubscriptionStatus;
    planTier: PlanTier;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    canceledAt: Date;
  }>,
) {
  return prisma.subscription.update({ where: { id }, data });
}

export async function getOrCreateMessageUsage(
  subscriptionId: string,
  channel: MessageChannel,
  periodStart: Date,
  periodEnd: Date,
) {
  return prisma.messageUsage.upsert({
    where: {
      subscriptionId_channel_periodStart: {
        subscriptionId,
        channel,
        periodStart,
      },
    },
    create: { subscriptionId, channel, count: 0, periodStart, periodEnd },
    update: {},
  });
}

export async function incrementMessageUsage(
  subscriptionId: string,
  channel: MessageChannel,
  periodStart: Date,
) {
  return prisma.messageUsage.update({
    where: {
      subscriptionId_channel_periodStart: {
        subscriptionId,
        channel,
        periodStart,
      },
    },
    data: { count: { increment: 1 } },
  });
}

export async function getChannelUsageCount(
  subscriptionId: string,
  channel: MessageChannel,
  periodStart: Date,
): Promise<number> {
  const usage = await prisma.messageUsage.findUnique({
    where: {
      subscriptionId_channel_periodStart: {
        subscriptionId,
        channel,
        periodStart,
      },
    },
  });
  return usage?.count ?? 0;
}

export async function countClientsByUserId(userId: string): Promise<number> {
  return prisma.client.count({ where: { userId } });
}
