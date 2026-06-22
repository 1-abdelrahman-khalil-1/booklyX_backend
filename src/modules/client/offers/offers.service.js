import prisma from "../../../lib/prisma.js";
import { getClientByUserId } from "../helpers.js";
import {
  OfferDiscountType,
  ServiceApprovalStatus,
  BranchStatus,
} from "../../../generated/prisma/client.js";
import {
  OfferAlreadyClaimedError,
  OfferNotFoundError,
  OfferNotAvailableError,
  OfferExpiredOrExhaustedError,
  ServiceNotFoundError,
} from "../errors.js";

/**
 * Return the currently valid offers for a service, shaped for client UI consumption.
 * Re-uses the shared eligibility logic from the branch_admin offers service so
 * validity rules (isActive, date window, usageLimit) stay in one place.
 *
 * @param {number} serviceId
 * @returns {Promise<Array<{ id, title, discountType, discountValue, endDate }>>}
 */
export async function getServiceOffers(serviceId) {
  const offers = await getValidOffersForService(serviceId);

  return offers.map((o) => ({
    id: o.id,
    title: o.title,
    description: o.description,
    imageUrl: o.imageUrl,
    discountType: o.discountType,
    discountValue: o.discountValue,
    startDate: o.startDate,
    endDate: o.endDate,
    usageLimit: o.usageLimit,
    usedCount: o.usedCount,
  }));
}

export async function claimOffer(userId, offerId) {
  const client = await getClientByUserId(userId);

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      isActive: true,
      startDate: true,
      endDate: true,
      usageLimit: true,
      usedCount: true,
    },
  });

  if (!offer) {
    throw new OfferNotFoundError();
  }

  const now = new Date();
  if (!offer.isActive || offer.startDate > now || offer.endDate < now) {
    throw new OfferNotAvailableError();
  }

  if (offer.usageLimit !== null && offer.usedCount >= offer.usageLimit) {
    throw new OfferExpiredOrExhaustedError();
  }

  const existingClaim = await prisma.claimedOffer.findUnique({
    where: {
      clientId_offerId: {
        clientId: client.id,
        offerId,
      },
    },
  });

  if (existingClaim) {
    throw new OfferAlreadyClaimedError();
  }

  const claimed = await prisma.claimedOffer.create({
    data: {
      clientId: client.id,
      offerId,
    },
    include: {
      offer: true,
    },
  });

  return {
    id: claimed.id,
    clientId: claimed.clientId,
    offerId: claimed.offerId,
    isUsed: claimed.isUsed,
    claimedAt: claimed.claimedAt,
    usedAt: claimed.usedAt,
    offer: {
      id: claimed.offer.id,
      title: claimed.offer.title,
      description: claimed.offer.description,
      imageUrl: claimed.offer.imageUrl,
      discountType: claimed.offer.discountType,
      discountValue: claimed.offer.discountValue,
      startDate: claimed.offer.startDate,
      endDate: claimed.offer.endDate,
    },
  };
}

export async function getClaimedOffers(userId, query = {}) {
  const client = await getClientByUserId(userId);
  const { status } = query;

  const where = { clientId: client.id };
  const now = new Date();

  if (status === "unused") {
    where.isUsed = false;
    where.offer = {
      isActive: true,
      endDate: { gte: now },
    };
  } else if (status === "used") {
    where.isUsed = true;
  } else if (status === "expired") {
    where.isUsed = false;
    where.offer = {
      OR: [
        { isActive: false },
        { endDate: { lt: now } },
      ],
    };
  }

  const claimedOffers = await prisma.claimedOffer.findMany({
    where,
    include: {
      offer: {
        include: {
          branch: {
            select: {
              id: true,
              businessName: true,
              logoUrl: true,
            },
          },
        },
      },
    },
    orderBy: { claimedAt: "desc" },
  });

  return claimedOffers.map((co) => ({
    id: co.id,
    isUsed: co.isUsed,
    claimedAt: co.claimedAt,
    usedAt: co.usedAt,
    offer: {
      id: co.offer.id,
      title: co.offer.title,
      description: co.offer.description,
      imageUrl: co.offer.imageUrl,
      discountType: co.offer.discountType,
      discountValue: co.offer.discountValue,
      startDate: co.offer.startDate,
      endDate: co.offer.endDate,
      branch: co.offer.branch,
    },
  }));
}

export function resolveDiscountAmount(basePrice, offer) {
  if (offer.discountType === OfferDiscountType.PERCENTAGE) {
    return Math.min(basePrice, basePrice * (offer.discountValue / 100));
  }

  return Math.min(basePrice, offer.discountValue);
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
      description: true,
      imageUrl: true,
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
    throw new ServiceNotFoundError();
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
