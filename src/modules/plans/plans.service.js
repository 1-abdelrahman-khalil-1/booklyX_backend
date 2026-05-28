import prisma from "../../lib/prisma.js";


export async function listPlans() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
    select: {
      id: true,
      name: true,
      price: true,
      maxStaff: true,
      maxServices: true,
      loyaltyEnabled: true,
      offersEnabled: true,
    },
  });

  return plans;
}
