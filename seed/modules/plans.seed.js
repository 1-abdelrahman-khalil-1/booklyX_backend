import { DEFAULT_PLANS } from "../config/constants.js";
import { prisma } from "../helpers/prisma.js";

export async function seedPlans() {
  let starterPlan = null;

  for (const plan of DEFAULT_PLANS) {
    const ensuredPlan = await prisma.plan.upsert({
      where: { name: plan.name },
      update: {
        price: plan.price,
        maxStaff: plan.maxStaff,
        maxServices: plan.maxServices,
        loyaltyEnabled: plan.loyaltyEnabled,
        offersEnabled: plan.offersEnabled,
        isActive: plan.isActive,
      },
      create: plan,
    });

    if (ensuredPlan.name === "Starter") {
      starterPlan = ensuredPlan;
    }
  }

  if (!starterPlan) {
    throw new Error("Starter plan seed was not created.");
  }

  return { starterPlan };
}
