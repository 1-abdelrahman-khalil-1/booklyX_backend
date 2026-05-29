import { AppointmentStatus, Role } from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import {
    ReviewsValidationError,
} from "./reviews.validation.js";

export { ReviewsValidationError };

export class ReviewsForbiddenError extends AppError {
  constructor() {
    super(tr.FORBIDDEN, 403);
    this.name = "ReviewsForbiddenError";
  }
}

function buildReviewsSelect() {
  return {
    id: true,
    appointmentId: true,
    appointment: { select: { id: true } },
    rating: true,
    comment: true,
    createdAt: true,
    reviewer: {
      select: {
        id: true,
        name: true,
        role: true,
      },
    },
    service: {
      select: {
        id: true,
        name: true,
      },
    },
    staff: {
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },

  };
}

export async function listReviews(data, authUser) {
  const skip = (data.page - 1) * data.limit;
  const scopedWhere = {
    [Role.client]: {},
    [Role.staff]: {
      staff: {
        userId: authUser.sub,
      },
    },
    [Role.branch_admin]: {
      service: {
        branch: {
          userId: authUser.sub,
        },
      },
    },
    [Role.super_admin]: {},
  };

  if (!(authUser.role in scopedWhere)) {
    throw new ReviewsForbiddenError();
  }

  const where = {
    ...scopedWhere[authUser.role],
    ...(data.serviceId ? { serviceId: data.serviceId } : {}),
    ...(data.staffId ? { staffId: data.staffId } : {}),
    ...(data.branchId ? { branchId: data.branchId } : {}),
  };

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      skip,
      take: data.limit,
      orderBy: { createdAt: "desc" },
      select: buildReviewsSelect(),
    }),
    prisma.review.count({ where }),
  ]);
  const formattedReviews = reviews.map((review) => ({
    ...review,
    appointment_Id: review.appointmentId,
  }));
  return {
    message: tr.REVIEWS_FETCHED_SUCCESSFULLY,
    reviews: formattedReviews,
    pagination: {
      page: data.page,
      limit: data.limit,
      total,
      totalPages: Math.ceil(total / data.limit),
    },
  };
}

export async function listMyReviews(data, authUser) {
  const skip = (data.page - 1) * data.limit;

  const where = {
    reviewerId: authUser.sub,
    ...(data.serviceId ? { serviceId: data.serviceId } : {}),
    ...(data.staffId ? { staffId: data.staffId } : {}),
  };

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      skip,
      take: data.limit,
      orderBy: { createdAt: "desc" },
      select: buildReviewsSelect(),
    }),
    prisma.review.count({ where }),
  ]);

  return {
    message: tr.MY_REVIEWS_FETCHED_SUCCESSFULLY,
    reviews,
    pagination: {
      page: data.page,
      limit: data.limit,
      total,
      totalPages: Math.ceil(total / data.limit),
    },
  };
}

class ReviewCreationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = "ReviewCreationError";
  }
}

async function updateStaffAggregate(tx, staffId, rating, increment = 1) {
  const staff = await tx.staff.findUnique({ where: { id: staffId }, select: { averageRating: true, reviewCount: true } });
  const oldCount = staff.reviewCount || 0;
  const oldAvg = Number(staff.averageRating || 0);
  const newCount = oldCount + increment;
  const newAvg = newCount <= 0 ? 0 : (oldAvg * oldCount + rating * increment) / newCount;
  await tx.staff.update({ where: { id: staffId }, data: { averageRating: newAvg, reviewCount: newCount } });
}

async function updateBranchAggregate(tx, branchId, rating, increment = 1) {
  const branch = await tx.branchAdmin.findUnique({ where: { id: branchId }, select: { averageRating: true, reviewCount: true } });
  const oldCount = branch.reviewCount || 0;
  const oldAvg = Number(branch.averageRating || 0);
  const newCount = oldCount + increment;
  const newAvg = newCount <= 0 ? 0 : (oldAvg * oldCount + rating * increment) / newCount;
  await tx.branchAdmin.update({ where: { id: branchId }, data: { averageRating: newAvg, reviewCount: newCount } });
}

export async function createReview(data, authUser) {
  if (authUser.role !== Role.client) {
    throw new ReviewsForbiddenError();
  }

  // Find client by user id
  const client = await prisma.client.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
  if (!client) {
    throw new ReviewCreationError(tr.CLIENT_NOT_FOUND);
  }

  // Validate appointment
  const appointment = await prisma.appointment.findUnique({ where: { id: data.appointmentId }, select: { id: true, clientId: true, staffId: true, branchId: true, serviceId: true, status: true } });
  if (!appointment) throw new ReviewCreationError(tr.APPOINTMENT_NOT_FOUND);
  if (appointment.clientId !== client.id) throw new ReviewCreationError(tr.APPOINTMENT_ACCESS_DENIED);
  if (appointment.status !== AppointmentStatus.COMPLETED) throw new ReviewCreationError(tr.APPOINTMENT_NOT_COMPLETED);

  // Ensure no existing review for appointment
  const existing = await prisma.review.findUnique({ where: { appointmentId: data.appointmentId }, select: { id: true } });
  if (existing) throw new ReviewCreationError(tr.REVIEW_ALREADY_EXISTS);

  // Create review and update aggregates in transaction
  const created = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        appointmentId: data.appointmentId,
        rating: data.rating,
        comment: data.comment,
        reviewerId: authUser.sub,
        reviewerRole: authUser.role,
        clientId: client.id,
        serviceId: appointment.serviceId,
        branchId: appointment.branchId,
        staffId: appointment.staffId,
      },
      select: buildReviewsSelect(),
    });

    // update aggregates
    await updateStaffAggregate(tx, appointment.staffId, data.rating, 1);
    await updateBranchAggregate(tx, appointment.branchId, data.rating, 1);

    return review;
  });

  return { message: tr.REVIEW_CREATED_SUCCESSFULLY, review: created };
}
