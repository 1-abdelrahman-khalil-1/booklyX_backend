import { BranchStatus, PaymentStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { toRangeWhere } from "../../../utils/period.js";
import dayjs from "dayjs";

export async function getPlatformAnalytics(period = "this_month") {
  const dateWhere = toRangeWhere(period, "paidAt");

  const [totalActiveBusinesses, totalRevenue] = await Promise.all([
    prisma.branchAdmin.count({ where: { status: BranchStatus.APPROVED, isSubscriptionActive: true } }),
    prisma.subscriptionPayment.aggregate({ where: { status: PaymentStatus.PAID, ...dateWhere }, _sum: { amount: true } }),
  ]);

  return { totalActiveBusinesses, totalSubscriptionRevenue: Number(totalRevenue._sum.amount ?? 0) };
}

export async function getAnalyticsOverview() {
  const thisMonthStart = dayjs().startOf("month").toDate();
  const thisMonthEnd = dayjs().endOf("month").toDate();

  const [revenueThisMonthAgg, activeBranches, totalUsers] = await Promise.all([
    prisma.subscriptionPayment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        paidAt: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.branchAdmin.count({
      where: {
        status: BranchStatus.APPROVED,
        isSubscriptionActive: true,
      },
    }),
    prisma.user.count(),
  ]);

  return {
    revenueThisMonth: Number(revenueThisMonthAgg._sum.amount ?? 0),
    activeBranches,
    totalUsers,
  };
}

export async function getRevenueChartData(limitMonths = 6) {
  const cutoffDate = dayjs().subtract(limitMonths - 1, "month").startOf("month").toDate();

  const payments = await prisma.subscriptionPayment.findMany({
    where: {
      status: PaymentStatus.PAID,
      paidAt: { gte: cutoffDate },
    },
    select: {
      amount: true,
      paidAt: true,
    },
  });

  const chartDataMap = new Map();
  for (let i = 0; i < limitMonths; i++) {
    const m = dayjs().subtract(limitMonths - 1 - i, "month");
    const key = m.format("YYYY-MM");
    chartDataMap.set(key, {
      year: m.year(),
      month: m.month() + 1,
      label: m.format("MMMM YYYY"),
      revenue: 0,
    });
  }

  for (const payment of payments) {
    if (!payment.paidAt) continue;
    const key = dayjs(payment.paidAt).format("YYYY-MM");
    if (chartDataMap.has(key)) {
      const dataPoint = chartDataMap.get(key);
      dataPoint.revenue += payment.amount;
    }
  }

  return Array.from(chartDataMap.values());
}
