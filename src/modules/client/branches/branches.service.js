import { BranchStatus, ServiceApprovalStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { mapBranchPublicProfile } from "../../../lib/mappers/profile.mapper.js";
import { BranchNotFoundError } from "../errors.js";

export async function getBranchProfile(branchId) {
  const branch = await prisma.branchAdmin.findUnique({
    where: { id: branchId },
    include: {
      plan: true,
      branchAvailabilities: true,
    },
  });

  if (!branch || branch.status !== BranchStatus.APPROVED || !branch.isSubscriptionActive) {
    throw new BranchNotFoundError();
  }

  // Get recent 10 reviews
  const reviews = await prisma.review.findMany({
    where: { branchId },
    include: {
      client: {
        include: {
          user: {
            select: { name: true, phone: true },
          },
        },
      },
      service: { select: { id: true, name: true } },
      staff: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  return mapBranchPublicProfile(branch, reviews);
}

export async function getBranchServices(branchId) {
  const branch = await prisma.branchAdmin.findUnique({
    where: { id: branchId },
    select: { id: true, status: true, isSubscriptionActive: true },
  });

  if (!branch || branch.status !== BranchStatus.APPROVED || !branch.isSubscriptionActive) {
    throw new BranchNotFoundError();
  }

  const services = await prisma.service.findMany({
    where: {
      branchId,
      status: ServiceApprovalStatus.APPROVED,
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      durationMinutes: true,
      imageUrl: true,
      serviceCategoryId: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  // ── Lightweight offer preview ───────────────────────────────────────────────
  // One extra query for the whole branch (not per service — no N+1).
  // We fetch all active, in-date offer links, filter exhausted ones in JS
  // (Prisma cannot compare two columns in a WHERE clause), then attach the
  // first valid offer found to each service card for badge display.
  const now = new Date();
  const offerLinks = await prisma.offerService.findMany({
    where: {
      service: { branchId, status: ServiceApprovalStatus.APPROVED },
      offer: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    },
    select: {
      serviceId: true,
      offer: {
        select: {
          discountType: true,
          discountValue: true,
          usageLimit: true,
          usedCount: true,
        },
      },
    },
  });

  // Filter out offers that have hit their usage cap
  const validOfferLinks = offerLinks.filter(
    (link) => link.offer.usageLimit === null || link.offer.usedCount < link.offer.usageLimit,
  );

  // Build a map: serviceId → first valid offer found (no ranking needed for card preview)
  const offerByService = new Map();
  for (const link of validOfferLinks) {
    if (!offerByService.has(link.serviceId)) {
      offerByService.set(link.serviceId, {
        discountType: link.offer.discountType,
        discountValue: link.offer.discountValue,
      });
    }
  }
  // ───────────────────────────────────────────────────────────────────────────

  return services.map((s) => ({
    ...s,
    hasOffer: offerByService.has(s.id),
    offer: offerByService.get(s.id) ?? null,
  }));
}
