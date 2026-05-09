import { prisma } from "../../shared/plugins/prisma.js";

export type Period = "7d" | "30d" | "90d" | "current-month";

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;
  if (period === "current-month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

export async function getAnalyticsSummary(userId: string, period: Period) {
  const { start, end } = getPeriodRange(period);

  const where = {
    client: { userId },
    createdAt: { gte: start, lte: end },
  };

  const [receivable, collected, overdue, debtsByStatus, totalClients, totalDelinquentClients] =
    await Promise.all([
      prisma.debt.aggregate({
        where: { ...where, status: { in: ["PENDING", "OVERDUE"] } },
        _sum: { amount: true },
      }),
      prisma.debt.aggregate({
        where: { ...where, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.debt.aggregate({
        where: { ...where, status: "OVERDUE" },
        _sum: { amount: true },
      }),
      prisma.debt.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.client.count({ where: { userId } }),
      prisma.client.count({
        where: {
          userId,
          debts: {
            some: { status: "OVERDUE", createdAt: { gte: start, lte: end } },
          },
        },
      }),
    ]);

  const totalReceivable = receivable._sum.amount ?? 0;
  const totalCollected = collected._sum.amount ?? 0;
  const totalOverdue = overdue._sum.amount ?? 0;
  const total = totalReceivable + totalCollected;
  const collectionRate = total > 0 ? (totalCollected / total) * 100 : 0;
  const defaultRate = total > 0 ? (totalOverdue / total) * 100 : 0;

  const statusCounts = { PENDING: 0, PAID: 0, OVERDUE: 0 };
  for (const group of debtsByStatus) {
    statusCounts[group.status as keyof typeof statusCounts] = group._count;
  }

  return {
    totalReceivable,
    totalCollected,
    totalOverdue,
    collectionRate,
    defaultRate,
    totalClients,
    totalDelinquentClients,
    debtsByStatus: statusCounts,
    period,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  };
}
