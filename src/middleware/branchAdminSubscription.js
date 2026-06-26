import prisma from "../lib/prisma.js";
import { SubscriptionRequiredError, ensureActiveSubscription } from "../utils/subscriptionGuards.js";

export async function requireActiveBranchSubscription(req, _res, next) {
  try {
    const branchAdmin = await prisma.branchAdmin.findUnique({
      where: { userId: req.user.sub },
      select: {
        id: true,
        status: true,
        isSubscriptionActive: true,
      },
    });

    if (!branchAdmin) {
      throw new SubscriptionRequiredError();
    }

    await ensureActiveSubscription(branchAdmin.id, branchAdmin);

    req.branchAdmin = branchAdmin;
    next();
  } catch (error) {
    next(error);
  }
}