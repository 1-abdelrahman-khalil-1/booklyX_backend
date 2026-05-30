import {
    BranchStatus,
    OfferDiscountType,
    ServiceApprovalStatus,
} from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import { AppError } from "../../../utils/AppError.js";
import { ensureOffersEnabled } from "../../../utils/subscriptionGuards.js";
// Validation is now handled in offers.controller.js

export class OffersValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "OffersValidationError";
  }
}

export class OfferNotFoundError extends AppError {
  constructor() {
    super(tr.OFFER_NOT_FOUND, 404);
    this.name = "OfferNotFoundError";
  }
}

export class BranchAdminNotFoundError extends AppError {
  constructor() {
    super(tr.BRANCH_NOT_FOUND, 404);
    this.name = "BranchAdminNotFoundError";
  }
}

export class OfferNotAvailableError extends AppError {
  constructor() {
    super(tr.OFFER_NOT_AVAILABLE, 409);
    this.name = "OfferNotAvailableError";
  }
}

export class OfferExpiredOrExhaustedError extends AppError {
  constructor() {
    super(tr.OFFER_EXPIRED_OR_EXHAUSTED, 409);
    this.name = "OfferExpiredOrExhaustedError";
  }
}

async function getApprovedBranchAdmin(branchAdminUserId) {
  const branchAdmin = await prisma.branchAdmin.findUnique({
    where: { userId: branchAdminUserId },
    select: { id: true, status: true },
  });

  if (!branchAdmin) {
    throw new BranchAdminNotFoundError();
  }

  if (branchAdmin.status !== BranchStatus.APPROVED) {
    throw new OffersValidationError(tr.BRANCH_IS_UNDER_REVIEW);
  }

  return branchAdmin;
}

async function validateApprovedBranchServices(serviceIds, branchId) {
  const uniqueServiceIds = [...new Set(serviceIds)];

  const approvedServices = await prisma.service.findMany({
    where: {
      id: { in: uniqueServiceIds },
      branchId,
      status: ServiceApprovalStatus.APPROVED,
    },
    select: { id: true },
  });

  if (approvedServices.length !== uniqueServiceIds.length) {
    throw new OffersValidationError(tr.INVALID_OFFER_SERVICE_SELECTION);
  }

  return uniqueServiceIds;
}

function mapOfferWithServices(offer) {
  return {
    id: offer.id,
    title: offer.title,
    description: offer.description,
    imageUrl: offer.imageUrl ?? null,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    startDate: offer.startDate,
    endDate: offer.endDate,
    isActive: offer.isActive,
    usageLimit: offer.usageLimit,
    usedCount: offer.usedCount,
    branchId: offer.branchId,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    services: offer.services.map((link) => link.service),
  };
}

function resolveDiscountAmount(basePrice, offer) {
  if (offer.discountType === OfferDiscountType.PERCENTAGE) {
    return Math.min(basePrice, basePrice * (offer.discountValue / 100));
  }

  return Math.min(basePrice, offer.discountValue);
}

export async function createOffer(body, branchAdminUserId) {
  const branchAdmin = await getApprovedBranchAdmin(branchAdminUserId);
  await ensureOffersEnabled(branchAdmin.id);
  const data = body;
  const serviceIds = await validateApprovedBranchServices(body.serviceIds, branchAdmin.id);

  const offer = await prisma.offer.create({
    data: {
      branchId: branchAdmin.id,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl ?? null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      usageLimit: data.usageLimit,
      services: {
        create: serviceIds.map((serviceId) => ({
          service: { connect: { id: serviceId } },
        })),
      },
    },
    include: {
      services: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
              price: true,
              status: true,
            },
          },
        },
      },
    },
  });

  return mapOfferWithServices(offer);
}

export async function updateOffer(id, body, branchAdminUserId) {
  const data = body;
  const branchAdmin = await getApprovedBranchAdmin(branchAdminUserId);
  await ensureOffersEnabled(branchAdmin.id);

  const existingOffer = await prisma.offer.findFirst({
    where: {
      id,
      branchId: branchAdmin.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      discountType: true,
      discountValue: true,
      startDate: true,
      endDate: true,
      isActive: true,
      usageLimit: true,
    },
  });

  if (!existingOffer) {
    throw new OfferNotFoundError();
  }

  const finalDiscountType = data.discountType ?? existingOffer.discountType;
  const finalDiscountValue = data.discountValue ?? existingOffer.discountValue;
  if (
    finalDiscountType === OfferDiscountType.PERCENTAGE
    && finalDiscountValue > 100
  ) {
    throw new OffersValidationError(tr.OFFER_PERCENTAGE_RANGE);
  }

  const finalStartDate = data.startDate ? new Date(data.startDate) : existingOffer.startDate;
  const finalEndDate = data.endDate ? new Date(data.endDate) : existingOffer.endDate;
  if (finalEndDate <= finalStartDate) {
    throw new OffersValidationError(tr.OFFER_END_DATE_AFTER_START_DATE);
  }

  let uniqueServiceIds;
  if (data.serviceIds) {
    uniqueServiceIds = await validateApprovedBranchServices(data.serviceIds, branchAdmin.id);
  }

  const offer = await prisma.$transaction(async (tx) => {
    if (uniqueServiceIds) {
      await tx.offerService.deleteMany({ where: { offerId: existingOffer.id } });
      await tx.offerService.createMany({
        data: uniqueServiceIds.map((serviceId) => ({
          offerId: existingOffer.id,
          serviceId,
        })),
      });
    }

    return tx.offer.update({
      where: { id: existingOffer.id },
      data: {
        title: data.title ?? existingOffer.title,
        description: data.description === undefined ? existingOffer.description : data.description,
        imageUrl: data.imageUrl === undefined ? existingOffer.imageUrl : data.imageUrl,
        discountType: finalDiscountType,
        discountValue: finalDiscountValue,
        startDate: finalStartDate,
        endDate: finalEndDate,
        isActive: data.isActive ?? existingOffer.isActive,
        usageLimit: data.usageLimit === undefined ? existingOffer.usageLimit : data.usageLimit,
      },
      include: {
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                price: true,
                status: true,
              },
            },
          },
        },
      },
    });
  });

  return mapOfferWithServices(offer);
}

