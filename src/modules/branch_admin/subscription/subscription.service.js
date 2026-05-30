import { BranchStatus, PaymentMethod, PaymentStatus } from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import {
    BranchNotFoundError,
    PlanNotFoundError,
    SubscriptionActivationForbiddenError,
    SubscriptionAlreadyActiveError,
    SubscriptionCancellationError,
} from "../errors.js";

export async function activateSubscription(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: {
      id: true,
      status: true,
      planId: true,
      isSubscriptionActive: true,
      plan: {
        select: { id: true, name: true, price: true, maxStaff: true, maxServices: true, loyaltyEnabled: true, offersEnabled: true },
      },
    },
  });

  if (!branchAdmin) throw new BranchNotFoundError();
  if (branchAdmin.status !== BranchStatus.APPROVED) throw new SubscriptionActivationForbiddenError();
  if (branchAdmin.isSubscriptionActive) throw new SubscriptionAlreadyActiveError();

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.create({
      data: { branchId: branchAdmin.id, planId: branchAdmin.planId, amount: branchAdmin.plan.price, status: PaymentStatus.PAID, paymentMethod: PaymentMethod.CARD, paidAt: now },
      select: { id: true, amount: true, status: true, paymentMethod: true, paidAt: true },
    });

    const updatedBranch = await tx.branchAdmin.update({
      where: { id: branchAdmin.id },
      data: { isSubscriptionActive: true, subscriptionStartedAt: now },
      select: { id: true, isSubscriptionActive: true, subscriptionStartedAt: true },
    });

    return { payment, updatedBranch };
  });

  return {
    message: tr.BRANCH_SUBSCRIPTION_ACTIVATED,
    payment: result.payment,
    plan: branchAdmin.plan,
    isSubscriptionActive: result.updatedBranch.isSubscriptionActive,
    subscriptionStartedAt: result.updatedBranch.subscriptionStartedAt,
  };
}

export async function renewSubscription(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: {
      id: true,
      status: true,
      isSubscriptionActive: true,
      planId: true,
      plan: { select: { id: true, name: true, price: true, maxStaff: true, maxServices: true, loyaltyEnabled: true, offersEnabled: true } },
    },
  });

  if (!branchAdmin) throw new BranchNotFoundError();
  if (branchAdmin.status !== BranchStatus.APPROVED) throw new SubscriptionActivationForbiddenError();

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.create({
      data: { branchId: branchAdmin.id, planId: branchAdmin.planId, amount: branchAdmin.plan.price, status: PaymentStatus.PAID, paymentMethod: PaymentMethod.CARD, paidAt: now },
      select: { id: true, amount: true, status: true, paymentMethod: true, paidAt: true },
    });
    const updatedBranch = await tx.branchAdmin.update({
      where: { id: branchAdmin.id },
      data: { isSubscriptionActive: true, subscriptionStartedAt: now },
      select: { id: true, isSubscriptionActive: true, subscriptionStartedAt: true },
    });
    return { payment, updatedBranch };
  });

  return { message: tr.SUBSCRIPTION_RENEWED, payment: result.payment, plan: branchAdmin.plan, isSubscriptionActive: result.updatedBranch.isSubscriptionActive, subscriptionStartedAt: result.updatedBranch.subscriptionStartedAt };
}

export async function changeSubscriptionPlan(branchAdminUserId, newPlanId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true, status: true, isSubscriptionActive: true, planId: true, plan: { select: { id: true, name: true, price: true, maxStaff: true, maxServices: true, loyaltyEnabled: true, offersEnabled: true } } },
  });

  if (!branchAdmin) throw new BranchNotFoundError();
  if (branchAdmin.status !== BranchStatus.APPROVED) throw new SubscriptionActivationForbiddenError();

  const newPlan = await prisma.plan.findUnique({
    where: { id: newPlanId },
    select: { id: true, name: true, price: true, maxStaff: true, maxServices: true, loyaltyEnabled: true, offersEnabled: true },
  });
  if (!newPlan) throw new PlanNotFoundError();

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.create({ data: { branchId: branchAdmin.id, planId: newPlan.id, amount: newPlan.price, status: PaymentStatus.PAID, paymentMethod: PaymentMethod.CARD, paidAt: now }, select: { id: true, amount: true, status: true, paymentMethod: true, paidAt: true } });
    const updatedBranch = await tx.branchAdmin.update({ where: { id: branchAdmin.id }, data: { planId: newPlan.id, isSubscriptionActive: true, subscriptionStartedAt: now }, select: { id: true, isSubscriptionActive: true, subscriptionStartedAt: true } });
    return { payment, updatedBranch };
  });

  return { message: tr.SUBSCRIPTION_PLAN_CHANGED, payment: result.payment, plan: newPlan, isSubscriptionActive: result.updatedBranch.isSubscriptionActive, subscriptionStartedAt: result.updatedBranch.subscriptionStartedAt };
}

export async function cancelSubscription(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true, status: true, isSubscriptionActive: true, subscriptionStartedAt: true, plan: { select: { id: true, name: true, price: true, maxStaff: true, maxServices: true, loyaltyEnabled: true, offersEnabled: true } } },
  });

  if (!branchAdmin) throw new BranchNotFoundError();
  if (branchAdmin.status !== BranchStatus.APPROVED) throw new SubscriptionActivationForbiddenError();
  if (!branchAdmin.isSubscriptionActive) throw new SubscriptionCancellationError();

  const payment = await prisma.subscriptionPayment.findFirst({ where: { branchId: branchAdmin.id, status: PaymentStatus.PAID }, orderBy: { paidAt: "desc" } });

  let refundAmount = 0;
  if (payment && branchAdmin.subscriptionStartedAt) {
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const timeSinceStart = now.getTime() - branchAdmin.subscriptionStartedAt.getTime();
    refundAmount = timeSinceStart <= ONE_WEEK_MS ? payment.amount : payment.amount * 0.7;
  }

  const result = await prisma.$transaction(async (tx) => {
    if (payment) {
      await tx.subscriptionPayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.REFUNDED } });
    }

    return tx.branchAdmin.update({ where: { id: branchAdmin.id }, data: { isSubscriptionActive: false, subscriptionStartedAt: null }, select: { id: true, isSubscriptionActive: true, subscriptionStartedAt: true } });
  });

  return { message: tr.SUBSCRIPTION_CANCELED, plan: branchAdmin.plan, isSubscriptionActive: result.isSubscriptionActive, subscriptionStartedAt: result.subscriptionStartedAt, refundAmount };
}