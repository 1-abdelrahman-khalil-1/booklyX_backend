import dayjs from "dayjs";
import { prisma } from "../helpers/prisma.js";
import { REVIEW_COMMENTS } from "../config/constants.js";
import { getExecutionAttachment } from "../helpers/random.js";
import { validateReviewSeed } from "../factories/review.factory.js";

async function refreshStaffRating(staffId) {
  const aggregate = await prisma.review.aggregate({
    where: { staffId, isVisible: true },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.staff.update({
    where: { id: staffId },
    data: {
      averageRating: Number((aggregate._avg.rating ?? 0).toFixed(2)),
      reviewCount: aggregate._count.rating,
    },
  });
}

async function refreshBranchRating(branchId) {
  const aggregate = await prisma.review.aggregate({
    where: { branchId, isVisible: true },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.branchAdmin.update({
    where: { id: branchId },
    data: {
      averageRating: Number((aggregate._avg.rating ?? 0).toFixed(2)),
      reviewCount: aggregate._count.rating,
    },
  });
}

export async function seedReviews(reviewTargets) {
  for (const [index, target] of reviewTargets.entries()) {
    const rating = (index % 5) + 1;
    const comment = REVIEW_COMMENTS[index % REVIEW_COMMENTS.length];

    const reviewSeed = validateReviewSeed({
      clientId: target.clientId,
      reviewerId: target.reviewerId,
      serviceId: target.serviceId,
      branchId: target.branchId,
      staffId: target.staffId,
      appointmentId: target.appointmentId,
      rating,
      comment,
      reviewerRole: target.reviewerRole,
      isVisible: index % 2 === 0,
      createdAt: dayjs(target.scheduledAt).add(1, "hour").toDate(),
    });

    await prisma.review.create({
      data: reviewSeed,
    });

    const branch = await prisma.branchAdmin.findUnique({
      where: { id: target.branchId },
      select: { category: true },
    });

    if (branch) {
      await prisma.serviceExecution.create({
        data: {
          appointmentId: target.appointmentId,
          notes: `Seeded completion notes for ${target.clientEmail}.`,
          attachments: [
            {
              fileName: `execution-${target.appointmentId}.jpg`,
              url: getExecutionAttachment(branch.category, index % 2),
            },
          ],
        },
      });
    }
  }

  const uniqueStaff = Array.from(
    new Set(reviewTargets.map((target) => target.staffId)),
  );

  for (const staffId of uniqueStaff) {
    await refreshStaffRating(staffId);
  }

  const uniqueBranches = Array.from(
    new Set(reviewTargets.map((target) => target.branchId)),
  );

  for (const branchId of uniqueBranches) {
    await refreshBranchRating(branchId);
  }
}
