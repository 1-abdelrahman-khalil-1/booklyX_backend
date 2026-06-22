import {
    BranchStatus,
    OfferDiscountType,
    ServiceApprovalStatus,
} from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import prisma from "../../../lib/prisma.js";
import { ensureOffersEnabled } from "../../../utils/subscriptionGuards.js";
import {
  OffersValidationError,
  OfferNotFoundError,
  BranchAdminNotFoundError,
} from "../errors.js";
// Validation is now handled in offers.controller.js

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
