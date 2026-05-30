import { BranchStatus, PaymentStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { toRangeWhere } from "../../../utils/period.js";

export async function getPlatformAnalytics(period = "this_month") {
  const dateWhere = toRangeWhere(period, "paidAt");

  const [totalActiveBusinesses, totalRevenue] = await Promise.all([
    prisma.branchAdmin.count({ where: { status: BranchStatus.APPROVED, isSubscriptionActive: true } }),
    prisma.subscriptionPayment.aggregate({ where: { status: PaymentStatus.PAID, ...dateWhere }, _sum: { amount: true } }),
  ]);

  return { totalActiveBusinesses, totalSubscriptionRevenue: Number(totalRevenue._sum.amount ?? 0) };
}
