import { BranchStatus, ServiceApprovalStatus } from "../generated/prisma/client.js";
import { tr } from "../lib/i18n/index.js";
import prisma from "../lib/prisma.js";
import { AppError } from "./AppError.js";

export class SubscriptionRequiredError extends AppError {
  constructor() {
    super(tr.SUBSCRIPTION_REQUIRED, 403);
    this.name = "SubscriptionRequiredError";
  }
}

export class FeatureNotEnabledError extends AppError {
  constructor(message) {
    super(message, 403);
    this.name = "FeatureNotEnabledError";
  }
}

export class PlanLimitExceededError extends AppError {
  constructor(message, params) {
    super(message, 409, params);
    this.name = "PlanLimitExceededError";
  }
}

async function getBranchWithPlan(branchId) {
  return prisma.branchAdmin.findUnique({
    where: { id: branchId },
    select: {
      id: true,
      status: true,
      isSubscriptionActive: true,
      plan: {
        select: {
          id: true,
          maxStaff: true,
          maxServices: true,
          offersEnabled: true,
          loyaltyEnabled: true,
        },
      },
    },
  });
}

/**
 * @param {number} branchId
 * @param {any} [branchRecord]
 */
export async function ensureActiveSubscription(branchId, branchRecord = null) {
  const branch = branchRecord ?? (await getBranchWithPlan(branchId));

  if (!branch || branch.status !== BranchStatus.APPROVED) {
    throw new SubscriptionRequiredError();
  }

  if (!branch.isSubscriptionActive) {
    throw new SubscriptionRequiredError();
  }

  return branch;
}

export async function ensureOffersEnabled(branchId) {
  const branch = await ensureActiveSubscription(branchId);

  if (!branch.plan?.offersEnabled) {
    throw new FeatureNotEnabledError(tr.OFFERS_NOT_ENABLED_FOR_PLAN);
  }

  return branch;
}

export async function ensureLoyaltyEnabled(branchId) {
  const branch = await ensureActiveSubscription(branchId);

  if (!branch.plan?.loyaltyEnabled) {
    throw new FeatureNotEnabledError(tr.LOYALTY_NOT_ENABLED_FOR_PLAN);
  }

  return branch;
}

/**
 * @param {number} branchId
 * @param {any} [branchRecord]
 */
export async function ensureStaffLimitNotExceeded(branchId, branchRecord = null) {
  const branch = await ensureActiveSubscription(branchId, branchRecord);

  if (branch.plan?.maxStaff === null) {
    return;
  }

  const staffCount = await prisma.staff.count({
    where: {
      branchId,
      isActive: true,
    },
  });

  if (staffCount >= branch.plan.maxStaff) {
    throw new PlanLimitExceededError(tr.STAFF_LIMIT_EXCEEDED, {
      limit: branch.plan.maxStaff,
    });
  }
}

/**
 * @param {number} branchId
 * @param {any} [branchRecord]
 */
export async function ensureServiceLimitNotExceeded(branchId, branchRecord = null) {
  const branch = await ensureActiveSubscription(branchId, branchRecord);

  if (branch.plan?.maxServices === null) {
    return;
  }

  const serviceCount = await prisma.service.count({
    where: {
      branchId,
      status: ServiceApprovalStatus.APPROVED,
    },
  });

  if (serviceCount >= branch.plan.maxServices) {
    throw new PlanLimitExceededError(tr.SERVICE_LIMIT_EXCEEDED, {
      limit: branch.plan.maxServices,
    });
  }
}
