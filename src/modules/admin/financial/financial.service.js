import dayjs from "dayjs";
import { PaymentStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";

function calculateTrend(current, previous) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const diff = current - previous;
  const percentage = (diff / previous) * 100;
  return Number(percentage.toFixed(1));
}

export async function getFinancialSummary() {
  const thisMonthStart = dayjs().startOf("month").toDate();
  const thisMonthEnd = dayjs().endOf("month").toDate();

  const lastMonthStart = dayjs().subtract(1, "month").startOf("month").toDate();
  const lastMonthEnd = dayjs().subtract(1, "month").endOf("month").toDate();

  // 1. Monthly Revenue
  const [currentRevAgg, lastRevAgg] = await Promise.all([
    prisma.subscriptionPayment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        paidAt: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.subscriptionPayment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amount: true },
    }),
  ]);
  const currentRevenue = Number(currentRevAgg._sum.amount ?? 0);
  const lastRevenue = Number(lastRevAgg._sum.amount ?? 0);
  const revenueTrend = calculateTrend(currentRevenue, lastRevenue);

  // 2. Active Subscriptions
  const currentActiveSubs = await prisma.branchAdmin.count({
    where: {
      isSubscriptionActive: true,
    },
  });
  const lastActiveSubs = await prisma.branchAdmin.count({
    where: {
      subscriptionPayments: {
        some: {
          status: PaymentStatus.PAID,
          paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      },
    },
  });
  const activeSubsTrend = calculateTrend(currentActiveSubs, lastActiveSubs);

  // 3. Refunds
  const [currentRefundAgg, lastRefundAgg] = await Promise.all([
    prisma.subscriptionPayment.aggregate({
      where: {
        status: PaymentStatus.REFUNDED,
        paidAt: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.subscriptionPayment.aggregate({
      where: {
        status: PaymentStatus.REFUNDED,
        paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amount: true },
    }),
  ]);
  const currentRefundAmount = Number(currentRefundAgg._sum.amount ?? 0);
  const currentRefundCount = currentRefundAgg._count.id ?? 0;
  const lastRefundAmount = Number(lastRefundAgg._sum.amount ?? 0);
  const refundsTrend = calculateTrend(currentRefundAmount, lastRefundAmount);

  // 4. Total Payments (Count of successful payments)
  const [currentPaymentsCount, lastPaymentsCount] = await Promise.all([
    prisma.subscriptionPayment.count({
      where: {
        status: { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] },
        paidAt: { gte: thisMonthStart, lte: thisMonthEnd },
      },
    }),
    prisma.subscriptionPayment.count({
      where: {
        status: { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] },
        paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    }),
  ]);
  const totalPaymentsTrend = calculateTrend(currentPaymentsCount, lastPaymentsCount);

  return {
    monthlyRevenue: {
      value: currentRevenue,
      trend: revenueTrend,
    },
    activeSubscriptions: {
      value: currentActiveSubs,
      trend: activeSubsTrend,
    },
    refunds: {
      value: currentRefundAmount,
      count: currentRefundCount,
      trend: refundsTrend,
    },
    totalPayments: {
      value: currentPaymentsCount,
      trend: totalPaymentsTrend,
    },
  };
}
