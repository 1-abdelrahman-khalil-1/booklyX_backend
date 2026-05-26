import { prisma } from "../helpers/prisma.js";
import { PaymentMethod, PaymentStatus } from "../../src/generated/prisma/client.js";

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

  for (const branch of activatedSeedBranches) {
    const branchPlan = await prisma.plan.findUnique({
      where: { id: branch.planId },
      select: { price: true },
    });

    if (!branchPlan) {
      continue;
    }

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

    await prisma.branchAdmin.update({
      where: { id: branch.id },
      data: {
        isSubscriptionActive: true,
        subscriptionStartedAt: now,
      },
    });
  }
}
