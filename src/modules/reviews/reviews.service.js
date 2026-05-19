import { AppointmentStatus, Role } from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import {
    listReviewsQuerySchema,
    ReviewsValidationError,
    validateCreateReviewInput,
    validateReviewsInput,
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

export async function listReviews(query, authUser) {
  const data = validateReviewsInput(listReviewsQuerySchema, query);

  const skip = (data.page - 1) * data.limit;
  const scopedWhere = {
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

export async function listMyReviews(query, authUser) {
  const data = validateReviewsInput(listReviewsQuerySchema, query);
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

export async function createReview(body, authUser) {
  if (authUser.role !== Role.client) {
    throw new ReviewsForbiddenError();
  }

  const data = validateCreateReviewInput(body);

  // Find client by user id
  const client = await prisma.client.findUnique({ where: { userId: authUser.sub }, select: { id: true } });
  if (!client) {
    throw new ReviewCreationError(tr.CLIENT_NOT_FOUND || "Client not found");
  }

  // Validate appointment
  const appointment = await prisma.appointment.findUnique({ where: { id: data.appointmentId }, select: { id: true, clientId: true, staffId: true, branchId: true, serviceId: true, status: true } });
  if (!appointment) throw new ReviewCreationError(tr.APPOINTMENT_NOT_FOUND || "Appointment not found");
  if (appointment.clientId !== client.id) throw new ReviewCreationError(tr.APPOINTMENT_ACCESS_DENIED || "Appointment does not belong to client");
  if (appointment.status !== AppointmentStatus.COMPLETED) throw new ReviewCreationError(tr.APPOINTMENT_NOT_COMPLETED || "Appointment not completed");

  // Ensure no existing review for appointment
  const existing = await prisma.review.findUnique({ where: { appointmentId: data.appointmentId }, select: { id: true } });
  if (existing) throw new ReviewCreationError(tr.REVIEW_ALREADY_EXISTS || "Review already exists for this appointment");

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

export async function deleteReview(reviewId, authUser) {
  // Only branch_admin and admin maybe allowed - keep simple: only branch_admin or staff or super_admin can delete
  if (![Role.branch_admin, Role.staff, Role.super_admin].includes(authUser.role)) {
    throw new ReviewsForbiddenError();
  }

  const existing = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, rating: true, staffId: true, branchId: true } });
  if (!existing) throw new AppError(tr.REVIEW_NOT_FOUND || "Review not found", 404);

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: reviewId } });
    await updateStaffAggregate(tx, existing.staffId, existing.rating, -1);
    await updateBranchAggregate(tx, existing.branchId, existing.rating, -1);
  });

  return { message: tr.REVIEW_DELETED_SUCCESSFULLY };
}