export async function toggleOffer(id, branchAdminUserId) {
  const branchAdmin = await getApprovedBranchAdmin(branchAdminUserId);
  await ensureOffersEnabled(branchAdmin.id);

  const offer = await prisma.offer.findFirst({
    where: {
      id,
      branchId: branchAdmin.id,
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!offer) {
    throw new OfferNotFoundError();
  }

  return prisma.offer.update({
    where: { id: offer.id },
    data: { isActive: !offer.isActive },
    select: {
      id: true,
      isActive: true,
      updatedAt: true,
    },
  });
}

export async function deleteOffer(id, branchAdminUserId) {
  const branchAdmin = await getApprovedBranchAdmin(branchAdminUserId);
  await ensureOffersEnabled(branchAdmin.id);

  const offer = await prisma.offer.findFirst({
    where: {
      id,
      branchId: branchAdmin.id,
    },
    select: {
      id: true,
    },
  });

  if (!offer) {
    throw new OfferNotFoundError();
  }

  await prisma.offer.delete({
    where: { id: offer.id },
  });

  return { id: offer.id };
}

export async function listBranchOffers(branchAdminUserId) {
  const branchAdmin = await getApprovedBranchAdmin(branchAdminUserId);
  await ensureOffersEnabled(branchAdmin.id);

  const offers = await prisma.offer.findMany({
    where: { branchId: branchAdmin.id },
    include: {
      services: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
              price: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return offers.map(mapOfferWithServices);
}

export async function getValidOffersForService(serviceId, now = new Date()) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      status: true,
      branch: {
        select: {
          status: true,
          isSubscriptionActive: true,
        },
      },
    },
  });

  if (
    !service
    || service.status !== ServiceApprovalStatus.APPROVED
    || service.branch.status !== BranchStatus.APPROVED
    || !service.branch.isSubscriptionActive
  ) {
    return [];
  }

  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
      services: {
        some: {
          serviceId,
          service: {
            status: ServiceApprovalStatus.APPROVED,
            branch: {
              status: BranchStatus.APPROVED,
              isSubscriptionActive: true,
            },
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      discountType: true,
      discountValue: true,
      startDate: true,
      endDate: true,
      usageLimit: true,
      usedCount: true,
    },
  });

  return offers.filter(
    (offer) => offer.usageLimit === null || offer.usedCount < offer.usageLimit,
  );
}

export async function calculateBestOfferForService(serviceId, now = new Date()) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      price: true,
      status: true,
      branch: {
        select: {
          status: true,
          isSubscriptionActive: true,
        },
      },
    },
  });

  if (
    !service
    || service.status !== ServiceApprovalStatus.APPROVED
    || service.branch.status !== BranchStatus.APPROVED
    || !service.branch.isSubscriptionActive
  ) {
    throw new OffersValidationError(tr.SERVICE_NOT_FOUND);
  }

  const offers = await getValidOffersForService(serviceId, now);

  const basePrice = service.price;
  if (!offers.length) {
    return {
      serviceId,
      basePrice,
      finalPrice: basePrice,
      savingsAmount: 0,
      appliedOffer: null,
    };
  }

  let bestOffer = null;
  let maxSaving = 0;

  for (const offer of offers) {
    const saving = resolveDiscountAmount(basePrice, offer);
    if (saving > maxSaving) {
      maxSaving = saving;
      bestOffer = offer;
    }
  }

  return {
    serviceId,
    basePrice,
    finalPrice: Number((basePrice - maxSaving).toFixed(2)),
    savingsAmount: Number(maxSaving.toFixed(2)),
    appliedOffer: bestOffer,
  };
}

/**
 * Atomically increment the usedCount for an offer inside a caller-supplied transaction.
 *
 * Uses a single raw SQL UPDATE with all eligibility conditions in the WHERE clause,
 * making this truly race-safe on MySQL READ COMMITTED isolation — no separate read
 * means no window between the check and the write.
 *
 * Throws OfferExpiredOrExhaustedError (409) if affectedRows === 0, meaning the offer
 * has expired, been deactivated, or reached its usage limit since reservation time.
 *
 * @param {number} offerId - ID of the offer to increment.
 * @param {any} tx - Prisma transaction client from the enclosing $transaction block.
 */
export async function safeIncrementOfferUsedCount(offerId, tx) {
  const result = await tx.$executeRaw`
    UPDATE Offer
    SET usedCount = usedCount + 1
    WHERE
      id = ${offerId}
      AND isActive = true
      AND endDate >= NOW()
      AND (usageLimit IS NULL OR usedCount < usageLimit)
  `;

  if (result === 0) {
    throw new OfferExpiredOrExhaustedError();
  }
}
