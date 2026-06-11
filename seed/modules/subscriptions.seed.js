import { prisma } from "../helpers/prisma.js";
import { PaymentMethod, PaymentStatus } from "../../src/generated/prisma/client.js";
import dayjs from "dayjs";

export async function seedSubscriptions(seededApprovedBranches) {
  const activatedSeedBranches = seededApprovedBranches.slice(0, 6);

  if (activatedSeedBranches.length === 0) {
    return;
  }

  await prisma.subscriptionPayment.deleteMany({
    where: {
      branchId: {
        in: activatedSeedBranches.map((branch) => branch.id),
      },
    },
  });

  const now = new Date();
  const lastMonth = dayjs(now).subtract(1, "month").toDate();

  for (const branch of activatedSeedBranches) {
    const branchPlan = await prisma.plan.findUnique({
      where: { id: branch.planId },
      select: { price: true },
    });

    if (!branchPlan) {
      continue;
    }

    // 1. Successful subscription payment this month
    await prisma.subscriptionPayment.create({
      data: {
        branchId: branch.id,
        planId: branch.planId,
        amount: branchPlan.price,
        status: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.CARD,
        paidAt: now,
      },
    });

    // 2. Successful subscription payment last month (to compute trends)
    await prisma.subscriptionPayment.create({
      data: {
        branchId: branch.id,
        planId: branch.planId,
        amount: Math.round(branchPlan.price * 0.9), // slightly lower price last month
        status: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.CARD,
        paidAt: lastMonth,
      },
    });

    await prisma.branchAdmin.update({
      where: { id: branch.id },
      data: {
        isSubscriptionActive: true,
        subscriptionStartedAt: now,
      },
    });
  }

  // 3. Seed some refunded payments to populate refunds card metrics
  const refundBranch = activatedSeedBranches[0];
  if (refundBranch) {
    const branchPlan = await prisma.plan.findUnique({
      where: { id: refundBranch.planId },
      select: { price: true },
    });
    if (branchPlan) {
      // Refund this month
      await prisma.subscriptionPayment.create({
        data: {
          branchId: refundBranch.id,
          planId: refundBranch.planId,
          amount: branchPlan.price,
          status: PaymentStatus.REFUNDED,
          paymentMethod: PaymentMethod.CARD,
          paidAt: now,
        },
      });

      // Refund last month
      await prisma.subscriptionPayment.create({
        data: {
          branchId: refundBranch.id,
          planId: refundBranch.planId,
          amount: Math.round(branchPlan.price * 0.95),
          status: PaymentStatus.REFUNDED,
          paymentMethod: PaymentMethod.CARD,
          paidAt: lastMonth,
        },
      });
    }
  }
}
