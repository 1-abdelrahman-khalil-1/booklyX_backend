import prisma from "../../lib/prisma.js";

function toNumericPrice(price) {
  if (price && typeof price === "object" && typeof price.toNumber === "function") {
    return price.toNumber();
  }

  return Number(price);
}

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

  return plans.map((plan) => ({
    ...plan,
    price: toNumericPrice(plan.price),
  }));
}
