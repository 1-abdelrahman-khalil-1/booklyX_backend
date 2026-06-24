import dayjs from "dayjs";
import { REVIEW_COMMENTS } from "../config/constants.js";
import { validateReviewSeed } from "../factories/review.factory.js";
import { prisma } from "../helpers/prisma.js";
import { getExecutionAttachment } from "../helpers/random.js";

async function refreshStaffRating(staffId) {
  const aggregate = await prisma.review.aggregate({
    where: { staffId },
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
    where: { branchId },
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
    // Keep seeded ratings in the positive range while varying per run.
    const rating = Math.floor(Math.random() * 3) + 3;
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
